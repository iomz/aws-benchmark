#!/bin/sh
# If benchmark is performed already, do nothing
if [ -e ~/x264_finished ]; then
  exit
fi

echo "*** Running startbench.sh by `whoami`..."

# Prepare video source
if [ $# == 2 ]; then
  SRC_FILE=$1
else
  SRC_FILE='elephantsdream_source.264'
fi

if [ ! -e ~/x264bench/$SRC_FILE ]; then
  if [ $SRC_FILE=='elephantsdream_source.264' ]; then
    echo "*** Downloading \"$SRC_FILE\"..."
    wget -O ~/x264bench/elephantsdream_source.264 http://www.zumzocken.de/va_x264/elephantsdream_source.264
  else
    echo "*** The source file \"$SRC_FILE\" doesn't exist... Shutting down..."
    halt
  fi
fi
echo "*** Using video \"$SRC_FILE\" as a source"

# Prepare the dependencies
if [ ! -e /etc/yum.repos.d/s3tools.repo ]; then
  echo "*** Adding s3tools.repo into \"/etc/yum.repos.d/\"..."
  cd /etc/yum.repos.d && wget http://s3tools.org/repo/RHEL_6/s3tools.repo
fi
yum -y update
yum -y install autoconf automake gcc gcc-c++ git libtool make nasm pkgconfig zlib-devel yasm s3cmd
echo '*** Dependency all installed and updated'


#Development Tools
yum -y groupinstall "Development tools"
yum -y install zlib-devel bzip2-devel openssl-devel ncurses-devel sqlite-devel readline-devel tk-devel



#install yasm 1.2.0
wget www.tortall.net/projects/yasm/releases/yasm-1.2.0.tar.gz
tar -xvzf yasm-1.2.0.tar.gz
cd yasm-1.2.0
sed -i 's#) ytasm.*#)#' Makefile.in &&
./configure --prefix=/usr &&
make
make install
cd ~


# libav
if [ -e /usr/local/bin/avconv ]; then
  echo '*** libav already installed'
else
  echo '*** Installing libav...'
  cd ~
  tar zxvf libav-HEAD*.gz -C ~/
  cd ~/libav-HEAD*
  ./configure --enable-gpl --enable-nonfree
  make && make install
fi

#systat
yum -y install systat

# x264benchmark
if [ -e /usr/local/bin/x264 ]; then
  echo '*** x264 already installed'
else
  echo '*** Installing x264...'
  cd ~
  tar xvjf ~/last_x264*.bz2 -C ~/
  cd ~/x264-snapshot*
  LAVF=`./configure | grep lavf | sed -e 's/^.*\s\+//'`
  if [ $LAVF == 'no' ] ; then
    echo "*** lavf not linked correctly... shutting down"
    halt
  fi
  make && make install
fi

# Run benchmark
echo "*** Performing benchmark..."
rm -rf ~/x264bench/bench*
rm -rf ~/x264bench/*.tgz
mkdir -p ~/x264bench/logs
rm -rf ~/x264bench/logs/*
rm -rf ~/x264bench/Run*
chmod +x ~/x264bench/launchbenchmark.sh

run=1

while [ "$run" -le "$1" ]
do

mkdir -p ~/x264bench/logs/Run$run
mkdir -p ~/x264bench/Run$run
~/x264bench/launchbenchmark.sh $SRC_FILE $run
run=$(($run + 1))

done

echo '*** Benchmarking script completed'
env TZ='America/Los_Angeles' date > ~/x264_finished

RESULTDIR="~/x264bench/logs"

#Exit the script if no results produced

if [ ${#RESULTDIR[@]} -le 0  ]; then
	echo " ~/x264bench/logs is empty. Aborting ..."
	exit
	
fi

echo "Installing pyrax (Rackspace python SDK) to upload results"

easy_install pip
easy_install -U Distribute
#yum -y install python-pip
pip install pyrax

python ~/uploadResults.py
sleep 20
halt
