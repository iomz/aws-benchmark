#!/usr/bin/python
# -*- coding: utf-8 -*-
from boto.dynamodb2.fields import HashKey, RangeKey
from boto.dynamodb2.table import Table
from boto.dynamodb2.exceptions import ConditionalCheckFailedException
from boto.exception import JSONResponseError
import copy
import os
import re
import sys
from time import sleep

Tests = [
    "Dhrystone 2 using register variables",
    "Double-Precision Whetstone",
    "Execl Throughput",
    "File Copy 1024 bufsize 2000 maxblocks",
    "File Copy 256 bufsize 500 maxblocks",
    "File Copy 4096 bufsize 8000 maxblocks",
    "Pipe Throughput",
    "Pipe-based Context Switching",
    "Process Creation",
    "Shell Scripts (1 concurrent)",
    "Shell Scripts (8 concurrent)",
    "System Call Overhead",
    "System Benchmarks Index Score"
]

def main():
    # TODO: Need argument parsing
    unit_flag = False

    instance_name = sys.argv[1]
    trial = sys.argv[2]
    try:
        logs = Table(instance_name, schema=[HashKey('trial'),RangeKey('parallel'),])
        tmp = logs.describe()
    except JSONResponseError:
        sys.exit()

    # Create units table
    if unit_flag:    
        try:
            units_t = Table('unixbench_unit', schema=[HashKey('test_name'),])
            tmp = units_t.describe()
        except JSONResponseError:
            units_t = Table.create('unixbench_unit', schema=[HashKey('test_name'),])
            sleep(15) # Wait for the new db becomes available
        units = {}

    multi_flag = False
    result_flag = False
    test_index = 0
    b = {}
    single = {}
    multi = {}
    for line in open(os.path.dirname(os.path.abspath(__file__))+'/log/'+instance_name+'_'+trial+'.log','r'):
        if "Benchmark Run" in line:
            result_flag = True
        elif not result_flag:
            continue
        if Tests[test_index] in line:
            m = re.search(r"\s+(\d+\.\d)\s(\w+)", line)
            if test_index+1 != len(Tests):
                if unit_flag:
                    units[Tests[test_index]] = m.group(2)
                b[Tests[test_index]] = m.group(1)
                test_index += 1
            else:
                m = re.search(r"\s+(\d+\.\d)", line)
                result_flag = False
                if not multi_flag:
                    multi_flag = True
                    single = copy.deepcopy(b)
                    single[Tests[test_index]] = m.group(1)
                    single['parallel'] = 'single'
                    single['trial'] = trial
                    test_index = 0
                    b.clear()
                else:
                    multi = copy.deepcopy(b)
                    multi[Tests[test_index]] = m.group(1)
                    multi['trial'] = trial
                    multi['parallel'] = 'multi'

    logs.put_item(data=single, overwrite=True)
    if len(multi) != 0:
        logs.put_item(data=multi, overwrite=True)

    # Upload units for tests
    if unit_flag:
        for t, u in units.iteritems():
            print t, u
            units_t.put_item(data={
                'test_name': t,
                'unit': u
            })

if __name__ == "__main__":
    main()
