echo 'nimbus_L' > /var/local/instance_name
yum -y install wget
wget -O - http://2c1167a24bd4f9dd8df8-9cb0d5296d5e7672016574e2c9740dfd.r13.cf2.rackcdn.com/test_x264_aws_stats.tgz | tar zxv -C ~/
sh ~/x264bench.sh 3
