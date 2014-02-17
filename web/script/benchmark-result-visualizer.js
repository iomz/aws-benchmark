/*
 benchmark-result-visualizer.js v0.2 (2014-02-04)

 (c)2013-2014 Iori Mizutani(iomz@cisco.com)

 License: https://github.com/iomz/ec2-vid-benchmark/LICENSE

 Parse benchmark json results to TaffyDB and plot the figure with Highcharts.js
 */
var instances = null;
var groupResults = null;
var iperfs = null;
var x264s = TAFFY();
var unixbenchs = TAFFY();
var utils = TAFFY();
var currentLimit = 30;
var currentTab = 'x264';
var currentTest = "x264";
var currentSorter = "balance";
var currentGroup = "vcpu";
var currentOrder = ' desc';
var Dsts = ['nvirginia', 'oregon'];
var colors = Highcharts.getOptions().colors;
var Metrics = {
	'cost' : 'Cost',
	'cost_z' : 'Z Score of Cost',
	'perf' : 'Performance',
	'perf_err' : 'SD of Performance',
	'perf_z' : 'Z Score of Performance',
	'balance' : 'Balance'
};
var Utils = ['memUtil', 'vcpuUtil'];
var UtilDetails = ['memUtilTime', 'vcpuUtilCore', 'vcpuUtilTime'];
var Groups = ['size', 'type', 'family', 'vcpu', 'memoryRange', 'priceRange'];
var Sorters = {
	'perf' : "Actual time elapsed",
	'cost' : "Cost necessary to complete x264 benchmark",
	'balance' : "The sum of Z Score of time and cost"
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

function plotx264(xsorter, limit, order) {
	var sorter = xsorter;
	if (sorter == 'perf') {
		var titleSuffix = 'in Performance';
		sorter = 'time';
	} else if (sorter == 'cost') {
		var titleSuffix = 'in Cost';
	} else {
		var titleSuffix = 'in Balance';
	}
	if (xsorter == 'balance')
		var titleOrder = (order != ' asec') ? 'Best ' : 'Worst ';
	else
		var titleOrder = (order == ' asec') ? 'Best ' : 'Worst ';
	var balancedName = 'Balanced Score';
	var ec2ColName = 'EC2: ' + balancedName;
	var rackColName = 'Rackspace: ' + balancedName;
	var etColName = 'Elastic Transcoder ' + balancedName
	var names = x264s().order(sorter + order).limit(limit).map(function(i) {
		return i.name;
	});
	var costs = x264s().order(sorter + order).limit(limit).map(function(i) {
		var val = i.cost;
		return parseFloat(val.toFixed(2));
	});
	var minTime = x264s().order('time').limit(1).map(function(i) {
	return i.time;
	})[0];
	var timeRatios = x264s().order(sorter + order).limit(limit).map(function(i) {
		var val = i.time / minTime;
		return parseFloat(val.toFixed(2));
	});
	var ec2Col = x264s().order(sorter + order).limit(limit).map(function(i) {
		if (i.cloud == 'ElasticTranscoder') {
			return 0;
		}
		var val = i.balance;
		return (i.cloud == 'EC2') ? parseFloat(val.toFixed(2)) : 0;
	});
	var rackCol = x264s().order(sorter + order).limit(limit).map(function(i) {
		if (i.cloud == 'ElasticTranscoder') {
			return 0;
		}
		var val = i.balance;
		return (i.cloud == 'Rackspace') ? parseFloat(val.toFixed(2)) : 0;
	});
	var etCol = x264s().order(sorter + order).limit(limit).map(function(i) {
		if (i.cloud == 'ElasticTranscoder') {
			return parseFloat(i.balance.toFixed(2));
		}
		return 0;
	});
	var series = [{
		color : colors[6],
		name : ec2ColName,
		type : 'column',
		yAxis : 0,
		data : ec2Col
	}, {
		color : colors[5],
		name : rackColName,
		type : 'column',
		yAxis : 0,
		data : rackCol
	}, {
		color : colors[7],
		name : etColName,
		type : 'column',
		yAxis : 0,
		data : etCol
	}, {
		color : colors[3],
		name : 'Encoding Cost [$]',
		type : 'line',
		yAxis : 1,
		data : costs
	}, {
		color : colors[4],
		name : 'Time Ratio compared by Elastic Transcoder',
		type : 'spline',
		yAxis : 2,
		data : timeRatios,
		valuePrefix : 'x'
	}];
	names.reverse();
	costs.reverse();
	timeRatios.reverse();
	ec2Col.reverse();
	rackCol.reverse();
	etCol.reverse();
	/* If available, plot the SD for the cols */
	if (sorter == 'cost') {
		var sds = x264s().order(sorter + order).limit(limit).map(function(i) {
			var mean = i.cost;
			var sd = i.costSd;
			var low = (mean - sd).toFixed(3);
			var high = (mean + sd).toFixed(3);
			return [parseFloat(low), parseFloat(high)];
		});
		sds.reverse();
		series.push({
			color : colors[2],
			name : 'Error in Encoding Cost',
			yAxis : 1,
			data : null,
			valuePrefix : '$'

		});
		series.push({
			color : colors[2],
			name : 'Error in Encoding Cost',
			type : 'errorbar',
			yAxis : 1,
			data : sds,
			valuePrefix : '$'
		});
	}
	$('#x264_chart').highcharts({
		title : {
			text : titleOrder + limit + ' x264 Encoding ' + titleSuffix
		},
		xAxis : {
			categories : names,
			labels : {
				rotation : 45
			}
		},
		yAxis : [{
			title : {
				text : balancedName
			}
		}, {
			labels : {
				style : {
					color : colors[3]
				}
			},
			opposite : true,
			showEmpty : false,
			title : {
				text : 'Encoding Cost ($)',
				style : {
					color : colors[3]
				}
			}
		}, {
			labels : {
				style : {
					color : colors[4]
				}
			},
			opposite : true,
			showEmpty : false,
			title : {
				text : 'Time Ratio compared by c3.8xlarge_hvm',
				style : {
					color : colors[4]
				}
			}
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
			},
			errorbar : {
				lineWidth : 3,
				valuePrefix : '$'
			},
			line : {
				tooltip : {
					valuePrefix : '$'
				}
			},
			spline : {
				tooltip : {
					valuePrefix : 'x'
				}
			}
		},
		tooltip : {
			shared : true
		},
		series : series
	});
	$('#x264_chart').highcharts().setSize(1000, 600);
}

function plotUtils(util, limit, order) {
	var titleOrder = (order == ' desc') ? 'Best ' : 'Worst ';
	var yAxisData = [];
	var seriesData = [];
	var names = utils().order(util + order).limit(limit).map(function(i) {
		return i.name;
	});
	names.reverse();
	yAxisData.push({
		max : 100,
		min : 0,
		opposite : true,
		title : {
			text : 'Utilization (%)'
		}
	});
	// EC2 column
	var yDataEC2 = utils().order(util + order).limit(limit).map(function(i) {
		if (util == 'memUtil')
			var val = i.memUtil;
		else if (util == 'vcpuUtil')
			var val = i.vcpuUtil;
		return (i.cloud == 'EC2') ? parseFloat(val.toFixed(2)) : 0;
	});
	yDataEC2.reverse();
	seriesData.push({
		color : colors[6],
		name : 'EC2: Utilization (%)',
		data : yDataEC2,
		yAxis : 0
	});
	// Rackspace column
	var yDataRackspace = utils().order(util + order).limit(limit).map(function(i) {
		if (util == 'memUtil')
			var val = i.memUtil;
		else if (util == 'vcpuUtil')
			var val = i.vcpuUtil;
		return (i.cloud == 'Rackspace') ? parseFloat(val.toFixed(2)) : 0;
	});
	yDataRackspace.reverse();
	seriesData.push({
		color : colors[5],
		name : 'Rackspace: Utilization (%)',
		data : yDataRackspace,
		yAxis : 0
	});
	if (util == 'memUtil') {
		var utilName = 'Memory utilization';
		// Memory Size
		var memSizes = utils().order(util + order).limit(limit).map(function(i) {
			return {
				name : i.name,
				y : parseFloat(i.memSize.toFixed(2))
			};
		});
		memSizes.reverse();
		yAxisData.push({
			title : {
				text : 'Memory Size (GB)',
				style : {
					color : '#1aadce'
				}
			}
		});
		seriesData.push({
			color : '#1aadce',
			data : memSizes,
			name : 'Memory Size (GB)',
			step : true,
			type : 'line',
			yAxis : 1,
		});
		var memUseds = utils().order(util + order).limit(limit).map(function(i) {
			return parseFloat(((i.memUtil / 100.0) * i.memSize).toFixed(2));
		});
		memUseds.reverse();
		yAxisData.push({
			title : {
				text : 'Memory Used (GB)',
				style : {
					color : '#252525'
				}
			},
			opposite : true
		});
		seriesData.push({
			color : '#252525',
			data : memUseds,
			name : 'Memory Used (GB)',
			type : 'line',
			yAxis : 2
		});

	} else if (util == 'vcpuUtil') {
		var utilName = 'vCPU utilization';
		// Number of vCPUs
		var nCores = utils().order(util + order).limit(limit).map(function(i) {
			var size = 0, key;
			for (key in i.cuCore)
			size++;
			return {
				name : i.name,
				y : size
			};
		});
		nCores.reverse();
		yAxisData.push({
			title : {
				text : 'Number of vCPU',
				style : {
					color : '#2DD700'
				}
			}
		});
		seriesData.push({
			color : '#2DD700',
			data : nCores,
			name : 'Number of vCPU',
			step : true,
			type : 'line',
			yAxis : 1
		});
	}
	var titleName = titleOrder + limit + ' ' + utilName;
	var el = '#' + util + '_chart';
	$(el).highcharts({
		chart : {
			type : 'column'
		},
		title : {
			text : titleName
		},
		xAxis : {
			categories : names,
			labels : {
				rotation : 45
			},
		},
		yAxis : yAxisData,
		legend : {
			align : "left",
			backgroundColor : '#FFF',
			floating : true,
			layout : "vertical",
			verticalAlign : "top",
			x : 700,
			y : 50
		},
		tooltip : {
			shared : true
		},
		plotOptions : {
			column : {
				stacking : 'normal'
			},
			series : {
				borderWidth : 0
			}
		},
		series : seriesData
	});
	$(el).highcharts().setSize(1000, 600);
}

function plotUtilDetails(util, limit, order) {
	var titleOrder = (order == ' desc') ? 'Best ' : 'Worst ';
	if (util == 'vcpuUtilCore') {
		var resource = 'vcpuUtil';
		var utilName = 'vCPU utilization per cores';
		var yData = utils().order(resource + order).limit(limit).map(function(i) {
			return {
				color : (i.cloud == 'EC2') ? colors[6] : colors[5],
				drilldown : i.name,
				name : i.name,
				y : parseFloat(i.vcpuUtil.toFixed(2))
			};
		});
		var yAxisData = [];
		var seriesData = [];
		var drilldownData = {
			series : utils().order(resource + order).limit(limit).map(function(i) {
				var members = utils({name:i.name}).map(function(j) {
				var cores = [];
				for ( k in j.cuCore ) {
				cores.push({
				name : k,
				y : j.cuCore[k]['mean']
				});
				}
				return cores;
				})[0];
				return {
					name : i.name,
					id : i.name,
					data : members
				};
			})
		};
	} else if (util == 'vcpuUtilTime') {
		var resource = 'vcpuUtil';
		var utilName = 'vCPU utilization per time frame';
		var yData = utils().order(resource + order).limit(limit).map(function(i) {
			return {
				color : (i.cloud == 'EC2') ? colors[6] : colors[5],
				drilldown : i.name,
				name : i.name,
				y : parseFloat(i.vcpuUtil.toFixed(2))
			};
		});
		var yAxisData = [];
		var seriesData = [];
		var drilldownData = {
			series : utils().order(resource + order).limit(limit).map(function(i) {
				var members = utils({name:i.name}).map(function(j) {
				var times = [];
				for (k in j.cuTime ) {
				times.push({
				name : k,
				y : j.cuTime[k]
				});
				}
				return times;
				})[0];
				return {
					name : i.name,
					id : i.name,
					data : members
				};
			})
		};
	} else if (util == 'memUtilTime') {
		var resource = 'memUtil';
		var utilName = 'Memory utilization per time frame';
		var yData = utils().order(resource + order).limit(limit).map(function(i) {
			return {
				color : (i.cloud == 'EC2') ? colors[6] : colors[5],
				drilldown : i.name,
				name : i.name,
				y : parseFloat(i.memUtil.toFixed(2))
			};
		});
		var yAxisData = [];
		var seriesData = [];
		var drilldownData = {
			series : utils().order(resource + order).limit(limit).map(function(i) {
				var members = utils({name:i.name}).map(function(j) {
				var times = [];
				for (k in j.muTime ) {
				times.push({
				name : k,
				y : j.muTime[k]
				});
				}
				return times;
				})[0];
				return {
					name : i.name,
					id : i.name,
					data : members
				};
			})
		};
	}

	var titleName = titleOrder + limit + ' ' + utilName;
	var names = utils().order(resource + order).limit(limit).map(function(i) {
		return i.name;
	});
	yData.reverse();
	names.reverse();
	yAxisData.push({
		max : 100,
		min : 0,
		opposite : true,
		title : {
			text : 'Utilization (%)'
		}
	});
	seriesData.push({
		name : 'Utilization (%)',
		data : yData,
	});
	var el = '#' + util + '_chart';
	$(el).highcharts({
		chart : {
			type : 'column'
		},
		title : {
			text : titleName
		},
		subtitle : {
			text : 'Click an instance to drilldown'
		},
		xAxis : {
			labels : {
				rotation : 45
			},
			type : 'category',
		},
		yAxis : yAxisData,
		legend : {
			enabled : false
		},
		tooltip : {
			shared : true
		},
		plotOptions : {
			series : {
				borderWidth : 0
			}
		},
		series : seriesData,
		drilldown : drilldownData
	});
	$(el).highcharts().setSize(1000, 600);
}

function plotPerGroup(group, test, metric) {
	var groupDataFile = "data/group/" + group + ".json";
	$.getJSON(groupDataFile, function(d) {
		groupResults = TAFFY();
		$.each(d, function(k, v) {
			var members = [];
			for (var i in v[test]['members']) {
				members.push({
					name : i,
					y : v[test]['members'][i][metric]
				});
			}
			groupResults.insert({
				'group' : k,
				'min' : v[test]['min' + metric[0]],
				'max' : v[test]['max' + metric[0]],
				'mean' : v[test]['mean' + metric[0]],
				'members' : members
			});
		});
		var el = "#" + group + "_chart";
		$(el).highcharts({
			chart : {
				type : 'column'
			},
			title : {
				text : Tests[test]
			},
			subtitle : {
				text : 'Click a group to drilldown'
			},
			xAxis : {
				type : 'category'
			},
			yAxis : {
				title : {
					text : Metrics[metric]
				}
			},
			legend : {
				enabled : false
			},
			tooltip : {
				shared : true
			},
			plotOptions : {
				series : {
					borderWidth : 0
				}
			},
			series : [{
				colorByPoint : true,
				name : Metrics[metric],
				yAxis : 0,
				data : groupResults().order('mean desc').map(function(i) {
					return {
						drilldown : i.group,
						name : i.group,
						y : i.mean
					};
				})
			}],
			drilldown : {
				series : groupResults().map(function(i) {
					return {
						name : i.group,
						id : i.group,
						data : i.members
					};
				})
			}
		});
		$(el).highcharts().setSize(1000, 300);
		var el = "#" + group + "_desc_chart";
		$(el).highcharts({
			title : {
				text : null
			},
			xAxis : {
				categories : groupResults().order('mean desc').map(function(i) {
					return i.group;
				})
			},
			yAxis : [{
				title : {
					text : Metrics[metric]
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
				data : groupResults().order('mean desc').map(function(i) {
					return [i.min, i.max];
				}),
				yAxis : 0
			}, {
				color : colors[1],
				name : 'Number of instances',
				type : 'line',
				data : groupResults().order('mean desc').map(function(i) {
					return i.members.length;
				}),
				yAxis : 1
			}],
		});
		$(el).highcharts().setSize(1040, 300);
	});
}

function plotUnixBenchs(test, sorter, limit, order) {
	if (sorter == 'perf') {
		var titleSuffix = ' in Performance';
	} else if (sorter == 'cost') {
		var titleSuffix = ' in Cost';
	} else {
		var titleSuffix = ' in Balance';
	}
	if (test != 'index')
		var tName = Tests[test] + ' (' + TestUnits[test] + ')';
	else
		var tName = Tests[test];
	var titleOrder = (order == ' desc') ? 'Best ' : 'Worst ';
	var data = unixbenchs().order(test + '_' + sorter + order).limit(limit).map(function(i) {
		return i;
	});
	var names = [];
	var ec2s = [];
	var racks = [];
	var costs = [];
	var perfs = [];
	var perfErrs = [];
	for (var i = 0; i < limit; i++) {
		names.push(data[i]['name']);
		if (data[i]['cloud'] == 'EC2') {
			ec2s.push(parseFloat(data[i][test + '_balance'].toFixed(2)));
			racks.push(0);
		} else {
			ec2s.push(0);
			racks.push(parseFloat(data[i][test + '_balance'].toFixed(2)));
		}
		costs.push(parseFloat(data[i][test + '_cost_z'].toFixed(2)));
		perfs.push(parseFloat(data[i][test + '_perf'].toFixed(2)));
		var low = data[i][test + '_perf'] - data[i][test + '_perf_err']
		var high = data[i][test + '_perf'] + data[i][test + '_perf_err']
		perfErrs.push([parseFloat(low.toFixed(2)), parseFloat(high.toFixed(2))]);
	}
	// Reverse the order to show the plot collectly
	names.reverse();
	ec2s.reverse();
	racks.reverse();
	costs.reverse();
	perfs.reverse();
	perfErrs.reverse();
	var series = [{
		color : colors[6],
		name : 'EC2 Balanced Score',
		type : 'column',
		yAxis : 0,
		data : ec2s
	}, {
		color : colors[5],
		name : 'Rackspace Balanced Score',
		type : 'column',
		yAxis : 0,
		data : racks
	}, {
		color : colors[3],
		name : 'Cost',
		type : 'line',
		yAxis : 2,
		data : costs
	}, {
		color : colors[4],
		name : 'Performance',
		type : 'line',
		yAxis : 1,
		data : perfs
	}, {
		color : colors[2],
		name : 'Error in Performance',
		yAxis : 1,
		data : null
	}, {
		color : colors[2],
		name : 'Error in Performance',
		type : 'errorbar',
		yAxis : 1,
		data : perfErrs
	}];
	$("#unixBench_chart").highcharts({
		title : {
			text : titleOrder + limit + ' ' + Tests[test] + titleSuffix,
			x : -20 //center
		},
		xAxis : {
			categories : names,
			labels : {
				rotation : 45
			}
		},
		yAxis : [{
			title : {
				text : 'Blanaced Score'
			}
		}, {
			title : {
				style : {
					color : colors[4]
				},
				text : 'Performance (' + TestUnits[test] + ')'
			},
			opposite : true
		}, {
			title : {
				style : {
					color : colors[3]
				},
				text : 'Cost (Z Score of ' + TestUnits[test] + '/$0.01)'
			},
			opposite : true
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

function plotScatter(test, metric) {
	if (test != 'x264') {
		var data = unixbenchs().map(function(i) {
			return i;
		});
		var cost = test + '_' + 'cost_z';
		var perf = test + '_' + 'perf_z';
		var alpha = 1;
	} else {
		var data = x264s().map(function(i) {
			return i;
		});
		var cost = 'costZ';
		var perf = 'timeZ';
		var alpha = -1;
	}
	var ec2paravirtuals = [];
	var rackparavirtuals = [];
	var hvms = [];
	for (var i = 0; i < data.length; i++) {
		if (data[i]['cloud'] == 'EC2') {
			if (-1 < data[i]['name'].indexOf('hvm')) {
				hvms.push({
					name : data[i]['name'],
					x : parseFloat(data[i][cost].toFixed(2)),
					y : parseFloat(alpha * data[i][perf].toFixed(2))
				});
			} else {
				ec2paravirtuals.push({
					name : data[i]['name'],
					x : parseFloat(data[i][cost].toFixed(2)),
					y : parseFloat(alpha * data[i][perf].toFixed(2))
				});
			}
		} else {
			rackparavirtuals.push({
				name : data[i]['name'],
				x : parseFloat(data[i][cost].toFixed(2)),
				y : parseFloat(alpha * data[i][perf].toFixed(2))
			});
		}
	}
	$('#' + currentTab + '_chart').highcharts({
		chart : {
			type : 'scatter',
			zoomType : 'xy'
		},
		title : {
			text : Tests[test] + ': Performance vs. Cost'
		},
		xAxis : {
			title : {
				enabled : true,
				text : 'Cost Z Score'
			},
			startOnTick : true,
			endOnTick : true,
			showLastLabel : true
		},
		yAxis : {
			title : {
				text : 'Performance Z Score'
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
					pointFormat : '<b>{point.name}<b><br>{point.x} , {point.y} ' + TestUnits[test],
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

function plotIperf(dst) {
	if (dst == 'nvirginia') {
		var dstName = 'N.Virginia';
		var yMax = 10000;
	} else {
		var dstName = 'Oregon';
		var yMax = 3000;
	}
	$.getJSON("data/iperf.json", function(d) {
		iperfs = TAFFY();
		$.each(d, function(k, v) {
			iperfs.insert({
				bw : v,
				path : k
			});
		});
		var cc = 0;
		var seriesData = iperfs({
			path : {
				like : dstName
			}
		}).map(function(i) {
			cc++;
			var bwArr = [];
			for (var d = 0; d < i.bw.length; d++) {
				bwArr.push([Date.UTC(i.bw[d]['year'], i.bw[d]['month'] - 1, i.bw[d]['day'], i.bw[d]['hour'], i.bw[d]['minute']), i.bw[d]['bandwidth']]);
			}
			return {
				color : colors[cc],
				data : bwArr,
				name : i.path,
				step : true
			};
		});
		$('#' + dst + '_chart').highcharts({
			chart : {
				type : 'line',
				zoomType : 'x'
			},
			title : {
				text : 'Iperf measurement betweenn N.Virginia and ' + dstName
			},
			xAxis : {
				title : {
					text : 'Time in EST'
				},
				type : 'datetime',
				maxZoom : 6 * 3600 * 1000
			},
			yAxis : {
				max : yMax,
				min : 0,
				title : {
					text : 'Bandwidth (Mbits/sec)'
				}
			},
			legend : {
			},
			series : seriesData
		});
		$('#' + dst + '_chart').highcharts().setSize(1000, 600);
	});
}

function replot() {
	if (-1 < Groups.indexOf(currentTab)) {
		currentGroup = currentTab;
		plotPerGroup(currentGroup, currentTest, currentSorter);
	} else if (-1 < Utils.indexOf(currentTab)) {
		plotUtils(currentTab, currentLimit, currentOrder);
	} else if (-1 < UtilDetails.indexOf(currentTab)) {
		plotUtilDetails(currentTab, currentLimit, currentOrder);
	} else if (currentTab == 'scatterVirt') {
		plotScatter(currentTest, currentSorter);
	} else if (currentTab == 'unixBench') {
		plotUnixBenchs(currentTest, currentSorter, currentLimit, currentOrder);
	} else if (currentTab == 'x264') {
		plotx264(currentSorter, currentLimit, currentOrder);
	}
}

$(function() {
	$('#limitter').show();
	$('#grpbtns').hide();
	$('#testbtns').hide();
	$('#x264test').hide();
	$('#xsortbtns').show();
	$('#togglebtns').show();
	$.getJSON("data/x264_inv.json", function(d) {
		$.each(d, function(k, v) {
			x264s.insert({
				name : k,
				cloud : v['cloud'],
				time : v['time'],
				timeSd : v['time_sd'],
				cost : v['cost'],
				costSd : v['cost_sd'],
				timeZ : v['time_inv_z'],
				costZ : v['cost_z'],
				balance : v['balance']
			});
		});
		plotx264(currentSorter, currentLimit, currentOrder);
	});
	$.getJSON("data/util.json", function(d) {
		$.each(d, function(k, v) {
			utils.insert({
				name : k,
				cloud : v['cloud'],
				memSize : v['memory_size'],
				memUtil : v['memory_utl'],
				muTime : v['memory_utl_time'],
				vcpuUtil : v['cpu_utl'],
				cuCore : v['cpu_utl_core'],
				cuTime : v['cpu_utl_time'],
				ioReq : v['ioreq']
			});
		});
	});
	$.getJSON("data/unixbench.json", function(d) {
		$.each(d, function(k, v) {
			var i = {
				name : k,
				cloud : v['cloud'],
			};
			for (var t in Tests) {
				if (t != 'x264') {
					for (var m in Metrics)
					i[t + '_' + m] = v[t][m];
				}
			}
			unixbenchs.insert(i);
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
		$('#togglebtns').hide();
		$('#xsortbtns').show();
		currentGroup = currentTab;
		plotPerGroup(currentGroup, currentTest, currentSorter);
	} else if (-1 < Utils.indexOf(currentTab)) {
		// If in the util tab
		$('#limitter').show();
		$('#grpbtns').hide();
		$('#testbtns').hide();
		$('#x264test').hide();
		$('#xsortbtns').hide();
		$('#togglebtns').show();
		currentOrder = ' desc';
		plotUtils(currentTab, currentLimit, currentOrder);
	} else if (-1 < UtilDetails.indexOf(currentTab)) {
		// If in the util tab
		$('#limitter').show();
		$('#grpbtns').hide();
		$('#testbtns').hide();
		$('#x264test').hide();
		$('#xsortbtns').hide();
		$('#togglebtns').show();
		currentOrder = ' desc';
		plotUtilDetails(currentTab, currentLimit, currentOrder);
	} else if (currentTab == 'unixBench') {
		// If in the UnixBench tab
		$('#limitter').show();
		$('#grpbtns').hide();
		$('#testbtns').show();
		$('#x264test').hide();
		$('#xsortbtns').show();
		$('#togglebtns').show();
		if (currentTest == 'x264') {
			currentTest = 'index';
		}
		plotUnixBenchs(currentTest, currentSorter, currentLimit, currentOrder);
	} else if (currentTab == 'x264') {
		// If in the x264 tab
		$('#limitter').show();
		$('#grpbtns').hide();
		$('#testbtns').hide();
		$('#x264test').hide();
		$('#xsortbtns').show();
		$('#togglebtns').show();
		plotx264(currentSorter, currentLimit, currentOrder);
	} else if (currentTab == 'scatterVirt') {
		// If in the scatter tabs
		$('#limitter').hide();
		$('#grpbtns').hide();
		$('#testbtns').show();
		$('#x264test').show();
		$('#togglebtns').hide();
		$('#xsortbtns').hide();
		plotScatter(currentTest, currentSorter);
	} else if (-1 < Dsts.indexOf(currentTab)) {
		// If in the scatter tabs
		$('#limitter').hide();
		$('#grpbtns').hide();
		$('#testbtns').hide();
		$('#x264test').hide();
		$('#togglebtns').hide();
		$('#xsortbtns').hide();
		plotIperf(currentTab);
	} else {// If in the Home tab
		;
	}
	//e.relatedTarget; // previous tab
});

// Input form for instance info
$('instanceForm').keypress(function(e) {
	$('#popover').popover('show');
});

// Input form to limit N
$('#limitForm').keypress(function(e) {
	if (e.which == 13) {
		currentLimit = parseInt($('#limitForm').prop('value'));
		if (!(currentLimit === parseInt(currentLimit))) {
			currentLimit = 30;
		}
		if (currentTab == 'x264') {
			plotx264(currentSorter, currentLimit, currentOrder);
		} else if (-1 < UtilDetails.indexOf(currentTab)) {
			plotUtilDetails(currentTab, currentLimit, currentOrder);
		} else if (-1 < Utils.indexOf(currentTab)) {
			plotUtils(currentTab, currentLimit, currentOrder);
		} else if (currentTab == 'unixBench') {
			plotUnixBenchs(currentTest, currentSorter, currentLimit, currentOrder);
		}
	}
});

// Test buttons
$('#x264test').on('click', function(e) {
	currentTest = 'x264';
	replot();
});
$('#index').on('click', function(e) {
	currentTest = 'index';
	replot();
});
$('#dhrystone').on('click', function(e) {
	currentTest = 'dhrystone';
	replot();
});
$('#double').on('click', function(e) {
	currentTest = 'double';
	replot();
});
$('#execl').on('click', function(e) {
	currentTest = 'execl';
	replot();
});
$('#file256').on('click', function(e) {
	currentTest = 'file256';
	replot();
});
$('#file1024').on('click', function(e) {
	currentTest = 'file1024';
	replot();
});
$('#file4096').on('click', function(e) {
	currentTest = 'file4096';
	replot();
});
$('#pipethru').on('click', function(e) {
	currentTest = 'pipethru';
	replot();
});
$('#pipecs').on('click', function(e) {
	currentTest = 'pipecs';
	replot();
});
$('#process').on('click', function(e) {
	currentTest = 'process';
	replot();
});
$('#shell1').on('click', function(e) {
	currentTest = 'shell1';
	replot();
});
$('#shell8').on('click', function(e) {
	currentTest = 'shell8';
	replot();
});
$('#overhead').on('click', function(e) {
	currentTest = 'overhead';
	replot();
});

// Metrics buttons
$('#s_perf').on('click', function(e) {
	currentSorter = 'perf';
	replot();
});
$('#s_cost').on('click', function(e) {
	currentSorter = 'cost';
	replot();
});
$('#s_balance').on('click', function(e) {
	currentSorter = 'balance';
	replot();
});

// Toggle button
$('#toggleOrder').on('click', function(e) {
	if (currentOrder == ' asec')
		currentOrder = ' desc';
	else
		currentOrder = ' asec';
	replot();
});

