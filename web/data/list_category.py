import json
from pprint import pprint
res = json.load(open('x264result_new.json', 'r'))
grps = {}
for i in res:
    cat = res[i]['category']
    if cat not in grps:
      grps[cat] = []
    grps[cat].append(i)
pprint(grps)
