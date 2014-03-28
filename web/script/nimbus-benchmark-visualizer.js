/*
 nimbus-benchmark-visualizer.js v0.2 (2014-03-27)

 (c)2014 Iori Mizutani(iomz@cisco.com)

 License: https://github.com/iomz/cloud-bench/LICENSE

 Parse benchmark json results to TaffyDB and plot the figure with Highcharts.js
 */
var instances = null;
var x264s = TAFFY();
var unixbenchs = TAFFY();
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

function plotx264() {
	var ec2ColName = 'EC2';
	var rackColName = 'Rackspace';
	var etColName = 'Elastic Transcoder';
	var niColName = 'Nimbus';
	var names = x264s().order('time').map(function(i) {
		var name = i.name;
		if (-1 < name.indexOf('nimbus')) {
			name = name.replace("_paravirtual", "");
		}
		return name;
	});
	var costs = x264s().order('time').map(function(i) {
		var val = i.cost;
		return parseFloat(val.toFixed(2));
	});
	var minTime = x264s().order('time').limit(1).map(function(i) {
	return i.time;
	})[0];
	var timeRatios = x264s().order('time').map(function(i) {
		var val = i.time / minTime;
		return parseFloat(val.toFixed(2));
	});
	var balances = x264s().order('time').map(function(i) {
		return parseFloat(i.balance.toFixed(2));
	});
	var ec2Col = x264s().order('time').map(function(i) {
		return (i.cloud == 'EC2') ? parseFloat(i.time.toFixed(2)) : 0;
	});
	var rackCol = x264s().order('time').map(function(i) {
		return (i.cloud == 'Rackspace') ? parseFloat(i.time.toFixed(2)) : 0;
	});
	var etCol = x264s().order('time').map(function(i) {
		return (i.cloud == 'ElasticTranscoder') ? parseFloat(i.time.toFixed(2)) : 0;
	});
	var niCol = x264s().order('time').map(function(i) {
		return (i.cloud == 'Nimbus') ? parseFloat(i.time.toFixed(2)) : 0;
	});
	names.reverse();
	costs.reverse();
	balances.reverse();
	ec2Col.reverse();
	rackCol.reverse();
	etCol.reverse();
	niCol.reverse();
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
		color : colors[8],
		name : etColName,
		type : 'column',
		yAxis : 0,
		data : etCol
	}, {
		color : colors[7],
		name : niColName,
		type : 'column',
		yAxis : 0,
		data : niCol
	}, {
		color : colors[3],
		name : 'Encoding Cost [$]',
		type : 'line',
		yAxis : 1,
		data : costs
	}, {
		color : colors[4],
		name : 'Balanced Score',
		type : 'line',
		yAxis : 2,
		data : balances
	}];
	$('#x264_chart').highcharts({
		title : {
			text : 'x264 Encoding time'
		},
		xAxis : {
			categories : names,
			labels : {
				rotation : 45
			}
		},
		yAxis : [{
			title : {
				text : 'Encoding time(s)'
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
				text : 'Balanced Score',
				style : {
					color : colors[4]
				}
			}
		}],
		legend : {
			layout : 'vertical',
			align : 'left',
			x : 100,
			verticalAlign : 'top',
			y : -10,
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

function plotUnixBenchs(test) {
	var sorter = 'perf';
	if (test != 'index')
		var tName = Tests[test] + ' (' + TestUnits[test] + ')';
	else
		var tName = Tests[test];
	var data = unixbenchs().order(test + '_' + sorter).map(function(i) {
		return i;
	});
	var names = [];
	var ec2s = [];
	var racks = [];
	var nimbuses = [];
	var costs = [];
	var balances = [];
	var perfErrs = [];
	for (var i = 0; i < data.length; i++) {
		var name = data[i]['name'];
		if (-1 < name.indexOf('nimbus')) {
			name = name.replace("_paravirtual", "");
		}
		names.push(name);
		if (data[i]['cloud'] == 'EC2') {
			ec2s.push(parseFloat(data[i][test + '_perf'].toFixed(2)));
			racks.push(0);
			nimbuses.push(0);
		} else if (data[i]['cloud'] == 'Rackspace') {
			ec2s.push(0);
			racks.push(parseFloat(data[i][test + '_perf'].toFixed(2)));
			nimbuses.push(0);
		} else if (data[i]['cloud'] == 'Nimbus') {
			ec2s.push(0);
			racks.push(0);
			nimbuses.push(parseFloat(data[i][test + '_perf'].toFixed(2)));
		} else {
			;
		}
		costs.push(parseFloat(data[i][test + '_cost'].toFixed(2)));
		balances.push(parseFloat(data[i][test + '_balance'].toFixed(2)));
		var low = data[i][test + '_perf'] - data[i][test + '_perf_err'];
		var high = data[i][test + '_perf'] + data[i][test + '_perf_err'];
		perfErrs.push([parseFloat(low.toFixed(2)), parseFloat(high.toFixed(2))]);
	}
	// Reverse the order to show the plot collectly
	//names.reverse();
	//ec2s.reverse();
	//nimbuses.reverse();
	//costs.reverse();
	//balances.reverse();
	//perfErrs.reverse();
	var series = [{
		color : colors[6],
		name : 'EC2',
		type : 'column',
		yAxis : 0,
		data : ec2s
	}, {
		color : colors[5],
		name : 'Rackspace',
		type : 'column',
		yAxis : 0,
		data : racks
	}, {
		color : colors[7],
		name : 'Nimbus',
		type : 'column',
		yAxis : 0,
		data : nimbuses
	}, {
		color : colors[3],
		name : 'Price ($/hr)',
		type : 'line',
		yAxis : 2,
		data : costs
	}, {
		color : colors[4],
		name : 'Balanced Score',
		type : 'line',
		yAxis : 1,
		data : balances
	}, {
		color : colors[2],
		name : 'Error in Performance',
		yAxis : 0,
		data : null
	}, {
		color : colors[2],
		name : 'Error in Performance',
		type : 'errorbar',
		yAxis : 0,
		data : perfErrs
	}];
	$("#" + test + "_chart").highcharts({
		title : {
			text : Tests[test] + ' (UnixBench)',
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
				text : 'Performance (' + TestUnits[test] + ')'
			}
		}, {
			title : {
				style : {
					color : colors[4]
				},
				text : 'Balanced Score'
			},
			opposite : true
		}, {
			title : {
				style : {
					color : colors[3]
				},
				text : 'Price ($/hr)'
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
			x : 100,
			y : -10
		},
		series : series
	});
	$("#" + test + "_chart").highcharts().setSize(1000, 600);
}

$(function() {
	$.getJSON("data/x264_nimbus.json", function(d) {
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
		plotx264();
	});
	$.getJSON("data/unixbench_nimbus.json", function(d) {
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
		plotUnixBenchs('index');
		plotUnixBenchs('double');
		plotUnixBenchs('pipecs');
	});
});
