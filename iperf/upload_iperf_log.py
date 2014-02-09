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
            logs = Table('iperf', schema=[HashKey('instance_name'),RangeKey('datetime'),])
            tmp = logs.describe()
            sys.exit(0)
        except JSONResponseError:
            logs = Table.create('iperf', schema=[HashKey('instance_name'),RangeKey('datetime'),])
            sys.exit(1)
    if len(sys.argv) != 3:
        print "usage: %s <instance_name> <datetime>" % sys.argv[0]
        sys.exit(2)

    # Store arg lists
    instance_name = sys.argv[1]
    datetime = sys.argv[2]

    # Retrieve dynamoDB object
    try:
        logs = Table('iperf', schema=[HashKey('instance_name'),RangeKey('datetime'),])
        tmp = logs.describe()
    except JSONResponseError:
        sys.exit(1)

    # Parse iperf log
    iperf = {}
    iperf['instance_name'] = instance_name
    iperf['datetime'] = datetime
    line = open(os.path.dirname(os.path.abspath(__file__))+'/log/'+datetime+'.log','r').readlines()[6]
    m = re.search(r"sec\s+(\d+\s+\w+)\s+(\d+\.\d+\s+[\w/]+)", line)
    transfer = m.group(1)
    bandwidth = m.group(2)
    iperf['transfer'] = transfer
    iperf['bandwidth'] = bandwidth

    # Put the log to the dynamoDB table
    logs.put_item(data=iperf, overwrite=True)
    pprint(iperf)

if __name__ == "__main__":
    main()
