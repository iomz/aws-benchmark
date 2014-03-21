from pprint import pprint
import json
import math
import pyrax
import re
import socket
import simplejson as js
import sys

if 1 < len(sys.argv):
    pyrax.settings.set('identity_type', 'rackspace')
    pyrax.set_credentials('cisco_iomz','185eb75a0cc84740a57dce495b0f1d60')
    cf = pyrax.connect_to_cloudfiles("ORD")
    rejected_strings=["512MB_Standard_Instance\n",".cloudfuse.swp" , "Benchmarking" , "Benchmarking tests" , "transcoded" , "videos" ,  "Sky Diving" , "x264-bench" , "test\n" , "aws powerful\n" , "transcoded" , "videos" , "x264-bench","UnixBench results","VideoTranscoding", "Results static website"]   
    
    virt = '_paravirtual'
    xd = {}
    for cont in cf.get_all_containers():     #container is a bucket
        if cont.name in rejected_strings or "Test2_" in cont.name:
            continue 
        instance_name = cont.name.strip()
        s = instance_name.split('_')
        if 'Instance' in instance_name: # Standard
            name = s[0].lower() + '_' + s[1].lower() + virt
        elif instance_name[0].isdigit(): # Performance
            name = s[0] + "gb_" + s[2].lower() + virt
        else:
            name = instance_name
        if 't1' in name:
            continue
        if 'Nimbus' not in name:
            continue
        xd[name] = {}
        for i in range(1,4):
            # Pass1 realtime
            file_str = cont.fetch_object("Run%d/ExecutionTime_pass1"%i)
            m, s = re.search(r"(\d+)m(\d+\.\d+)s",file_str).groups()
            pass1 = int(m)*60 + float(s)
            xd[name][i] = pass1
            # Pass2 realtime
            file_str = cont.fetch_object("Run%d/ExecutionTime_pass2"%i)
            m, s = re.search(r"(\d+)m(\d+\.\d+)s",file_str).groups()
            pass2 = int(m)*60 + float(s)
            xd[name][i] += pass2
            print name, pass1, pass2
        '''
        t1, t2, t3 = xd[name].values()
        if t1==t2:
            print name, t1, t2, t3
        '''
    
    with open('web/data/nimbus_raw.json', 'w') as outfile:
        js.dump(xd, fp=outfile, indent=4*' ')
else:
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
    xd['elastic_transcoder'] = {}
    for k,v in et.iteritems():
        for i in v.keys():
            xd[k][i] = float(v[i])
    for k,v in nd.iteritems():
        for i in v.keys():
            xd[k][i] = float(v[i])
    try:
        ij = json.load(open("web/data/instances.json", "r"))
    except IOError:
        print "*** web/data/instances.json not found! Try ./update_instances.py first! ***"
        sys.exit(1)
    
    xj = {}
    for k,v in xd.iteritems():
        xj[k] = {}
        mean = sum(v.values())/len(v)
        xj[k]['time'] = mean
        xj[k]['time_inv'] = 1/mean
        v_sum = 0
        for t in v.values():
            v_sum += ((1/t) - (1/mean))**2
        xj[k]['time_inv_sd'] = math.sqrt(v_sum/(len(v)-1))
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
        xj[k]['cost_sd'] = math.sqrt(v_sum/(len(v)-1))
        if k=='elastic_transcoder':
            xj[k]['cloud'] = 'ElasticTranscoder'
        else:
            xj[k]['cloud'] = ij[k]['cloud']    
    
    with open('web/data/x264_stat_inv2.json', 'w') as outfile:
        js.dump(xj, fp=outfile, indent=4*' ')
