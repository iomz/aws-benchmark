all:
	tar zcvf unixbench.tgz run_unixbench.sh .boto check_boto.py upload_unixbench_log.py
	aws s3 cp unixbench.tgz s3://iomz-benchmark/
	s3cmd setacl --acl-public s3://iomz-benchmark/unixbench.tgz

.PHONY: rackspace
rackspace:
	aws s3 cp rackspace_unixbench_userscript.sh s3://iomz-benchmark/
	s3cmd setacl --acl-public s3://iomz-benchmark/rackspace_unixbench_userscript.sh

.PHONY: clean
clean:
	rm -f unixbench.tgz
