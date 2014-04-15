from pprint import pprint
import json
import math
import pyrax
import re
import socket
import simplejson as js
import sys

ext_filter = ["nimbus_S_paravirtual",
            "nimbus_M_paravirtual",
            "nimbus_L_paravirtual",
            "nimbus_XL_paravirtual",
            "m3.medium_hvm",
            "m3.medium_paravirtual",
            "m3.large_hvm",
            "m3.large_paravirtual",
            "m3.xlarge_hvm",
            "m3.xlarge_paravirtual",
            "m3.2xlarge_hvm",
            "m3.2xlarge_paravirtual",
            "1gb_standard_paravirtual",
            "2gb_standard_paravirtual",
            "4gb_standard_paravirtual",
            "8gb_performance_paravirtual",
            "30gb_performance_paravirtual",
            "elastic_transcoder"]

if 2 < len(sys.argv):
    src_file = sys.argv[1]
    dst_file = sys.argv[2]
    to_remove = []
    try:
        xd = json.load(open("%s"%src_file, "r"))
    except IOError:
        print "*** %s not found! Try ./update_instances.py first! ***"%src_file
        sys.exit(1)

    for k,v in xd.iteritems():
        if k not in ext_filter:
            to_remove.append(k)
    for k in to_remove:
        xd.pop(k)
    
    pprint(xd)
    print '+ %s'%dst_file
    with open('%s'%dst_file, 'w') as outfile:
        js.dump(xd, fp=outfile, indent=4*' ')
