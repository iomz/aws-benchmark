#!/usr/bin/python
# -*- coding: utf-8 -*-
try:
    from boto.dynamodb2.fields import HashKey, RangeKey
    from boto.dynamodb2.table import Table
    from boto.exception import JSONResponseError
except ImportError:
    sys.exit(0)

from pprint import pprint
import os
import re
import sys
from time import sleep

def main():
    if len(sys.argv) == 2 and sys.argv[1] == 'check':
        print "*** Checking the table in dynamoDB, create one if not exist..."
        try:
            logs = Table('Iperf_logs', schema=[HashKey('instance_name'),RangeKey('datetime'),])
            tmp = logs.describe()
            sys.exit(0)
        except JSONResponseError:
            logs = Table.create('Iperf_logs', schema=[HashKey('instance_name'),RangeKey('datetime'),])
            sys.exit(1)
    if len(sys.argv) != 4:
        print "usage: %s <instance_name> <datetime> <iperf_server>" % sys.argv[0]
        sys.exit(2)

    # Store arg lists
    instance_name = sys.argv[1]
    datetime = sys.argv[2]
    iperf_server = sys.argv[3]

    # Retrieve dynamoDB object
    try:
        logs = Table('Iperf_logs', schema=[HashKey('instance_name'),RangeKey('datetime'),])
        tmp = logs.describe()
    except JSONResponseError:
        sys.exit(1)

    # Parse iperf log
    iperf = {}
    iperf['instance_name'] = instance_name
    iperf['datetime'] = datetime
    iperf['iperf_server'] = iperf_server
    line = open(os.path.dirname(os.path.abspath(__file__))+'/log/'+datetime+'.log','r').readlines()[6]
    m = re.search(r"sec\s+(\d+\s+\w+)\s+(\d+\s+[\w/]+)", line)
    transfer = m.group(1)
    bandwidth = m.group(2)
    iperf['transfer'] = transfer
    iperf['bandwidth'] = bandwidth

    # Put the log to the dynamoDB table
    logs.put_item(data=iperf, overwrite=True)
    pprint(iperf)

if __name__ == "__main__":
    main()
