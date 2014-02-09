all:
	tar zcvf iperf.tgz run_iperf.sh .boto upload_iperf_log.py
	aws s3 cp iperf.tgz s3://iomz-benchmark/
	s3cmd setacl --acl-public s3://iomz-benchmark/iperf.tgz

.PHONY: clean
clean:
	rm -f iperf.tgz
