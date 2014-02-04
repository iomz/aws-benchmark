/*
 benchmark-result-visualizer.js v0.2 (2014-02-04)

 (c)2013-2014 Iori Mizutani(iomz@cisco.com)

 License: https://github.com/iomz/ec2-vid-benchmark/LICENSE

 Parse benchmark json results to TaffyDB and plot the figure with Highcharts.js
 */
var instances = TAFFY();
var unixbenchs = TAFFY();
var x264s = TAFFY();
var currentLimit = 30;
var currentTab = 'home';
var currentTest = "index";
var currentParallel = "multi";
var currentSorter = "mean";
var currentXSorter = "time";
var currentScatter = 'price';
var currentGroup = "vcpu";
var colors = Highcharts.getOptions().colors;
var Parallels = ['single', 'multi'];
var Groups = ['size', 'type', 'family', 'vcpu', 'memoryRange', 'priceRange'];
var Sorters = {
	"priceRatio" : "Efficiency",
	"mean" : "Performance",
	"price" : "Cost"
};
var XSorters = {
	'time' : "Actual time elapsed",
	'cost' : "Cost necessary to complete x264 benchmark"
};
var Scatters = {
	"scatterPrice" : "price",
	"scatterMemory" : "memory",
	"scattervCPU" : "vcpu"
};
var Specs = {
	"type" : "Instance Type",
	"family" : "Instance Family",
	"cloud" : "Cloud",
	"virt" : "Virtualization Type",
	"ebs" : "EBS-optimized",
	"vcpu" : "vCPU",
	"memory" : "Memory (GiB)",
	"price" : "Price ($/Hr)",
	"storage" : "Instance Storage (GB)",
	"ecu" : "ECU",
	"network" : "Network Performance",
	"size" : "Instance Size",
	"memoryRange" : "Memory Group",
	"priceRange" : "Price Group"
};
var SpecUnits = {
	"price" : "$/Hr",
	"memory" : "GiB",
	"vcpu" : "vCPU"
};
var Tests = {
	"dhrystone" : "Dhrystone 2 using register variables",
	"double" : "Double-Precision Whetstone",
	"execl" : "Execl Throughput",
	"file1024" : "File Copy 1024 bufsize 2000 maxblocks",
	"file256" : "File Copy 256 bufsize 500 maxblocks",
	"file4096" : "File Copy 4096 bufsize 8000 maxblocks",
	"pipethru" : "Pipe Throughput",
	"pipecs" : "Pipe-based Context Switching",
	"process" : "Process Creation",
	"shell1" : "Shell Scripts (1 concurrent)",
	"shell8" : "Shell Scripts (8 concurrent)",
	"overhead" : "System Call Overhead",
	"index" : "System Benchmarks Index Score",
	"x264" : "x264 Benchmark"
};
var TestUnits = {
	"dhrystone" : "lps",
	"double" : "MWIPS",
	"execl" : "lps",
	"file1024" : "KBps",
	"file256" : "KBps",
	"file4096" : "KBps",
	"pipethru" : "lps",
	"pipecs" : "lps",
	"process" : "lps",
	"shell1" : "lpm",
	"shell8" : "lpm",
	"overhead" : "lps",
	"index" : "Score",
	"x264" : "s"
};

function plotPerGroup(parallel, group, test, xsorter) {
	if (test == 'x264') {
		var groupDataFile = "data/" + group + "_" + test + "_" + xsorter + ".json";
		var ysorter = ' desc';
	} else {
		var groupDataFile = "data/" + group + "_" + test + "_" + parallel + ".json";
		var ysorter = '';
	}
	$.getJSON(groupDataFile, function(d) {
		var groupResults = TAFFY();
		$.each(d, function(k, v) {
			var memberDict = v['members'];
			var memberData = TAFFY();
			for (var i in memberDict) {
				memberData.insert({
					'color' : (memberDict[i]['cloud'] == 'EC2') ? colors[6] : colors[5],
					'name' : i,
					'y' : memberDict[i]['mean']
				});
			}
			var members = {
				name : k,
				id : k,
				data : memberData().order('y' + ysorter).map(function(i) {
					return {
						color : i.color,
						name : i.name,
						y : i.y
					};
				})
			};
			groupResults.insert({
				'name' : k,
				'range' : [v['min'], v['max']],
				'mean' : v['mean'],
				'num' : v['num'],
				'cloud' : v['cloud'],
				'members' : members
			});
		});
		if (test == 'index') {
			var tName = Tests[test];
			var subTitle = 'Grouped by ' + Specs[group];
		} else if (test == 'x264') {
			var tName = Tests[test];
			var subTitle = XSorters[xsorter];
		} else {
			var tName = Tests[test] + ' (' + TestUnits[test] + ')';
			var subTitle = 'Grouped by ' + Specs[group];
		}
		var names = groupResults().order('mean' + ysorter).map(function(i) {
			return i.name;
		});
		var ranges = groupResults().order('mean' + ysorter).map(function(i) {
			return [parseFloat(i.range[0].toFixed(2)), parseFloat(i.range[1].toFixed(2))];
		});
		var nums = groupResults().order('mean' + ysorter).map(function(i) {
			return parseFloat(i.num.toFixed(2));
		});
		var means = groupResults().order('mean' + ysorter).map(function(i) {
			return {
				name : i.name,
				y : parseFloat(i.mean.toFixed(2)),
				drilldown : i.name
			};
		});
		var drilldownSeries = groupResults().map(function(i) {
			return i.members;
		});
		var el = "#" + group + "_chart";
		$(el).highcharts({
			chart : {
				type : 'column'
			},
			title : {
				text : Tests[test] + ' (' + parallel + ')'
			},
			subtitle : {
				text : subTitle
			},
			xAxis : {
				type : 'category'
			},
			yAxis : [{
				title : {
					text : tName
				}
			}],
			legend : {
				enabled : false
			},
			tooltip : {
				shared : true
			},
			plotOptions : {
				series : {
					borderWidth : 0,
				}
			},
			series : [{
				colorByPoint : true,
				name : tName,
				yAxis : 0,
				data : means
			}],
			drilldown : {
				series : drilldownSeries
			}
		});
		$(el).highcharts().setSize(1000, 300);
		var el = "#" + group + "_desc_chart";
		$(el).highcharts({
			title : {
				text : null
			},
			xAxis : {
				categories : names
			},
			yAxis : [{
				title : {
					text : tName
				}
			}, {
				title : {
					text : 'Number of Instances'
				},
				opposite : true
			}],
			legend : {
				enabled : false
			},
			tooltip : {
				shared : true
			},
			plotOptions : {
				series : {
					borderWidth : 0,
				}
			},
			series : [{
				name : 'Min-Max range',
				type : 'arearange',
				data : ranges,
				yAxis : 0
			}, {
				color : colors[1],
				name : 'Number of instances',
				type : 'line',
				data : nums,
				yAxis : 1
			}],
			drilldown : {
				series : drilldownSeries
			}
		});
		$(el).highcharts().setSize(1040, 300);
	});
}

function plotGroupVariations(sorter) {
	var virt = {
		'paravirtual' : 0,
		'hvm' : 0
	};
	for (v in virt ) {
		var sorterArr = instances({
			virt : v,
			ebs : false
		}).order(sorter).map(function(i) {
			if (sorter == 'size')
				return i.size;
			else if (sorter == 'type')
				return i.type;
			else if (sorter == 'family')
				return i.family;
			else if (sorter == 'vcpu')
				return i.vcpu;
			else if (sorter == 'memoryRange')
				return i.memoryRange;
			else if (sorter == 'priceRange')
				return i.priceRange;
			else if (sorter == 'size')
				return i.size;
		});
		var categories = [];
		$.each(sorterArr, function(i, el) {
			if ($.inArray(el, categories) === -1)
				categories.push(el);
		});
		var name = Specs[sorter] + ' variations (' + v + ')';
		var data = [];
		var color_dict = {};
		for (var i = 0; i < categories.length; i++) {
			var nsorter = categories[i];
			color_dict[nsorter] = colors[i % 9];
			if (sorter == 'size') {
				var subcats = instances({
					virt : v,
					ebs : false,
					size : nsorter
				}).order(sorter).map(function(i) {
					return i.name.split("_")[0];
				});
			} else if (sorter == 'type') {
				var subcats = instances({
					virt : v,
					ebs : false,
					type : nsorter
				}).order(sorter).map(function(i) {
					return i.name.split("_")[0];
				});
			} else if (sorter == 'family') {
				var subcats = instances({
					virt : v,
					ebs : false,
					family : nsorter
				}).order(sorter).map(function(i) {
					return i.name.split("_")[0];
				});
			} else if (sorter == 'vcpu') {
				var subcats = instances({
					virt : v,
					ebs : false,
					vcpu : nsorter
				}).order(sorter).map(function(i) {
					return i.name.split("_")[0];
				});
			} else if (sorter == 'memoryRange') {
				var subcats = instances({
					virt : v,
					ebs : false,
					memoryRange : nsorter
				}).order(sorter).map(function(i) {
					return i.name.split("_")[0];
				});
			} else if (sorter == 'priceRange') {
				var subcats = instances({
					virt : v,
					ebs : false,
					priceRange : nsorter
				}).order(sorter).map(function(i) {
					return i.name.split("_")[0];
				});
			} else if (sorter == 'size') {
				var subcats = instances({
					virt : v,
					ebs : false,
					size : nsorter
				}).order(sorter).map(function(i) {
					return i.name.split("_")[0];
				});
			}
			var caty = parseFloat((100 * (subcats.length / sorterArr.length)).toFixed(2));
			data.push({
				color : colors[i % 9],
				name : categories[i],
				y : caty,
			});
		}
		var subData = instances({
			virt : v,
			ebs : false
		}).order(sorter).map(function(i) {
			return {
				name : i.name.split("_")[0],
				y : parseFloat((100 * (1 / sorterArr.length)).toFixed(2)),
				color : color_dict[i.vcpu]
			};
		});
		$('#' + v + "_chart").highcharts({
			chart : {
				type : 'pie'
			},
			title : {
				text : name
			},
			plotOptions : {
				pie : {
					allowPointSelect : true,
					shadow : false,
					center : ['50%', '50%']
				}
			},
			tooltip : {
				valueSuffix : '%'
			},
			series : [{
				name : Specs[sorter] + ' Ratio',
				data : data,
				size : '60%',
				dataLabels : {
					formatter : function() {
						return this.y > 5 ? this.point.name : null;
					},
					color : 'white',
					distance : -30
				}
			}, {
				name : 'Instance',
				data : subData,
				size : '70%',
				innerSize : '60%'
			}]
		});
		$('#' + v + "_chart").highcharts().setSize(800, 600);
	}
}

function plotUnixBenchs(parallel, test, sorter, limit) {
	if (test != 'index')
		var tName = Tests[test] + ' (' + TestUnits[test] + ')';
	else
		var tName = Tests[test];
	var order = " desc";
	var names = unixbenchs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(limit).map(function(i) {
		return i.name;
	});
	var ec2means = unixbenchs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(limit).map(function(i) {
		return {
			name : i.cloud + ': ' + i.name,
			y : (i.cloud == 'EC2') ? parseFloat(i.mean.toFixed(2)) : 0
		};
	});
	var rackmeans = unixbenchs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(limit).map(function(i) {
		return {
			name : i.cloud + ': ' + i.name,
			y : (i.cloud == 'Rackspace') ? parseFloat(i.mean.toFixed(2)) : 0
		};
	});
	var sds = unixbenchs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(limit).map(function(i) {
		var low = (i.mean - i.sd).toFixed(2);
		var high = (i.mean + i.sd).toFixed(2);
		return [parseFloat(low), parseFloat(high)];
	});
	var priceRatios = unixbenchs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(limit).map(function(i) {
		/*return i.mean/(i.price*100);*/
		return {
			name : i.cloud + ': ' + i.name,
			y : parseFloat(i.priceRatio.toFixed(2))
		};
	});
	var means = unixbenchs({
		'test' : test,
		'parallel' : parallel
	}).map(function(i) {
		return i.mean;
	});
	var sum = 0;
	for (var i = 0; i < means.length; i++)
		sum += means[i];
	var mean = sum / means.length;
	var varianceSum = 0;
	for (var i = 0; i < means.length; i++)
		varianceSum += (means[i] - mean) * (means[i] - mean);
	var std = Math.sqrt(varianceSum / (means.length - 1));
	means = [];
	mean = parseFloat(mean.toFixed(2));
	for ( i = 0; i < names.length; i++)
		means.push(mean);
	var zscores = unixbenchs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(limit).map(function(i) {
		return parseFloat(((i.mean - mean) / std).toFixed(2));
	});
	// Reverse the order to show the plot collectly
	names.reverse();
	sds.reverse();
	ec2means.reverse();
	rackmeans.reverse();
	priceRatios.reverse();
	zscores.reverse();
	var series = [{
		color : colors[6],
		name : 'EC2 ' + tName,
		type : 'column',
		yAxis : 0,
		data : ec2means
	}, {
		color : colors[5],
		name : 'Rackspace ' + tName,
		type : 'column',
		yAxis : 0,
		data : rackmeans
	}, {
		color : colors[2],
		name : tName + ' error',
		type : 'errorbar',
		yAxis : 0,
		data : sds
	}, {
		color : colors[4],
		name : 'Efficiency [' + TestUnits[test] + '/100*$/Hr]',
		type : 'line',
		yAxis : 1,
		data : priceRatios
	}, {
		color : colors[3],
		name : 'Mean',
		type : 'line',
		yAxis : 0,
		data : means,
		marker : {
			enabled : false
		}
	}, {
		color : colors[8],
		name : 'Z Score',
		type : 'line',
		yAxis : 2,
		data : zscores
	}];
	$("#unixBench_chart").highcharts({
		title : {
			text : 'Best ' + limit + ' ' + Tests[test] + ' (' + parallel + ')',
			x : -20 //center
		},
		subtitle : {
			text : 'Sorted by ' + Sorters[sorter],
			x : -20
		},
		xAxis : {
			categories : names,
			labels : {
				rotation : 45
			}
		},
		yAxis : [{
			title : {
				text : tName
			}
		}, {
			title : {
				text : tName + '/(100*' + Specs['price'] + ')'
			},
			opposite : true
		}, {
			title : {
				text : 'Z Score'
			}
		}],
		tooltip : {
			shared : true
		},
		plotOptions : {
			column : {
				stacking : 'normal'
			},
			errorbar : {
				lineWidth : 3
			}
		},
		legend : {
			align : "left",
			backgroundColor : '#FFF',
			floating : true,
			layout : "vertical",
			verticalAlign : "top",
			x : 150,
			y : 50
		},
		series : series
	});
	$("#unixBench_chart").highcharts().setSize(1000, 600);
}

function plotScatter(parallel, test, scatter) {
	var ec2paravirtuals = unixbenchs({
		test : test,
		parallel : parallel,
		name : {
			like : 'paravirtual'
		},
		cloud : 'EC2'
	}).map(function(i) {
		if (scatter == 'price')
			var val = i.price;
		else if (scatter == 'memory')
			var val = i.memory;
		else if (scatter == 'vcpu')
			var val = i.vcpu;
		return {
			name : i.name,
			x : val,
			y : parseFloat(i.mean.toFixed(2))
		};
	});
	var rackparavirtuals = unixbenchs({
		test : test,
		parallel : parallel,
		name : {
			like : 'paravirtual'
		},
		cloud : 'Rackspace'
	}).map(function(i) {
		if (scatter == 'price')
			var val = i.price;
		else if (scatter == 'memory')
			var val = i.memory;
		else if (scatter == 'vcpu')
			var val = i.vcpu;
		return {
			name : i.name,
			x : val,
			y : parseFloat(i.mean.toFixed(2))
		};
	});
	var hvms = unixbenchs({
		test : test,
		parallel : parallel,
		name : {
			like : 'hvm'
		}
	}).map(function(i) {
		if (scatter == 'price')
			var val = i.price;
		else if (scatter == 'memory')
			var val = i.memory;
		else if (scatter == 'vcpu')
			var val = i.vcpu;
		return {
			name : i.name,
			x : val,
			y : parseFloat(i.mean.toFixed(2))
		};
	});
	$('#' + currentTab + '_chart').highcharts({
		chart : {
			type : 'scatter',
			zoomType : 'xy'
		},
		title : {
			text : Tests[test] + ' vs ' + Specs[scatter]
		},
		subtitle : {
			text : 'Showing ' + parallel + ' process results'
		},
		xAxis : {
			title : {
				enabled : true,
				text : Specs[scatter]
			},
			startOnTick : true,
			endOnTick : true,
			showLastLabel : true
		},
		yAxis : {
			title : {
				text : Tests[test]
			}
		},
		legend : {
			layout : 'vertical',
			align : 'left',
			verticalAlign : 'top',
			x : 100,
			y : 30,
			floating : true,
			backgroundColor : '#FFFFFF',
			borderWidth : 1
		},
		plotOptions : {
			scatter : {
				marker : {
					radius : 5,
					states : {
						hover : {
							enabled : true,
							lineColor : 'rgb(100,100,100)'
						}
					}
				},
				states : {
					hover : {
						marker : {
							enabled : false
						}
					}
				},
				tooltip : {
					crosshairs : true,
					pointFormat : '<b>{point.name}<b><br>{point.x} ' + SpecUnits[scatter] + ', {point.y} ' + TestUnits[test],
				}
			}
		},
		series : [{
			name : 'EC2 Paravirtual',
			color : colors[6],
			data : ec2paravirtuals
		}, {
			name : 'Rackspace Paravirtual',
			color : colors[5],
			data : rackparavirtuals
		}, {
			name : 'EC2 HVM',
			color : colors[2],
			data : hvms
		}]
	});
	$('#' + currentTab + '_chart').highcharts().setSize(1000, 600);
}

function plotx264(sorter, limit) {
	var names = x264s().order(sorter).limit(limit).map(function(i) {
		return i.name;
	});
	var ec2times = x264s().order(sorter).limit(limit).map(function(i) {
		var time = (i.cloud == 'EC2') ? i.time : 0;
		return parseFloat(time.toFixed(2));
	});
	var racktimes = x264s().order(sorter).limit(limit).map(function(i) {
		var time = (i.cloud == 'Rackspace') ? i.time : 0;
		return parseFloat(time.toFixed(2));
	});
	var costs = x264s().order(sorter).limit(limit).map(function(i) {
		return parseFloat(i.cost.toFixed(2));
	});
	var timeMeans = x264s().map(function(i) {
		return parseFloat(i.time.toFixed(2));
	});
	var sum = 0;
	for (var i = 0; i < timeMeans.length; i++)
		sum += timeMeans[i];
	var timeMean = sum / timeMeans.length;
	var mean = parseFloat(timeMean.toFixed(2));
	timeMeans = [];
	for ( i = 0; i < names.length; i++)
		timeMeans.push(mean);
	var costMeans = x264s().map(function(i) {
		return parseFloat(i.cost.toFixed(2));
	});
	sum = 0;
	for (var i = 0; i < costMeans.length; i++)
		sum += costMeans[i];
	var costMean = sum / costMeans.length;
	var mean = parseFloat(costMean.toFixed(2));
	costMeans = [];
	for ( i = 0; i < names.length; i++)
		costMeans.push(mean);
	names.reverse();
	ec2times.reverse();
	racktimes.reverse();
	costs.reverse();
	$('#x264_chart').highcharts({
		title : {
			text : 'Best ' + limit + ' x264 benchmark on AWS EC2 and Rackspace'
		},
		subtitle : {
			text : 'Sorted by ' + XSorters[sorter]
		},
		xAxis : {
			categories : names,
			labels : {
				rotation : 45
			}
		},
		yAxis : [{
			title : {
				text : "Time of encoding (second)"
			}
		}, {
			title : {
				text : "Cost of encoding ($)"
			},
			opposite : true
		}],
		legend : {
			layout : 'vertical',
			align : 'left',
			x : 420,
			verticalAlign : 'top',
			y : 80,
			floating : true,
			backgroundColor : '#FFFFFF'
		},
		plotOptions : {
			column : {
				stacking : 'normal'
			}
		},
		tooltip : {
			shared : true
		},
		series : [{
			color : colors[6],
			name : 'EC2: Time of encoding',
			type : 'column',
			yAxis : 0,
			tooltip : {
				valueSuffix : ' s'
			},
			data : ec2times
		}, {
			color : colors[5],
			name : 'Rackspace: Time of encoding',
			type : 'column',
			yAxis : 0,
			tooltip : {
				valueSuffix : ' s'
			},
			data : racktimes
		}, {
			color : colors[4],
			name : 'Encoding Cost',
			type : 'line',
			yAxis : 1,
			tooltip : {
				valuePrefix : '$'
			},
			data : costs
		}, {
			color : colors[3],
			name : 'Encording Time Mean',
			type : 'line',
			yAxis : 0,
			data : timeMeans,
			marker : {
				enabled : false
			}
		}, {
			name : 'Encoding Cost Mean',
			type : 'line',
			yAxis : 1,
			data : costMeans,
			marker : {
				enabled : false
			}
		}]
	});
	$('#x264_chart').highcharts().setSize(1000, 600);
}

function replot() {
	if (-1 < Groups.indexOf(currentTab)) {
		currentGroup = currentTab;
		plotPerGroup(currentParallel, currentGroup, currentTest, currentXSorter);
	} else if ( currentTab in Scatters) {
		currentScatter = Scatters[currentTab];
		plotScatter(currentParallel, currentTest, currentScatter);
	} else if (currentTab == 'unixBench') {
		plotUnixBenchs(currentParallel, currentTest, currentSorter, currentLimit);
	} else if (currentTab == 'x264') {
		plotx264(currentXSorter, currentLimit);
	}
}

$(function() {
	$('#limitter').show();
	$('#grpbtns').hide();
	$('#testbtns').show();
	$('#x264test').hide();
	$('#sortbtns').show();
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	$.getJSON("data/unixbench.json", function(d) {
		$.each(d, function(k, v) {
			unixbenchs.insert({
				test : v['test'],
				mean : v['mean'],
				name : v['name'],
				sd : v['sd'],
				parallel : v['parallel'],
				cloud : v['cloud'],
				price : v['price'],
				priceRatio : v['priceRatio'],
				memory : v['memory'],
				vcpu : v['vcpu']
			});
		});
		plotUnixBenchs(currentParallel, currentTest, currentSorter, currentLimit);
	});
	$.getJSON("data/instances.json", function(d) {
		$.each(d, function(k, v) {
			var tmp = v;
			tmp['name'] = k;
			instances.insert(tmp);
		});
	});
	$.getJSON("data/x264result_new.json", function(d) {
		$.each(d, function(k, v) {
			x264s.insert({
				name : k,
				cloud : v['cloud'],
				memory : v['memory'],
				vcpu : v['vcpu'],
				price : v['price'],
				time : v['time'],
				cost : v['cost']
			});
		});
	});
});

$('a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
	// activated tab
	currentTab = e.target.href.match(/(\w+)$/g)[0];
	if (-1 < Groups.indexOf(currentTab)) {
		// If in the group tabs
		$('#limitter').hide();
		$('#grpbtns').hide();
		$('#testbtns').show();
		$('#x264test').show();
		$('#sortbtns').hide();
		if (currentTest == 'x264') {
			$('#parallelbtns').hide();
			$('#xsortbtns').show();
		} else {
			$('#parallelbtns').show();
			$('#xsortbtns').hide();
		}
		currentGroup = currentTab;
		plotPerGroup(currentParallel, currentGroup, currentTest, currentXSorter);
	} else if (currentTab == 'unixBench') {
		// If in the UnixBench tab
		$('#limitter').show();
		$('#grpbtns').hide();
		$('#testbtns').show();
		$('#x264test').hide();
		$('#sortbtns').show();
		$('#parallelbtns').show();
		$('#xsortbtns').hide();
		if (currentTest == 'x264')
			currentTest = 'index';
		plotUnixBenchs(currentParallel, currentTest, currentSorter, currentLimit);
	} else if (currentTab == 'x264') {
		// If in the x264 tab
		$('#limitter').show();
		$('#grpbtns').hide();
		$('#testbtns').hide();
		$('#x264test').hide();
		$('#sortbtns').hide();
		$('#parallelbtns').hide();
		$('#xsortbtns').show();
		plotx264(currentXSorter, currentLimit);
	} else if ( currentTab in Scatters) {
		// If in the scatter tabs
		$('#limitter').hide();
		$('#grpbtns').hide();
		$('#testbtns').show();
		$('#x264test').hide();
		$('#sortbtns').hide();
		$('#parallelbtns').show();
		$('#xsortbtns').hide();
		if (currentTest == 'x264')
			currentTest = 'index';
		currentScatter = Scatters[currentTab];
		plotScatter(currentParallel, currentTest, currentScatter);
	} else {// If in the Home tab
		$('#limitter').hide();
		$('#grpbtns').show();
		$('#testbtns').hide();
		$('#x264test').hide();
		$('#sortbtns').hide();
		$('#parallelbtns').hide();
		$('#xsortbtns').hide();
		plotGroupVariations(currentGroup);
	}
	//e.relatedTarget; // previous tab
});

// Input from to limit N
$('#limitForm').keypress(function(e) {
	if (e.which == 13) {
		currentLimit = parseInt($('#limitForm').prop('value'));
		if (!(currentLimit === parseInt(currentLimit))) {
			currentLimit = 30;
		}
		if (currentTab == 'x264') {
			plotx264(currentXSorter, currentLimit);
		} else {
			plotUnixBenchs(currentParallel, currentTest, currentSorter, currentLimit);
		}
	}
});

// Group buttons
$('#g_size').on('click', function(e) {
	currentGroup = 'size';
	plotGroupVariations(currentGroup);
});
$('#g_type').on('click', function(e) {
	currentGroup = 'type';
	plotGroupVariations(currentGroup);
});
$('#g_family').on('click', function(e) {
	currentGroup = 'family';
	plotGroupVariations(currentGroup);
});
$('#g_vcpu').on('click', function(e) {
	currentGroup = 'vcpu';
	plotGroupVariations(currentGroup);
});
$('#g_memoryRange').on('click', function(e) {
	currentGroup = 'memoryRange';
	plotGroupVariations(currentGroup);
});
$('#g_priceRange').on('click', function(e) {
	currentGroup = 'priceRange';
	plotGroupVariations(currentGroup);
});

// Sorting buttons
$('#s_priceRatio').on('click', function(e) {
	currentSorter = 'priceRatio';
	replot();
});
$('#s_mean').on('click', function(e) {
	currentSorter = 'mean';
	replot();
});

$('#p_single').on('click', function(e) {
	currentParallel = 'single';
	replot();
});
$('#p_multi').on('click', function(e) {
	currentParallel = 'multi';
	replot();
});

// Test buttons
$('#x264test').on('click', function(e) {
	currentTest = 'x264';
	$('#parallelbtns').hide();
	$('#xsortbtns').show();
	replot();
});
$('#index').on('click', function(e) {
	currentTest = 'index';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#dhrystone').on('click', function(e) {
	currentTest = 'dhrystone';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#double').on('click', function(e) {
	currentTest = 'double';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#execl').on('click', function(e) {
	currentTest = 'execl';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#file256').on('click', function(e) {
	currentTest = 'file256';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#file1024').on('click', function(e) {
	currentTest = 'file1024';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#file4096').on('click', function(e) {
	currentTest = 'file4096';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#pipethru').on('click', function(e) {
	currentTest = 'pipethru';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#pipecs').on('click', function(e) {
	currentTest = 'pipecs';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#process').on('click', function(e) {
	currentTest = 'process';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#shell1').on('click', function(e) {
	currentTest = 'shell1';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#shell8').on('click', function(e) {
	currentTest = 'shell8';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});
$('#overhead').on('click', function(e) {
	currentTest = 'overhead';
	$('#parallelbtns').show();
	$('#xsortbtns').hide();
	replot();
});

// X264 sorting buttons
$('#xs_time').on('click', function(e) {
	currentXSorter = 'time';
	replot();
});
$('#xs_cost').on('click', function(e) {
	currentXSorter = 'cost';
	replot();
});

