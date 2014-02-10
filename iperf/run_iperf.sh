#!/bin/bash
# user data for benchmark: Iperf

IPERF_SERVER=$1
IDESC=`cat /var/local/instance_name`

mkdir -p ~/log
echo "*** Starting iperf on \"$IDESC\"..."

DATETIME=`date +%a%m%d%y%H%M%S`
echo "*** Iperf test started on $DATETIME!"
iperf -c $IPERF_SERVER -f m -t 30 > ~/log/${DATETIME}.log
python ~/upload_iperf_log.py $IDESC $DATETIME $IPERF_SERVER
echo "*** Iperf test finished!"
