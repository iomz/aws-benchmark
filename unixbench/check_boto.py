#!/usr/bin/python
# -*- coding: utf-8 -*-
from time import sleep
import sys

try:
    from boto.dynamodb2.fields import HashKey, RangeKey
    from boto.dynamodb2.table import Table
    from boto.exception import JSONResponseError
except ImportError:
    sys.exit(0)

instance_name = open('/var/local/instance_name').read().strip()
#instance_name = sys.argv[1]

# Check if the table exists or not, create one if not
print "*** Connecting to DynamoDB '%s' table..." % instance_name
table_struct = None
try:
    logs = Table(instance_name, schema=[HashKey('trial'),RangeKey('parallel'),])
    table_struct = logs.describe()
except JSONResponseError:
    logs = Table.create(instance_name, schema=[HashKey('trial'),RangeKey('parallel'),])
    sys.stdout.write("*** DynamoDB is creating a new table...")
while table_struct is None:
    try:
        logs = Table(instance_name, schema=[HashKey('trial'),RangeKey('parallel'),])
        table_struct = logs.describe()
        print "\tDone"
    except JSONResponseError:
        sleep(5)
