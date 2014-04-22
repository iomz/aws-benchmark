#!/usr/bin/python
# -*- coding: utf-8 -*-
from boto.dynamodb2.fields import HashKey, RangeKey
from boto.dynamodb2.table import Table
from boto.dynamodb2.exceptions import ConditionalCheckFailedException
from boto.exception import JSONResponseError
from collections import OrderedDict
from datetime import datetime
from HTMLParser import HTMLParser
from math import sqrt
from os import mkdir, path
from pprint import pprint
from time import sleep
import json
import operator
import pytz
import re
import simplejson as js
import sys
import urllib

Specs = [
    "type",
    "family",
    "cloud",
    "virt",
    "ebs",
    "vcpu",
    "memory",
    "price",
    "storage",
    "ecu",
    "network",
    "size",
    "memoryRange",
    "priceRange"
]

SpecNames = [
    "Instance Type",
    "Instance Family",
    "Cloud",
    "Virtualization Type",
    "EBS-optimized",
    "vCPU",
    "Memory (GiB)",
    "Price ($/Hr)",
    "Instance Storage (GB)",
    "ECU",
    "Network Performance",
    "Instance Size",
    "Memory Group",
    "Price Group"
]

Tests = [
    "dhrystone",
    "double",
    "execl",
    "file1024",
    "file256",
    "file4096",
    "pipethru",
    "pipecs",
    "process",
    "shell1",
    "shell8",
    "overhead",
    "index",
    "x264"
]

TestNames = [
    "Dhrystone 2 using register variables",  # dhrystone
    "Double-Precision Whetstone",            # double
    "Execl Throughput",                      # execl
    "File Copy 1024 bufsize 2000 maxblocks", # file1024
    "File Copy 256 bufsize 500 maxblocks",   # file256
    "File Copy 4096 bufsize 8000 maxblocks", # file4096
    "Pipe Throughput",                       # pipethru
    "Pipe-based Context Switching",          # pipecs
    "Process Creation",                      # process
    "Shell Scripts (1 concurrent)",          # shell1
    "Shell Scripts (8 concurrent)",          # shell8
    "System Call Overhead",                  # overhead
    "System Benchmarks Index Score"          # index
]

TRIAL = 5

# Retrieve instance types' detail
class InstanceParser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.in_td = False
        self.in_tr = False
        self.in_b = False
        self.in_span = False
        self.info = False
        self.tmp = ''
        self.ins = []
        self.arr = []

    def handle_starttag(self, tag, attrs):
        if tag == 'td':
            self.in_td = True
            self.tmp = ''
        elif tag == 'tr':
            self.in_tr = True
            self.info = True
            self.ins = []
        elif tag == 'b':
            self.in_b = True
        elif tag == 'span':
            self.in_span = True

    def handle_data(self, data):
        if self.in_tr and self.in_td and self.in_b and 0 < len(data.strip()) and self.info and not self.in_span:
            self.tmp += ' ' + data.strip()

    def handle_endtag(self, tag):
        if tag == 'td':
            self.in_span = False
            self.ins.append(self.tmp.strip())
        elif tag == 'tr':
            self.in_tr = False
            self.info = False
            if 0 < len(self.ins):
                self.arr.append(self.ins)
            self.ins = []
        elif tag == 'b':
            self.in_b == False
        elif tag == 'span':
            self.in_span = False
        elif tag == 'table':
            self.reset()

# Retrieve instance virtualization type information
class VirtTypeParser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.in_table = False
        self.in_strong = False
        self.in_td = False
        self.in_tr = False
        self.in_b = False
        self.in_span = False
        self.tmp = ''
        self.v_names = []
        self.v_types = {}
        self.i_type = ''
        self.i_index = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.in_table = True
        elif tag == 'strong':
            self.in_strong = True
            self.tmp = ''
        elif tag == 'td':
            self.in_td = True
        elif tag == 'tr':
            self.in_tr = True
            self.i_index = 0
            self.i_type = ''
        elif tag == 'b':
            self.in_b = True
        elif tag == 'span':
            self.in_span = True

    def handle_data(self, data):
        if self.in_table and self.in_tr and self.in_td and self.in_strong:
            self.tmp += data.strip()
        elif self.in_table and self.in_tr and self.in_td and self.i_type == '' and not self.in_strong:
            self.i_type = data.strip()
            if 0 < len(self.i_type):
                self.v_types[self.i_type] = []
        elif self.in_table and self.in_tr and self.in_td and not self.in_strong:
            if data.strip() == "check":
                v_type = self.check_virt_type(self.i_index)
                if v_type is not None and not v_type in self.v_types[self.i_type]:
                    self.v_types[self.i_type].append(v_type)

    def handle_endtag(self, tag):
        if tag == 'td':
            self.i_index += 1
            self.in_span = False
        elif tag == 'strong':
            self.in_strong = False
            if 0 < len(self.tmp):
                self.v_names.append(self.tmp)
        elif tag == 'tr':
            self.in_tr = False
        elif tag == 'b':
            self.in_b == False
        elif tag == 'span':
            self.in_span = False
        elif tag == 'table':
            self.reset()

    def check_virt_type(self, index):
        v_name = self.v_names[index]
        if 'PV' in v_name and 'EBS' in v_name and '64' in v_name:
            return 'paravirtual'
        elif 'HVM' in v_name and 'EBS' in v_name and '64' in v_name:
            return 'hvm'
        return None

    def get_virt_types(self, i_type):
        try:
            virt_types = self.v_types[i_type]
        # Some types not in the list of recommended virtualization type for Amazon Linux
        except KeyError:
            #if i_type in [m3.medium, m3.large]:
            #    virt_types = ['paravirtual','hvm'] # The two are available in both paravirtual and hvm
            virt_types = None
        return virt_types

# Memory Range
def get_memory_range(memory):
    if 0 < memory < 2:
        memoryRange = '<2 GiB'
    elif 4 <= memory < 8:
        memoryRange = '4-8 GiB'
    elif 8 <= memory < 15:
        memoryRange = '8-15 GiB'
    elif 15 <= memory < 30:
        memoryRange = '15-30 GiB'
    elif 30 <= memory < 60:
        memoryRange = '30-60 GiB'
    elif 60 <= memory < 90:
        memoryRange = '60-90 GiB'
    elif 90 <= memory < 120:
        memoryRange = '90-120 GiB'
    elif 120 <= memory < 150:
        memoryRange = '120-150 GiB'
    elif 150 <= memory < 200:
        memoryRange = '150-200 GiB'
    elif 200 <= memory < 250:
        memoryRange = '200-250 GiB'
    else:
        memoryRange = '250 GiB<'

    return memoryRange

# Price Range
def get_price_range(price):
    if 0 < price < 0.1:
        priceRange = '<$0.1'
    elif 0.1 <= price < 0.2 :
        priceRange = '$0.1-0.2'
    elif 0.2 <= price < 0.3 :
        priceRange = '$0.2-0.3'
    elif 0.3 <= price < 0.4 :
        priceRange = '$0.3-0.4'
    elif 0.4 <= price < 0.5 :
        priceRange = '$0.4-0.5'
    elif 0.5 <= price < 0.75 :
        priceRange = '$0.5-0.75'
    elif 0.75 <= price < 1 :
        priceRange = '$0.75-1'
    elif 1 <= price < 2:
        priceRange = '$1-2'
    elif 2 <= price < 3:
        priceRange = '$2-3'
    elif 3 <= price < 4:
        priceRange = '$3-4'
    elif 4 <= price < 5:
        priceRange = '$4-5'
    else:
        priceRange = '$5<'

    return priceRange

def update_instance_list(cloud):
    instance_dict = {}
    if cloud == 'all' or cloud == 'ec2':
        # Parse us-east linux instance prices for each gens
        sys.stdout.write("*** Retrieving base price information for on-demand linux instances...")
        linux_od = "http://aws.amazon.com/ec2/pricing/json/linux-od.json"
        base_prices = {}
        price_dict = json.load(urllib.urlopen(linux_od))['config']['regions'][0]['instanceTypes']
        for gen in price_dict:
            for size in gen['sizes']:
                base_prices[size['size']] = size['valueColumns'][0]['prices']['USD']
        print "\tDone"
                
        # Parse us-east linux ebs prices for each gens
        sys.stdout.write("*** Retrieving EBS optimization price information...")
        pricing_ebs = "http://aws.amazon.com/ec2/pricing/pricing-ebs-optimized-instances.json"
        ebs_prices = {}
        ebs_dict = json.load(urllib.urlopen(pricing_ebs))['config']['regions'][0]['instanceTypes']
        for gen in ebs_dict:
            for size in gen['sizes']:
                ebs_prices[size['size']] = size['valueColumns'][0]['prices']['USD']
        print "\tDone"

        # Retrieve instance type information
        sys.stdout.write("*** Retrieving EC2 instance detail information...")
        types = "http://aws.amazon.com/ec2/instance-types/"
        parser = InstanceParser()
        try:
            parser.feed(urllib.urlopen(types).read())
        except AssertionError:
            pass
        instance_types = parser.arr
        # Remove the table header
        header = instance_types.pop(0)
        print "\tDone"
        
        # Retrieve virtualization type information
        sys.stdout.write("*** Retrieving instance virtualization type availability for Amazon Linux AMI...")
        types = "http://aws.amazon.com/amazon-linux-ami/instance-type-matrix/"
        vtp = VirtTypeParser()
        try:
            # Replacing 'check' necessary to detect the special character
            vtp.feed(urllib.urlopen(types).read().replace("&#x2713;", 'check'))
        except AssertionError:
            pass
        print "\tDone"

        # Iterate all the instance combinations
        for i in instance_types:
            virt_types = vtp.get_virt_types(i[1])
            # Check if the instance is available in the lists
            if virt_types is None or i[1] not in base_prices or (i[7] =='Yes' and i[1] not in ebs_prices):
                print '- %s not updated' % i[1]
                continue
            for vt in virt_types:
                ec2_prices = {}
                if i[7] == 'Yes':
                    ec2_prices[i[1] + '_' + vt] = base_prices[i[1]]
                    ec2_prices[i[1] + '_' + vt + '_ebsOptimized'] = "%.3f" % (float(base_prices[i[1]]) + float(ebs_prices[i[1]]))
                else:
                    ec2_prices[i[1] + '_' + vt] = base_prices[i[1]]

                # Uploading EC2 instance information
                for instance_name, price in ec2_prices.iteritems():
                    name = ""
                    virt = ""
                    ebs = ""
                    s = instance_name.split('_')
                    name = s[0]
                    virt = s[1]
                    ebs = True if len(s)==3 else False
                    try:
                        vcpu = int(i[3])
                    except ValueError: # m1.small
                        vcpu = 1
                    try:
                        ecu = float(i[4])
                    except ValueError: # t1.micro
                        ecu = float(0)

                    instance = {
                        Specs[0]: i[1].split('.')[0],   # Instance Type 
                        Specs[1]: i[0],                 # Instance Family
                        Specs[2]: 'EC2',                # Cloud
                        Specs[3]: virt,                 # Virtualization Type
                        Specs[4]: ebs,                  # EBS-optimized
                        Specs[5]: vcpu,                 # vCPU
                        Specs[6]: float(i[5]),          # Memory (GiB)
                        Specs[7]: float(price),         # Price ($/Hr)
                        Specs[8]: i[6],                 # Instance Storage (GB)
                        Specs[9]: ecu,                  # ECU
                        Specs[10]: i[8],                # Network Performance
                        Specs[11]: i[1].split('.')[1],  # Instance size
                        Specs[12]: get_memory_range(float(i[5])),
                        Specs[13]: get_price_range(float(price))
                    }
                    instance_dict[instance_name] = instance

    if cloud == 'all' or cloud == 'rackspace':
        # Parse Rackspace info json file
        rackspace_list = json.load(open("Rackspace_instances.json","r"))['Servers']
        for i in rackspace_list:
            # Fix naming for corrupted json
            s = i['Instance Name'].split('_')
            if 'Instance' in i['Instance Name']: # Standard
                name = s[0].lower() + '_' + s[1].lower()
                family = s[1]
            else: # Performance
                name = s[0] + "gb_" + s[2].lower()
                family = s[2]
            virt = 'paravirtual'
            ebs = False
            network = i["Network Performance (Gb/s)"].strip() + " Gb/s"
            instance_name = name + '_' + virt

            instance = {
                Specs[0]: name.split('_')[1],              # Instance Type 
                Specs[1]: family,                          # Instance Family
                Specs[2]: 'Rackspace',                     # Cloud
                Specs[3]: virt,                            # Virtualization Type
                Specs[4]: ebs,                             # EBS-optimized
                Specs[5]: i["vCPU"],                       # vCPU
                Specs[6]: i["Memory (GiB)"],               # Memory (GiB)
                Specs[7]: float(i["price"]),               # Price ($/Hr)
                Specs[8]: str(i["Instance Storage (GB)"]), # Instance Storage (GB)
                Specs[9]: float('0'),                      # ECU
                Specs[10]: network,                        # Network Performance
                Specs[11]: name.split('_')[0],             # Instance Size
                Specs[12]: get_memory_range(i["Memory (GiB)"]),
                Specs[13]: get_price_range(float(i["price"]))
            }
            instance_dict[instance_name] = instance

    if cloud == 'all' or cloud == 'nimbus':
        # Parse Nimbus info json file
        nimbus_list = json.load(open("Nimbus_instances.json","r"))
        for i in nimbus_list:
            instance = {
                Specs[0]: i['name'],
                Specs[1]: i['family'],
                Specs[2]: i['cloud'],
                Specs[3]: i['virt'],
                Specs[4]: i['ebs'],
                Specs[5]: i['vcpu'],
                Specs[6]: i['memory'],
                Specs[7]: i['price'],
                Specs[8]: i['storage'],
                Specs[9]: float('0'),
                Specs[10]: 'N/A',
                Specs[11]: 'N/A',
                Specs[12]: get_memory_range(i['memory']),
                Specs[13]: get_price_range(float(i['price']))
            }
            instance_dict[instance_name] = instance

    return instance_dict


def parse_log(log):
    if "multi" in log:
        parallel = ["single", "multi"]
    else:
        parallel = ["single"]

    log_dict = {}

    for p in parallel:
        for t in range(0,len(TestNames)):
            d_sum = 0
            d_arr = []
            for i in range(0,TRIAL):
                val = log[p][i][Tests[t]]
                d_sum += val
                d_arr.append(val)
            mean = d_sum/len(d_arr)
            sqsum = 0
            for i in d_arr:
                sqsum += (i - mean)*(i - mean)
            sd = sqrt(sqsum/(len(d_arr)-1))
            if p not in log_dict:
                log_dict[p] = {}
            log_dict[p][Tests[t]] = {"mean": mean, "sd": sd}

    return log_dict


def gen_unixbench_results(instances_dict):
    logs = []
    count = 0
    instance_names = instances_dict.keys()
    n_instances = len(instance_names)
    for instance_name in instance_names:
        log_raw = {}
        try:
            instance_logs = Table(instance_name)
            for l in instance_logs.scan():
                for t in range(0,len(TestNames)):
                    if l['parallel'] not in log_raw:
                        log_raw[l['parallel']] = {}
                    if int(l['trial']) not in log_raw[l['parallel']]:
                        log_raw[l['parallel']][int(l['trial'])] = {}
                    log_raw[l['parallel']][int(l['trial'])][Tests[t]] = float(l[TestNames[t]])
        except JSONResponseError:
            print "- No log was found for %s" % instance_name
            continue
        #pprint(log_raw)
        #logs[instance_name] = parse_log(log_raw)
        print "*** [%d/%d] Log data from %s loaded! ***" % (count, n_instances, instance_name)
        log_dict = parse_log(log_raw)
        count += 1
        for p in log_dict.keys():
            for t in log_dict[p].keys():
                log = {}
                log['name'] = instance_name
                log['parallel'] = p
                log['test'] = t
                log['mean'] = log_dict[p][t]['mean']
                log['sd'] = log_dict[p][t]['sd']
                log['cloud'] = instances_dict[instance_name]['cloud']
                log['price'] = instances_dict[instance_name]['price']
                log['priceRatio'] = log['mean']/(100*log['price'])
                log['memory'] = instances_dict[instance_name]['memory']
                log['vcpu'] = instances_dict[instance_name]['vcpu']
                logs.append(log)
 
    result_file = 'web/data/unixbench_raw2.json'
    with open(result_file, 'w') as outfile:
        js.dump(logs, fp=outfile, indent=4*' ')
    print "+ " + result_file + " generated!"
    print "*** Done! ***"

def gen_group_results(instances_dict):
    datadir = 'web/data/group'
    if path.isdir(datadir):
        pass
    elif path.isfile(datadir):
        raise OSError("a file with the same name as the desired dir, '%s', already exists." % datadir)
    else:
        head, tail = path.split(datadir)
        if tail:
            mkdir(datadir)

    try:
        logs = json.load(open("web/data/unixbench.json", "r"))
    except IOError:
        print "- web/data/unixbench.json not found! Create one with %s unixbench ***" % sys.argv[0]
        sys.exit(1)
    try:
        x264s = json.load(open("web/data/x264.json", "r"))
    except IOError:
        print "- web/data/x264result_new.json not found! Create one with parse_x264.py ***"
        sys.exit(1)
    sizes = []
    types = []
    families = []
    vcpus = []
    memoryRanges = []
    priceRanges = []
    for v in instances_dict.values():
        if v['size'] not in sizes:
            sizes.append(v['size'])
        if v['type'] not in types:
            types.append(v['type'])
        if v['family'] not in families:
            families.append(v['family'])
        if v['vcpu'] not in vcpus:
            vcpus.append(v['vcpu'])
        if v['memoryRange'] not in memoryRanges:
            memoryRanges.append(v['memoryRange'])
        if v['priceRange'] not in priceRanges:
            priceRanges.append(v['priceRange'])

    for g in ['size','type','family','vcpu','memoryRange','priceRange']:
        print g
        if g=='size':
            groups = sizes
        elif g=='type':
            groups = types
        elif g=='family':
            groups = families
        elif g=='vcpu':
            groups = vcpus
        elif g=='memoryRange':
            groups = memoryRanges
        elif g=='priceRange':
            groups = priceRanges
        else:
            groups = []
        # For UnixBench
        group_dict = {}
        for gs in groups:
            #print gs
            if gs in ['512mb', 'micro', 't1', 'Micro instances' ]:
                continue
            group_dict[gs] = {}
            for t in Tests:
                test_dict = {}
                members = {}
                minp = 10
                minc = 10
                minb = 10
                maxp = -10
                maxc = -10
                maxb = -10
                sump = 0
                sumc = 0
                sumb = 0
                if t != 'x264':
                    source = logs
                else:
                    source = x264s
                for k,v in source.iteritems():
                    if instances_dict[k][g] == gs:
                        if t != 'x264':
                            p = v[t]['perf_z']
                            c = v[t]['cost_z']
                            b = v[t]['balance']
                        else:
                            p = v['time_z']
                            c = v['cost_z']
                            b = v['balance']
                        minp = min(minp,p)
                        maxp = max(maxp,p)
                        minc = min(minc,c)
                        maxc = max(maxc,c)
                        minb = min(minb,b)
                        maxb = max(maxb,b)
                        sump += p
                        sumc += c
                        sumb += b
                        members[k] = {}
                        members[k]['perf'] = p
                        members[k]['cost'] = c
                        members[k]['balance'] = b
                test_dict['minp'] = minp
                test_dict['minc'] = minc
                test_dict['minb'] = minb
                test_dict['maxp'] = maxp
                test_dict['maxc'] = maxc
                test_dict['maxb'] = maxb
                test_dict['meanp'] = sump/len(members)
                test_dict['meanc'] = sumc/len(members)
                test_dict['meanb'] = sumb/len(members)
                test_dict['members'] = members
                group_dict[gs][t] = test_dict
        result_file = 'web/data/group/'+g+'.json'
        with open(result_file, 'w') as outfile:
            js.dump(group_dict, fp=outfile, indent=4*' ')
        print "+ " + result_file + " generated!"
    print "*** Done! ***"


def gen_iperf_results(instances_dict):
    iperf_path = {}
    try:
        iperf_logs = Table('Iperf2_logs')
        for l in iperf_logs.scan():
            path = l['path']
            ignore_paths = ["c3.8xlarge_hvm_spot-c3.8xlarge_hvm_od","c3.2xlarge_hvm_spot-c3.8xlarge_hvm_od"]
            path_names = {"c3.2xlarge_hvm_od-c3.8xlarge_hvm_od": "c3.2xlarge(us-east-1d, On-demand)",
                            "c3.8xlarge_hvm_od-c3.8xlarge_hvm_od": "c3.8xlarge(us-east-1d, On-demand)",
                            "c3.8xlarge_hvm_spot_us-east-1c-c3.8xlarge_hvm_od": "c3.8xlarge(us-east-1c, Spot)"}
            if path in ignore_paths:
                continue
            else:
                path = path_names[path]
            m, d, y, h, mi = re.search(r"\D+(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})", l['datetime']).groups()
            time = datetime(2000+int(y),int(m),int(d),int(h),int(mi))
            bw = re.search(r"(\d+)\s", l['bandwidth']).group(1)
            if path not in iperf_path:
                iperf_path[path] = {}
            iperf_path[path][time] = int(bw)
            #if client not in iperf_path:
            #    iperf_path[client] = {}
            #if server not in iperf_path[client]:
            #    iperf_path[client][server] = {}
            #iperf_path[client][server][time] = int(bw)
    except JSONResponseError:
        print "No Iperf_logs table was found in DynamoDB"
        sys.exit(1)
    #pprint(iperf_path)
    iperf_dict = {}
    for k,v in iperf_path.iteritems():
        path = k
        if path not in iperf_dict:
            iperf_dict[path] = {}
        dbod = OrderedDict(sorted(v.items()))
        db_arr = []
        for d,b in dbod.iteritems():
            dt = pytz.utc.localize(d).astimezone(pytz.timezone('US/Eastern'))
            #dts = dt.year+dt.month+dt.day+dt.hour+dt.minute
            point = {}
            point['bandwidth'] = b
            point['year'] = dt.year
            point['month'] = dt.month
            point['day'] = dt.day
            point['hour'] = dt.hour
            point['minute'] = dt.minute
            db_arr.append(point)
        # FIXME: parse path to more cognitive format
        iperf_dict[path] = db_arr
    
    result_file = 'web/data/iperf2.json'
    with open(result_file, 'w') as outfile:
        js.dump(iperf_dict, fp=outfile, indent=4*' ')
    print "+ " + result_file + " generated!"
    print "*** Done! ***"


# FIXME: modulerization of utilization json files per cloud
def parse_util_results():
    res = json.load(open('web/data/util_raw2.json', "r"))
    instances = json.load(open('web/data/instances.json', "r"))
    util_dict = {}
    for i in res:
        if i['passno'] == 2:
            continue
        if i['Cloud']=='Rackspace':
            s = i['name'].split('_')
            virt = 'paravirtual'
            if 'Instance' in i['name']: # Standard
                name = s[0].lower() + '_' + s[1].lower() + '_' + virt
            else: # Performance
                name = s[0] + "gb_" + s[2].lower() + '_' + virt
        elif i['Cloud']=='Nimbus':
            name = i['name'] + '_paravirtual'
        else:
            name = i['name']
        try:
            vcpu = int(instances[name]['vcpu'])
        except ValueError: # m1.small
            vcpu = 1
    
        stats = i['perf_stats']
        memstat = stats['memstat']
        cpustat = stats['cpu_user_perc']
        iostat = stats['iostat']
    
        # Memory usage
        memory_size = memstat['total_mem']
        memory_usage_sum = 0
        time = 0
        mem_dict = {}
        for mu in memstat['used_mem']:
            usage = 100.0*mu/memory_size
            memory_usage_sum += usage
            if time%10==0:
                mem_dict[time] = usage
            time+=2
        memory_usage_mean = memory_usage_sum/len(memstat['used_mem'])
        mutod = OrderedDict(sorted(mem_dict.items()))
    
        # CPU usage
        cpu_core_dict = {}
        cpu_time_dict = {}
        core = 0
        core_sum = 0
        for cpu in cpustat:
            c = cpu['cpu']
            time = 0
            cu_list = []
            for cu in c:
                cu_list.append(cu)
                if time not in cpu_time_dict:
                    cpu_time_dict[time] = []
                cpu_time_dict[time].append(cu)
                time += 10
            core_sum += sum(cu_list)/len(cu_list)
            cpu_core_dict[core] = {
                'min' : sorted(cu_list)[0],
                'max' : sorted(cu_list)[len(cu_list)-1],
                'mean' : sum(cu_list)/len(cu_list),
                'median' : sorted(cu_list)[len(cu_list)/2]
            }
            core += 1
        #pprint(cpu_core_dict)
        for k,v in cpu_time_dict.iteritems():
            cpu_time_dict[k] = sum(v)/len(v)
        cutod = OrderedDict(sorted(cpu_time_dict.items()))
        #pprint(od)
    
        
        '''
        # Disk I/O usage
        time = 0
        tps_dict = {}
        for tps in iostat['tps']:
            tps_dict[time] = tps
            time += 10
        '''
    
        util_dict[name] = {
            'vcpu' : vcpu,
            'cloud' : i['Cloud'],
            'memory_size' : instances[name]['memory'],
            'memory_utl' : memory_usage_mean,
            'memory_utl_time' : mutod,
            'cpu_utl' : core_sum/core,
            'cpu_utl_core' : cpu_core_dict,
            'cpu_utl_time' : cutod
        }
    
    with open('web/data/util2.json', 'w') as outfile:
        js.dump(util_dict, fp=outfile, indent=4*' ')


# Rank x264 results
# FIXME: modulerization of cloud results
def rank_x264(ij):
    # Parse raw x264 results from clouds
    try:
        xd = json.load(open("web/data/x264_raw.json", "r"))
    except IOError:
        print "*** web/data/x264_raw.json not found! Try ./update_instances.py first! ***"
        sys.exit(1)
    try:
        nd = json.load(open("web/data/nimbus_raw.json", "r"))
    except IOError:
        print "*** web/data/nimbus_raw.json not found! Try ./update_instances.py first! ***"
        sys.exit(1)
    try:
        et = json.load(open("web/data/elastic_transcoder.json", "r"))
    except IOError:
        print "*** web/data/elastic_transcoder.json not found! Try ./update_instances.py first! ***"
        sys.exit(1)
    for k,v in et.iteritems():
        xd[k] = {}
        for i in v.keys():
            xd[k][i] = float(v[i])
    for k,v in nd.iteritems():
        xd[k] = {}
        for i in v.keys():
            xd[k][i] = float(v[i])
    xj = {}
    for k,v in xd.iteritems():
        if k not in ij and k != 'elastic_transcoder':
            continue
        xj[k] = {}
        mean = sum(v.values())/len(v)
        xj[k]['time'] = mean
        xj[k]['time_inv'] = 1/mean
        v_sum = 0
        for t in v.values():
            v_sum += ((1/t) - (1/mean))**2
        xj[k]['time_inv_sd'] = sqrt(v_sum/(len(v)-1))
        if k=='elastic_transcoder':
            xj[k]['cost'] = 0.33
        else:
            xj[k]['cost'] = mean*ij[k]['price']/3600
        v_sum = 0
        for t in v.values():
            if k=='elastic_transcoder':
                v_sum += 0
            else:
                v_sum += (t*ij[k]['price']/3600-mean*ij[k]['price']/3600)**2
        xj[k]['cost_sd'] = sqrt(v_sum/(len(v)-1))
        if k=='elastic_transcoder':
            xj[k]['cloud'] = 'ElasticTranscoder'
        else:
            xj[k]['cloud'] = ij[k]['cloud']
    with open('web/data/x264_stat_inv3.json', 'w') as outfile:
        js.dump(xj, fp=outfile, indent=4*' ')

    # Rank the results from raw data
    x264_json = 'web/data/x264_stat_inv3.json'
    res = json.load(open(x264_json, "r"))
    ranks = {}
    for k,v in res.iteritems():
        ranks[k] = {}
        ranks[k]['time'] = v['time']
        ranks[k]['time_inv'] = v['time_inv']
        ranks[k]['time_inv_sd'] = v['time_inv_sd']
        ranks[k]['cost'] = v['cost']
        ranks[k]['cost_sd'] = v['cost_sd']
        ranks[k]['cloud'] = v['cloud']
 
    # Show x264 ranks
    balance_dict = {}
    for sort in ['time_inv', 'cost']:
        # Calculate z-score
        values = []
        value_sum = 0
        for v in ranks.values():
            values.append(v[sort])
            value_sum += v[sort]
        mean = value_sum/len(ranks)
        variance_sum = 0
        for v in values:
            variance_sum += (v-mean)**2
        sd = sqrt(variance_sum/(len(ranks)-1))
        for k in ranks.keys():
            ranks[k][sort+'_z'] = (ranks[k][sort]-mean)/sd
 
    # Calculate the balanced score for x264 and Elastic transcoder
    for k,v in ranks.iteritems():
        ranks[k]['balance'] =  v['time_inv_z'] - v['cost_z']
        #ranks[k]['balance'] =  v['time_inv_z'] / v['cost_z']

    with open('web/data/x264_inv3.json', 'w') as outfile:
        js.dump(ranks, fp=outfile, indent=4*' ')


# UnixBench
def rank_unixbench(ij):
    unixbench_json = 'web/data/unixbench_raw2.json'
    res = json.load(open(unixbench_json, "r"))
    ud = {}
    pd = {}
    for v in res:
        k = v['name']
        if k not in ij:
            continue
        if k in pd:
            if pd[k]!='single':
                continue
        pd[k] = v['parallel']
        if k not in ud:
            ud[k] = {}
            ud[k]['cloud'] = ij[k]['cloud']
            ud[k][v['test']] = {}
        else:
            if v['test'] not in ud[k]:
                ud[k][v['test']] = {}
        ud[k][v['test']]['cost'] = ij[k]['price']
        ud[k][v['test']]['perf'] = v['mean']
        ud[k][v['test']]['perf_err'] = v['sd']
 
    # Show unixbench ranks
    for test in Tests:
        if test == 'x264':
            continue
        for metric in ['perf','cost']:
            # Calculate z-score
            values = []
            for k, v in ud.iteritems():
                values.append(v[test][metric])
            mean = sum(values)/len(values)
            variance_sum = 0
            for v in values:
                variance_sum += (v-mean)**2
            sd = sqrt(variance_sum/(len(values)-1))
            for k, v in ud.iteritems():
                ud[k][test][metric+'_z'] = (v[test][metric]-mean)/sd

        # Calculate the Balanced score for UnixBench tests
        for k,v in ud.iteritems():
            ud[k][test]['balance'] = v[test]['perf_z'] - v[test]['cost_z']
            #ud[k][test]['balance'] = v[test]['perf_z'] / v[test]['cost_z']
 
    with open('web/data/unixbench3.json', 'w') as outfile:
        js.dump(ud, fp=outfile, indent=4*' ')


def main():
    if 2 < len(sys.argv) and sys.argv[1] == 'update':
        datadir = 'web/data'
        if path.isdir(datadir):
            pass
        elif path.isfile(datadir):
            raise OSError("a file with the same name as the desired dir, '%s', already exists." % datadir)
        else:
            head, tail = path.split(datadir)
            if tail:
                mkdir(datadir)
        # Update all the instances' information
        if sys.argv[2] == 'all' and sys.argv[3] == '-force': 
            instance_dict = update_instance_list('all')
        # Update ec2 instances info
        elif sys.argv[2] == 'ec2':
            instance_dict = update_instance_list('ec2')
        # Update rackspace instances info from the file
        elif sys.argv[2] == 'rackspace':
            instance_dict = update_instance_list('rackspace')
        # Update nimbus instances info from the file
        elif sys.argv[2] == 'nimbus':
            instance_dict = update_instance_list('nimbus')
        else:
            print "usage: %s update [all|ec2|rackspace|nimbus] [-force]" % sys.argv[0]
        with open('web/data/instances2.json', 'w') as outfile:
                js.dump(instance_dict, fp=outfile, indent=4*' ')

    elif len(sys.argv) == 2:
        if sys.argv[1] == 'util':
            parse_util_results()
            sys.exit(1) 

        # Retrieve instance information
        try:
            #instances_dict = json.load(open("web/data/instances.json", "r"))
            instances_dict = json.load(open("web/data/instances_min.json", "r"))
        except IOError:
            print "*** web/data/instances.json not found! Try ./update_instances.py first! ***"
            sys.exit(1)

        # unixbench mode
        if sys.argv[1] == 'unixbench':
            gen_unixbench_results(instances_dict)
        # group mode
        elif sys.argv[1] == 'group':
            gen_group_results(instances_dict)
        # iperf mode
        elif sys.argv[1] == 'iperf':
            gen_iperf_results(instances_dict)
        # rank mode
        elif sys.argv[1] == 'rank':
            rank_x264(instances_dict)
            rank_unixbench(instances_dict)
        # unrecognized mode
        else:
            print "usage: %s [unixbench|group|iperf|util|rank]" % sys.argv[0]

    # no mode provided
    else:
        print "usage: %s [unixbench|group|iperf|util|rank]" % sys.argv[0]

if __name__ == "__main__":
    main()
