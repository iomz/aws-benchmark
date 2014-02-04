all:
	#for file in *.html; do scp "$$file" cto:/var/www/cloud-eval/unixbench/; done
	scp x264.html cto:/var/www/cloud-eval/x264/index.html
	scp script/x264-visualizer.js cto:/var/www/cloud-eval/x264/script/
	scp data/x264result_new.json cto:/var/www/cloud-eval/x264/data/

.PHONY: unixbench
data:
	scp index.html cto:/var/www/cloud-eval/unixbench/
	scp script/unixbench-visualizer.js cto:/var/www/cloud-eval/unixbench/script/
	#scp style.css cto:/var/www/cloud-eval/unixbench/

.PHONY: data
data:
	for file in data/*.json; do scp "$$file" cto:/var/www/cloud-eval/unixbench/data/; done
