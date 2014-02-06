from math import sqrt
from pprint import pprint
import json
import operator
import simplejson as js
import sys

x264_json = 'web/data/x264_pole.json'
unixbench_json = 'web/data/unixbench.json'
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
pos_all = {}
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
        ranks[k][sort+'_zscore'] = (ranks[k][sort]-mean)/sd

    sorted_ranks = [ (v[sort+'_zscore'], k) for k,v in ranks.iteritems()]
    sorted_ranks.sort()
    print "\n#x264" + sort
    pos = 0
    for v,k in sorted_ranks:
        if k not in pos_all:
            pos_all[k] = 0
        pos+=1
        pos_all[k] += v
        if pos < 10:
            print "%d %s: %f" % (pos,k,v)

# Cost pole
print '\n#x264 pole'
pos = 0
sorted_ranks = [ (v, k) for k,v in pos_all.iteritems()]
sorted_ranks.sort()
min_pole = min(pos_all.itervalues())
print min_pole
for v,k in sorted_ranks:
    pos += 1
    ranks[k]['pole'] = v-min_pole
    if pos < 10:
        print "%d %s: %f" % (pos,k,v)

with open('web/data/x264.json', 'w') as outfile:
    js.dump(ranks, fp=outfile, indent=4*' ')

## UnixBench
#res = json.load(open(unixbench_json, "r"))
#cost_dict = {}
#perf_dict = {}
#for v in res:
#    k = v['name']
#    if k not in ranks:
#        continue
#
#    perf_dict[k] = 0 
#    cost_dict[k] = 0 
#    ranks[k][v['test']+'cost'] = v['priceRatio']
#    ranks[k][v['test']+'perf'] = v['mean']
#
## Show unixbench ranks
#for test in ['dhrystone', 'double']:
##for test in ['file256', 'file1024', 'file4096']:
#    for sort in ['perf','cost']:
#        # Calculate z-score
#        values = []
#        value_sum = 0
#        for v in ranks.values():
#            values.append(v[test+sort])
#            value_sum += v[test+sort]
#        mean = value_sum/len(ranks)
#        variance_sum = 0
#        for v in values:
#            variance_sum += (v-mean)**2
#        sd = sqrt(variance_sum/(len(ranks)-1))
#        for k in ranks.keys():
#            ranks[k][test+sort+'zscore'] = (ranks[k][test+sort]-mean)/sd
#
#        sorted_ranks = [ (v[test+sort+'zscore'], k) for k,v in ranks.iteritems()]
#        sorted_ranks.sort(reverse=True)
#        print "\n#" + test + " " + sort
#        pos = 0
#        for v,k in sorted_ranks:
#            if k not in cost_dict:
#                continue
#            pos+=1
#            if sort == 'cost':
#                cost_dict[k] += v
#            else:
#                perf_dict[k] += v
#            if pos < 10:
#                print "%d %s: %f" % (pos,k,v)
#
## Perf pole
#print '\n#perf pole'
#pos = 0
#sorted_ranks = [ (v, k) for k,v in perf_dict.iteritems()]
#sorted_ranks.sort(reverse=True)
#for v,k in sorted_ranks:
#    pos += 1
#    if pos < 10:
#        print "%d %s: %f" % (pos,k,v)
#
## Cost pole
#print '\n#cost pole'
#pos = 0
#sorted_ranks = [ (v, k) for k,v in cost_dict.iteritems()]
#sorted_ranks.sort(reverse=True)
#for v,k in sorted_ranks:
#    pos += 1
#    if pos < 10:
#        print "%d %s: %f" % (pos,k,v)
#
## Balanced pole
#print '\n#balanced pole'
#pos = 0
#balanced_dict = {}
#for k in perf_dict.keys():
#    balanced_dict[k] = perf_dict[k] + cost_dict[k]
#sorted_ranks = [ (v, k) for k,v in balanced_dict.iteritems()]
#sorted_ranks.sort(reverse=True)
#for v,k in sorted_ranks:
#    pos += 1
#    if pos < 10:
#        print "%d %s: %f" % (pos,k,v)
#
