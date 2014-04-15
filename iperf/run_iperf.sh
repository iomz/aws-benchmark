#!/bin/bash
# user data for benchmark: Iperf

#echo "/bin/sh ~/run_iperf2.sh client_name x.x.x.x server_name" >> ~/cronjobs
#crontab ~/cronjobs

IPERF_CLIENT_NAME=$1
IPERF_SERVER_IP=$2
IPERF_SERVER_NAME=$3

mkdir -p ~/log
echo "*** Starting iperf on \"$IPERF_CLIENT_NAME\"..."

DATETIME=`date +%a%m%d%y%H%M%S`
echo "*** Iperf test started on $DATETIME!"
iperf -c $IPERF_SERVER_IP -f m -t 30 > ~/log/${DATETIME}.log
python ~/upload_iperf_log.py $IPERF_CLIENT_NAME $DATETIME $IPERF_SERVER_NAME
echo "*** Iperf test finished!"
