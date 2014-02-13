#!/usr/bin/python
# -*- coding: utf-8 -*-
from boto.dynamodb2.fields import HashKey, RangeKey
from boto.dynamodb2.table import Table
from boto.ec2.blockdevicemapping import BlockDeviceType, BlockDeviceMapping
from boto.exception import JSONResponseError
from datetime import datetime
from pprint import pprint
from time import sleep
import base64
import boto.ec2
import json
import sys

# Amazon Linux AMI 2013.09.2 [us-east-1]
paravirtual_ami = 'ami-83e4bcea'
# Amazon Linux AMI (HVM) 2013.09.2 [us-east-1]
hvm_ami = 'ami-d1bfe4b8'

# Confirm ~/.boto exists and contains credentials
region = 'us-east-1'
k_name = 'iomz@cisco-macbook'
s_grp = 'default'

# Iperf server info
iperfs = {
    'i-39ceba17' : 'us-east-1',
    'i-3250c43a' : 'us-west-2'
}

def start_benchmark_instance(conn, instance, u_data, bdm):
    if 'paravirtual' in instance:
        ami = paravirtual_ami
    else:
        ami = hvm_ami
    if 'ebs' in instance:
        ebs = True
    else:
        ebs = False
    size = instance.split('_')[0]

    try:
        i = conn.run_instances(
            ami,
            instance_type=size,
            key_name=k_name,
            max_count=1,
            security_groups=[s_grp],
            user_data=u_data,
            ebs_optimized=ebs,
            block_device_map=bdm
            ).instances[0]
    except:
        print "%s launch failed" % (instance)
        return None, None
    print "{0}({1}) launched at: {2}".format(instance, i.id, i.launch_time)
    sleep(5) # Wait before tagging
    conn.create_tags([i.id], {"Name": instance})
    return instance, i.id

def wait_until_next(step, minute):
    t = datetime.today()
    if minute > t.minute:
        if t.hour == 23:
            if step == 0:
                day = t.day
                hour = 23
            elif step == 1:
                day = t.day + 1
                hour = 0
        elif t.hour != 23:
            day = t.day
            if step == 0:
                hour = t.hour
            elif step == 1:
                hour = t.hour + 1
    else:
        if t.hour == 23:
            day = t.day + 1
            hour = 0
        elif t.hour != 23:
            day = t.day
            hour = t.hour + 1
    f = datetime(t.year,t.month,day,hour,minute,0)
    sys.stdout.write('*** Waiting until ')
    print f
    sleep((f-t).seconds)

def main():
    n_arg = len(sys.argv)
    if 1 < n_arg:
        option = sys.argv[1]
        if option == 'unixbench':
            u_data_model = 'unixbench/unixbench_ec2_userscript_model.dat'
            trial = int(sys.argv[2])
        elif option == 'x264':
            u_data_model = 'x264/x264_userscript_model.dat'
            trial = int(sys.argv[2])
        elif option == 'iperf':
            u_data_model = 'iperf/iperf_userscript_model.dat'
            minute = int(sys.argv[2])
        else:
            print "unrecognized option: %s" % option
            print "usage: %s [unixbench|x264] [trial]" % sys.argv[0]
            print "usage: %s [iperf] [iperf-server] [minute]" % sys.argv[0]
            sys.exit(1)
    else:
        print "usage: %s [unixbench|x264] [trial]" % sys.argv[0]
        print "usage: %s [iperf] [iperf-server] [minute]" % sys.argv[0]
        sys.exit(1)

    '''
    # Block device storage size
    if n_arg == 3:
        dev_sda1 = BlockDeviceType()
        dev_sda1.size = int(sys.argv[2])
        bdm = BlockDeviceMapping()
        bdm['/dev/sda1'] = dev_sda1
    else:
        bdm = None
    '''
    bdm = None

    # Lists of instance types to be benchmarked and already completed
    instances = []
    completed = []
    
    try:
        instances_dict = json.load(open("web/data/instances.json", "r"))
    except IOError:
        print "*** web/data/instances.json not found! Try ./update_instances.py ***"
        sys.exit(1)

    # For EC2 unixbench, ignore the instance with results already created
    for k, v in instances_dict.iteritems():
        if v['cloud'] == 'EC2':
            if option == 'unixbench':
                try:
                    instance_logs = Table(k)
                    instance_logs.describe()
                    completed.append(k)
                except JSONResponseError:
                    instances.append(k)
            elif option == 'x264' or option == 'iperf':
                instances.append(k)
            else:
                print 'Nothing to do'
                sys.exit(0)

    # Start all the benchmark at once will most likely exceeds the quota limit per user
    # Better to execute the benchmark on a category to category basis
    conn = boto.ec2.connect_to_region(region)
    
    # For manual list of instances, modify here
    instances = ['c3.large_hvm','c3.2xlarge_hvm','c3.8xlarge_hvm','c3.8xlarge_paravirtual','cc2.8xlarge_hvm']
    #completed = ['t1.micro_paravirtual']
    num_instances = len(instances)
    if option == 'iperf':
        wait_until_next(0, minute)
        while True:
            runnings = []
            iperf_servers = 'declare -a arr=('
            # Start Iperf servers here
            for sid, sregion in iperfs.iteritems():
                co = boto.ec2.connect_to_region(sregion)
                co.start_instances(sid)
                print '+Stating instance %s...'%sid
                while co.get_only_instances(sid)[0].state_code != 16: # 16 (running)
                    sleep(3)
                iperf_servers += "\"" + co.get_only_instances(sid)[0].public_dns_name + "\" "
            iperf_servers += ")\n"

            for i in instances:
                userscript = "#!/bin/sh\nINSTANCE_NAME=%s\n"%(i) + iperf_servers + open(u_data_model,'r').read()
                u_data = base64.b64encode(userscript)
                res, i_id = start_benchmark_instance(conn, i, u_data, bdm)
                if res is not None:
                    runnings.append(i_id)
                # Sleep 6 mins to give interval between instances
                sleep(60*6)
            print '*** Waiting for the instances to complete iperf...'
            while conn.get_only_instances(i_id)[0].state_code != 80: # 80 (stopped)
                sleep(30)
            conn.terminate_instances(runnings)
            for i in runnings:
                print "-Instances %s terminated" % i
            # Stop Iperf servers here
            for sid, sregion in iperfs.iteritems():
                co = boto.ec2.connect_to_region(sregion)
                co.stop_instances(sid)
                print '-Stopping instance %s...'%sid
                while co.get_only_instances(sid)[0].state_code != 80: # 80 (stopped)
                    sleep(3)
            # Wait until next hour
            wait_until_next(1, minute)
    else:
        while 0 < len(instances):
            for i in instances:
                print '%s is waiting for launch' % i
            for i in completed:
                if i in instances:
                    instances.remove(i)
            for i in instances:
                # Generate an user-script per instance
                userscript = ''
                if option == 'unixbench':
                    userscript = "#!/bin/sh\nTRIAL=%d\nINSTANCE_NAME=%s\n"%(trial,i) + open(u_data_model,'r').read()
                elif option == 'x264':
                    userscript = "#!/bin/sh\nTRIAL=%d\necho %s > /var/local/instance_name\n"%(trial,i) + open(u_data_model,'r').read()
                u_data = base64.b64encode(userscript)
                res, i_id = start_benchmark_instance(conn, i, u_data, bdm)
                if res is not None and not res in completed:
                    completed.append(res)
                sleep(5)
            if len(completed) == num_instances:
                break
            else:
                print '*** Cooling down...'
                # 30 mins interval
                sleep(60*30)

if __name__ == "__main__":
    main()
