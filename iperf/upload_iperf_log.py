#!/usr/bin/python
# -*- coding: utf-8 -*-
try:
    from boto.dynamodb2.exceptions import ValidationException
    from boto.dynamodb2.fields import HashKey, RangeKey
    from boto.dynamodb2.layer1 import DynamoDBConnection
    from boto.dynamodb2.table import Table
    from boto.exception import JSONResponseError
except ImportError:
    sys.exit(0)

from pprint import pprint
import os
import re
import sys
from time import sleep

iperf_table_name = 'Iperf2_logs'

def main():
    if len(sys.argv) == 2 and sys.argv[1] == 'check':
        print "*** Checking the table in dynamoDB, create one if not exist..."
        try:
            ddbc = DynamoDBConnection()
            src = ddbc.describe_table(iperf_table_name)['Table']
            logs = Table(iperf_table_name, schema=[HashKey('path'),RangeKey('datetime'),])
            logs.describe()
            sys.exit(0)
        except JSONResponseError:
            logs = Table.create(iperf_table_name, schema=[HashKey('path'),RangeKey('datetime'),])
            while ddbc.describe_table(iperf_table_name)['Table']['TableStatus'] != 'ACTIVE':
                sleep(3)
            sys.exit(1)
    if len(sys.argv) != 4:
        print "usage: %s <iperf_client_name> <datetime> <iperf_server_name>" % sys.argv[0]
        sys.exit(2)

    # Store arg lists
    iperf_client_name = sys.argv[1]
    datetime = sys.argv[2]
    iperf_server_name = sys.argv[3]
    path = iperf_client_name + '-' + iperf_server_name

    # Retrieve dynamoDB object
    try:
        logs = Table(iperf_table_name, schema=[HashKey('path'),RangeKey('datetime'),])
        tmp = logs.describe()
    except JSONResponseError:
        print "The table %s doesn't exist!" % iperf_table_name
        sys.exit(1)

    # Parse iperf log
    iperf = {}
    iperf['path'] = path
    iperf['datetime'] = datetime
    line = open(os.path.dirname(os.path.abspath(__file__))+'/log/'+datetime+'.log','r').readlines()[6]
    m = re.search(r"sec\s+(\d+\s+\w+)\s+(\d+\s+[\w/]+)", line)
    transfer = m.group(1)
    bandwidth = m.group(2)
    iperf['transfer'] = transfer
    iperf['bandwidth'] = bandwidth

    # Put the log to the dynamoDB table
    try:
        logs.put_item(data=iperf, overwrite=True)
    except ValidationException:
        pprint(iperf)
    except JSONResponseError:
        pass

if __name__ == "__main__":
    main()
