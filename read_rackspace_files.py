from pprint import pprint
import json
import math
import pyrax
import re
import socket
import simplejson as js

#pyrax.settings.set('identity_type', 'rackspace')
#pyrax.set_credentials('Iorimizutani', '9e879692424e41e9b41d9d81a79ce1b8')
#cf = pyrax.connect_to_cloudfiles("ORD")
#rejected_strings=["512MB_Standard_Instance\n",".cloudfuse.swp" , "Benchmarking" , "Benchmarking tests" , "transcoded" , "videos" ,  "Sky Diving" , "x264-bench" , "test\n" , "aws powerful\n" , "transcoded" , "videos" , "x264-bench","UnixBench results","VideoTranscoding", "Results static website"]   
#
#virt = '_paravirtual'
#xd = {}
#for cont in cf.get_all_containers():     #container is a bucket
#    if cont.name in rejected_strings or "Test2_" in cont.name:
#        continue 
#    instance_name = cont.name.strip()
#    s = instance_name.split('_')
#    if 'Instance' in instance_name: # Standard
#        name = s[0].lower() + '_' + s[1].lower() + virt
#    elif instance_name[0].isdigit(): # Performance
#        name = s[0] + "gb_" + s[2].lower() + virt
#    else:
#        name = instance_name
#    xd[name] = {}
#    if 't1' in name:
#        continue
#    for i in range(1,4):
#        file_str = cont.fetch_object("Run%d/ExecutionTime_pass1"%i)
#        m, s = re.search(r"(\d+)m(\d+\.\d+)s",file_str).groups()
#        xd[name][i] = int(m)*60 + float(s)
#
#with open('web/data/x264_raw.json', 'w') as outfile:
#    js.dump(xd, fp=outfile, indent=4*' ')
#
try:
    ij = json.load(open("web/data/instances.json", "r"))
except IOError:
    print "*** web/data/instances.json not found! Try ./update_instances.py first! ***"
    sys.exit(1)

xd = json.load(open('web/data/x264_raw.json','r'))

xj = {}
for k,v in xd.iteritems():
    print k,v
    xj[k] = {}
    mean = sum(v.values())/len(v)
    xj[k]['time'] = mean
    v_sum = 0
    for t in v.values():
        v_sum += (t-mean)**2
    xj[k]['time_sd'] = math.sqrt(v_sum/(len(v)-1))
    xj[k]['cost'] = mean*ij[k]['price']/3600
    v_sum = 0
    for t in v.values():
        v_sum += (t*ij[k]['price']/3600-mean*ij[k]['price']/3600)**2
    xj[k]['cost_sd'] = math.sqrt(v_sum/(len(v)-1))
    xj[k]['cloud'] = ij[k]['cloud']    

with open('web/data/x264_pole.json', 'w') as outfile:
    js.dump(xj, fp=outfile, indent=4*' ')
