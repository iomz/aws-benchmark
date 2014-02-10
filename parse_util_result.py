from collections import OrderedDict
from pprint import pprint
import json
import simplejson as js


res = json.load(open('web/data/util_raw.json', "r"))
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
    else:
        name = i['name']
    try:
        vcpu = int(i['vCPU'])
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

with open('web/data/util.json', 'w') as outfile:
    js.dump(util_dict, fp=outfile, indent=4*' ')
