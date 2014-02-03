#!/bin/sh
# Benchmark stat file name
echo $1
SRC_FILE=~/x264bench/$1
LOG_DIR=~/x264bench/logs/Run$2
STATFILE=$LOG_DIR/stats.log
OUT_1=$LOG_DIR/pass1.out
OUT_2=$LOG_DIR/pass2.out
TIMESTRING="Execution Time : "

# Pass 1:
echo '*** Starting 1st pass...'

START=$(date +%s)

#Writing io statistics
( iostat 10 > $LOG_DIR/iostat_pass1.txt ) &


#Writing CPU stats
( mpstat  -P ALL 10  > $LOG_DIR/mpstat_pass1.txt ) &

#Writing mem stats
(free -m -s 2 > $LOG_DIR/mem_pass1.txt) &


(time /usr/local/bin/x264 --preset veryslow --tune film --b-adapt 2 --b-pyramid normal -r 3 -f -2:0 --bitrate 10000 --aq-mode 1 -p 1 --slow-firstpass --stats $STATFILE -t 2 --no-fast-pskip --cqm flat -v -o /dev/null  $SRC_FILE &> $OUT_1 ) &> $LOG_DIR/ExecutionTime_pass1

#kill the stats processes
pkill -9 -f free
pkill -9 -f iostat
pkill -9 -f mpstat

END=$(date +%s)

echo $TIMESTRING $(( $END - $START )) " seconds"  >> $OUT_1

START=$(date +%s)
#Writing io statistics
( iostat 10 > $LOG_DIR/iostat_pass2.txt ) &


#Writing CPU stats
( mpstat  -P ALL 10  > $LOG_DIR/mpstat_pass2.txt ) &

#Writing mem stats
(free -m -s 2 > $LOG_DIR/mem_pass2.txt) &


# Pass 2:
echo '*** Starting 2nd pass...'
( time /usr/local/bin/x264 --preset veryslow --tune film --b-adapt 2 --b-pyramid normal -r 3 -f -2:0 --bitrate 10000 --aq-mode 1 -p 2 --stats $STATFILE -t 2 --no-fast-pskip --cqm flat -v -o /dev/null  $SRC_FILE &> $OUT_2 ) &> $LOG_DIR/ExecutionTime_pass2

#Kill the stats processes
pkill -9 -f free
pkill -9 -f iostat
pkillkill -9 -f mpstat

END=$(date +%s)

echo $TIMESTRING  $(( $END - $START )) "seconds"  >> $OUT_2 
