import json
import simplejson as js
import sys

res = json.load(open(sys.argv[1], "r"))
instances = json.load(open(sys.argv[2], "r"))
new = {}
for i in res:
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

    price = instances[name]['price']
    
    new[name] = {
            'memory' : float(i['Memory(GiB)']),
            'vcpu' : vcpu,
            'price' : price,
            'cloud' : i['Cloud'],
            'time' : i['realtime'],
            'cost' : (i['realtime']/3600)*price
    }

with open('x264result_new.json', 'w') as outfile:
    js.dump(new, fp=outfile, indent=4*' ')
