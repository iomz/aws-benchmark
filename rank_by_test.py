from math import sqrt
from pprint import pprint
import json
import operator
import simplejson as js

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
    "index"
]

x264_json = 'web/data/x264_stat.json'
# x264
res = json.load(open(x264_json, "r"))
ranks = {}
for k,v in res.iteritems():
    ranks[k] = {}
    ranks[k]['time'] = v['time']
    ranks[k]['time_sd'] = v['time_sd']
    ranks[k]['cost'] = v['cost']
    ranks[k]['cost_sd'] = v['cost_sd']
    ranks[k]['cloud'] = v['cloud']

# Show x264 ranks
balance_dict = {}
for sort in ['time', 'cost']:
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
    
for k,v in ranks.iteritems():
    ranks[k]['balance'] =  (-1*v['time_z']) - v['cost_z']

with open('web/data/x264.json', 'w') as outfile:
    js.dump(ranks, fp=outfile, indent=4*' ')

# UnixBench
unixbench_json = 'web/data/unixbench_raw.json'
res = json.load(open(unixbench_json, "r"))
ud = {}
pd = {}
for v in res:
    k = v['name']
    if k not in ranks:
        continue
    if k in pd:
        if pd[k]!='single':
            continue
    pd[k] = v['parallel']
    if k not in ud:
        ud[k] = {}
        ud[k]['cloud'] = ranks[k]['cloud']
        ud[k][v['test']] = {}
    else:
        if v['test'] not in ud[k]:
            ud[k][v['test']] = {}
    ud[k][v['test']]['cost'] = v['priceRatio']
    ud[k][v['test']]['perf'] = v['mean']
    ud[k][v['test']]['perf_err'] = v['sd'] 

# Show unixbench ranks
for test in Tests:
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

    for k,v in ud.iteritems():
        ud[k][test]['balance'] = v[test]['perf_z'] - v[test]['cost_z']

with open('web/data/unixbench.json', 'w') as outfile:
    js.dump(ud, fp=outfile, indent=4*' ')

