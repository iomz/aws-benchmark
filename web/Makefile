all:
	#for file in *.html; do scp "$$file" cto:/var/www/cloud-eval/unixbench/; done
	scp index.html cto:/var/www/cloud-eval/
	scp script/benchmark-result-visualizer.js cto:/var/www/cloud-eval/script/
	#scp style.css cto:/var/www/cloud-eval/

.PHONY: data
data:
	for file in data/*.json; do scp "$$file" cto:/var/www/cloud-eval/data/; done
