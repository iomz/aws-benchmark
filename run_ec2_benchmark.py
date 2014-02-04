#!/usr/bin/python
# -*- coding: utf-8 -*-
from boto.dynamodb2.fields import HashKey, RangeKey
from boto.dynamodb2.table import Table
from boto.ec2.blockdevicemapping import BlockDeviceType, BlockDeviceMapping
from boto.exception import JSONResponseError
from pprint import pprint
from time import sleep
import base64
import boto.ec2
import json
import sys

# Number of trial
trial = 2

# Amazon Linux AMI 2013.09.2 [us-east-1]
paravirtual_ami = 'ami-83e4bcea'
# Amazon Linux AMI (HVM) 2013.09.2 [us-east-1]
hvm_ami = 'ami-d1bfe4b8'

# Confirm ~/.boto exists and contains credentials
region = 'us-east-1'
#k_name = 'iomz@cisco-macbook'
k_name = 'kougaikw@dhcp-171-68-21-209.cisco.com'
s_grp = 'quick-start-1'

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
        return None
    print "{0}({1}) launched at: {2}".format(instance, i.id, i.launch_time)
    sleep(5) # Wait before tagging
    conn.create_tags([i.id], {"Name": instance})
    return instance

def main():
    n_arg = len(sys.argv)
    if 1 < n_arg:
        if sys.argv[1] == 'unixbench':
            u_data_model = 'unixbench/unixbench_ec2_userscript_model.dat'
        elif sys.argv[1] == 'x264':
            u_data_model = 'x264/x264_userscript_model.dat'
    else:
        print "usage: %s [unixbench|x264]" % sys.argv[0]
        sys.exit(0)

    # Block device storage size
    if n_arg == 3:
        dev_sda1 = BlockDeviceType()
        dev_sda1.size = int(sys.argv[2])
        bdm = BlockDeviceMapping()
        bdm['/dev/sda1'] = dev_sda1
    else:
        bdm = None

    # Lists of instance types to be benchmarked and already completed
    instances = []
    completed = []
    
    try:
        instances_dict = json.load(open("web/data/instances.json", "r"))
    except IOError:
        print "*** web/data/instances.json not found! Try ./update_instances.py ***"
        sys.exit(1)

    for k, v in instances_dict.iteritems():
        if v['cloud'] == 'EC2':
            if u_data_model == 'unixbench/unixbench_userscript_model.dat':
                try:
                    instance_logs = Table(k)
                    instance_logs.describe()
                    completed.append(k)
                except JSONResponseError:
                    instances.append(k)
            elif u_data_model == 'x264/x264_userscript_model.dat':
                instances.append(k)
            else:
                print 'Nothing to do'
                sys.exit(0)

    # Start all the benchmark at once will most likely exceeds the quota limit per user
    # Better to execute the benchmark on a category to category basis
    conn = boto.ec2.connect_to_region(region)
    
    #instances = []
    #completed = ['t1.micro_paravirtual']
    num_instances = len(instances)
    while 0 < len(instances):
        for i in instances:
            print '%s is waiting for launch' % i
        for i in completed:
            if i in instances:
                instances.remove(i)
        for i in instances:
            # Generate an user-script per instance
            userscript = ''
            if u_data_model == 'unixbench/unixbench_userscript_model.dat':
                userscript = "#!/bin/sh\nTRIAL=%d\nINSTANCE_NAME=%s\n"%(trial,i) + open(u_data_model,'r').read()
            elif u_data_model == 'x264/x264_userscript_model.dat':
                userscript = "#!/bin/sh\nTRIAL=%d\necho %s > /var/local/instance_name\n"%(trial,i) + open(u_data_model,'r').read()
            u_data = base64.b64encode(userscript)
            res = start_benchmark_instance(conn, i, u_data, bdm)
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
