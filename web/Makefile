all:
	scp index.html cto:/var/www/cloud-eval/
	scp script/benchmark-result-visualizer.js cto:/var/www/cloud-eval/script/
	#scp style.css cto:/var/www/cloud-eval/

.PHONY: iperf
iperf:
	 scp data/iperf.json cto-virl:/var/www/cloud-eval/data/

.PHONY: data
data:
	 tar zcvf jsons.tgz data/*
	 scp jsons.tgz cto:/var/www/cloud-eval/
	 ssh cto 'cd /var/www/cloud-eval/ && rm -r data && tar zxvf jsons.tgz'
	 rm jsons.tgz
