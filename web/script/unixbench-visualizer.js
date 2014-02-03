/*
 unixbench-visualizer.js v0.1 (2014-01-29)

 (c)2013-2014 Iori Mizutani(iomz@cisco.com)

 License: https://github.com/iomz/ec2-vid-benchmark/LICENSE

 Parse unixbench result json file to TAFFY DB and plot the figure with Highcharts.js
 */
var instances = TAFFY();
var logs = TAFFY();
var currentBestLimit = 30;
var currentTab = 'home';
var currentTest = "index";
var currentParallel = "multi";
var currentSorter = "mean";
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
}
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
	"index" : "System Benchmarks Index Score"
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
	"index" : ""
};

function drawGraph(el, title, subtitle, xaxis, rot, yaxis, tool, series) {
	$(el).highcharts({
		title : {
			text : title,
			x : -20 //center
		},
		subtitle : {
			text : subtitle,
			x : -20
		},
		xAxis : {
			categories : xaxis,
			labels : {
				rotation : rot
			}
		},
		yAxis : yaxis,
		tooltip : tool,
		plotOptions : {
			column : {
				stacking : 'normal'
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
}

function plotPerGroup(parallel, group, test) {
	$.getJSON("data/ub_" + group + "_" + test + "_" + parallel + ".json", function(d) {
		var groupResults = TAFFY();
		$.each(d, function(k, v) {
			groupResults.insert({
				'test' : test,
				'parallel' : v['parallel'],
				'name' : k,
				'range' : [v['min'], v['max']],
				'mean' : v['mean'],
				'num' : v['num'],
				'cloud' : v['cloud'],
			});
		});
		if (test != 'index')
			var tname = Tests[test] + ' (' + TestUnits[test] + ')';
		else
			var tname = Tests[test];
		var names = groupResults({
			'test' : test,
			'parallel' : parallel
		}).order('mean').map(function(i) {
			return i.name;
		});
		var ec2means = groupResults({
			'test' : test,
			'parallel' : parallel
		}).order('mean').map(function(i) {
			if (i.cloud == 'EC2') {
				return {
					name : i.cloud + ': ' + i.name,
					y : parseFloat(i.mean.toFixed(2))
				};
			} else {
				return {
					name : i.cloud + ': ' + i.name,
					y : 0
				};
			}
		});
		var rackmeans = groupResults({
			'test' : test,
			'parallel' : parallel
		}).order('mean').map(function(i) {
			if (i.cloud != 'EC2') {
				return {
					name : i.cloud + ': ' + i.name,
					y : parseFloat(i.mean.toFixed(2))
				};
			} else {
				return {
					name : i.cloud + ': ' + i.name,
					y : 0
				};
			}
		});
		var drilldowns = {};
		var ranges = groupResults({
			'test' : test,
			'parallel' : parallel
		}).order('mean').map(function(i) {
			return [parseFloat(i.range[0].toFixed(2)), parseFloat(i.range[1].toFixed(2))];
		});
		var nums = groupResults({
			'test' : test,
			'parallel' : parallel
		}).order('mean').map(function(i) {
			return parseFloat(i.num.toFixed(2));
		});
		var yaxis = [{
			title : {
				text : tname
			}
		}, {
			title : {
				gridLineWidth : 0,
				text : "Number of instances"
			},
			opposite : true
		}];
		var tool = {
			shared : true
		};
		var series = [{
			name : 'Min-Max range',
			type : 'arearange',
			yAxis : 0,
			data : ranges
		}, {
			color : colors[5],
			name : 'EC2 ' + tname,
			type : 'column',
			yAxis : 0,
			data : ec2means,
            drilldown : true
		}, {
			color : colors[3],
			name : 'Rackspace ' + tname,
			type : 'column',
			yAxis : 0,
			data : rackmeans,
            drilldown : true
		}, {
			color : colors[1],
			name : 'Number of instances',
			type : 'line',
			yAxis : 1,
			data : nums
		}];
		$("#" + group + "_chart").highcharts({
			title : {
				text : Tests[test] + ' (' + parallel + ')',
				x : -20 //center
			},
			subtitle : {
				text : 'Grouped by ' + Specs[group],
				x : -20
			},
			xAxis : {
				categories : names,
				labels : {
					rotation : 0
				}
			},
			yAxis : yaxis,
			tooltip : tool,
			plotOptions : {
				column : {
					stacking : 'normal'
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
			series : series,
		    drilldown : {
		    	series : []
		    }
		});

		$("#" + group + "_chart").highcharts().setSize(900, 600);
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

		// Create the chart
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

function plotBest(parallel, test, sorter, bestLimit) {
	if (test != 'index')
		var tname = Tests[test] + ' (' + TestUnits[test] + ')';
	else
		var tname = Tests[test];
	var order = " desc"

	var names = logs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(bestLimit).map(function(i) {
		return i.name;
	});

	var ec2means = logs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(bestLimit).map(function(i) {
		if (i.cloud == 'EC2') {
			return {
				name : i.cloud + ': ' + i.name,
				y : parseFloat(i.mean.toFixed(2))
			};
		} else {
			return {
				name : i.cloud + ': ' + i.name,
				y : 0
			};
		}
	});

	var rackmeans = logs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(bestLimit).map(function(i) {
		if (i.cloud != 'EC2') {
			return {
				name : i.cloud + ': ' + i.name,
				y : parseFloat(i.mean.toFixed(2))
			};
		} else {
			return {
				name : i.cloud + ': ' + i.name,
				y : 0
			};
		}
	});

	var sds = logs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(bestLimit).map(function(i) {
		var low = (i.mean - i.sd).toFixed(2);
		var high = (i.mean + i.sd).toFixed(2);
		return {
			low : parseFloat(low),
			high : parseFloat(high),
			name : i.cloud + ': ' + i.name
		};
	});

	var priceRatios = logs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(bestLimit).map(function(i) {
		/*return i.mean/(i.price*100);*/
		return {
			name : i.cloud + ': ' + i.name,
			y : parseFloat(i.priceRatio.toFixed(2))
		};
	});

	var prices = logs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(bestLimit).map(function(i) {
		return {
			name : i.cloud + ': ' + i.name,
			y : i.price
		};
	});

	var means = logs({
		'test' : test,
		'parallel' : parallel
	}).map(function(i) {
		return i.mean;
	});
	var sum = 0;
	for (var i = 0; i < means.length; i++)
		sum += means[i]
	var mean = sum / means.length;
	var varianceSum = 0;
	for (var i = 0; i < means.length; i++)
		varianceSum += (means[i] - mean) * (means[i] - mean);
	var std = Math.sqrt(varianceSum / (means.length - 1));
	means = [];
	mean = parseFloat(mean.toFixed(2));
	for ( i = 0; i < names.length; i++)
		means.push(mean);

	var zscores = logs({
		'test' : test,
		'parallel' : parallel
	}).order(sorter + order).limit(bestLimit).map(function(i) {
		return parseFloat(((i.mean - mean) / std).toFixed(2));
	});

	// Reverse the order to show the plot collectly
	names.reverse();
	sds.reverse();
	ec2means.reverse();
	rackmeans.reverse();
	priceRatios.reverse();
	prices.reverse();
	zscores.reverse();

	var yaxis = [{
		title : {
			text : tname
		}
	}, {
		title : {
			text : tname + '/(100*' + Specs['price'] + ')'
		},
		opposite : true
	}, {
		title : {
			text : Specs['price']
		},
		opposite : true
	}, {
		title : {
			text : 'Z Score'
		}
	}];

	var tool = {
		shared : true
	};

	var series = [{
		color : colors[2],
		name : 'Standard Deviation',
		type : 'arearange',
		yAxis : 0,
		data : sds
	}, {
		color : colors[5],
		name : 'EC2 ' + tname,
		type : 'column',
		yAxis : 0,
		data : ec2means
	}, {
		color : colors[3],
		name : 'Rackspace ' + tname,
		type : 'column',
		yAxis : 0,
		data : rackmeans
	}, {
		color : colors[4],
		name : tname + '/(100*' + Specs['price'] + ')',
		type : 'line',
		yAxis : 1,
		data : priceRatios
	}, {
		color : colors[7],
		name : Specs['price'],
		type : 'line',
		yAxis : 2,
		data : prices
	}, {
		color : colors[6],
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
		yAxis : 3,
		data : zscores
	}];
	//drawGraph(el, title, subtitle, xaxis, yaxis, yunit, series)
	drawGraph("#best_chart", 'Best ' + bestLimit + ' ' + Tests[test] + 's (' + parallel + ')', 'Sorted by ' + Sorters[sorter], names, 45, yaxis, tool, series);
	$("#best_chart").highcharts().setSize(1200, 700);
}

function plotScatter(parallel, test, scatter) {
	var ec2paravirtuals = logs({
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

	var rackparavirtuals = logs({
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

	var hvms = logs({
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
			color : colors[0],
			data : ec2paravirtuals
		}, {
			name : 'Rackspace Paravirtual',
			color : colors[1],
			data : rackparavirtuals
		}, {
			name : 'EC2 HVM',
			color : 'rgba(223, 83, 83, .5)',
			data : hvms
		}]
	});
	$('#' + currentTab + '_chart').highcharts().setSize(900, 600);
}

function replot() {
	if (-1 < Groups.indexOf(currentTab)) {
		currentGroup = currentTab;
		plotPerGroup(currentParallel, currentGroup, currentTest);
	} else if ( currentTab in Scatters) {
		currentScatter = Scatters[currentTab];
		plotScatter(currentParallel, currentTest, currentScatter);
	} else if (currentTab == 'best') {
		plotBest(currentParallel, currentTest, currentSorter, currentBestLimit);
	}
}

$(function() {
	$('#bestN').hide();
	$('#testbtns').hide();
	$('#sortbtns').hide();
	$('#parallelbtns').hide();
	$.getJSON("data/instances.json", function(d) {
		$.each(d, function(k, v) {
			//document.getElementById("debug").innerHTML += k + "<br>";
			instances.insert(v);
		});
		//plotInstances('price');
		plotGroupVariations(currentGroup);
	});
	$.getJSON("data/unixbench.json", function(d) {
		$.each(d, function(k, v) {
			logs.insert({
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
	});
});

$('a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
	currentTab = e.target.href.match(/(\w+)$/g)[0];
	// activated tab
	if (-1 < Groups.indexOf(currentTab)) {
		currentGroup = currentTab
		plotPerGroup(currentParallel, currentGroup, currentTest);
		// If in the group tabs
		$('#bestN').hide();
		$('#grpbtns').hide();
		$('#testbtns').show();
		$('#sortbtns').hide();
		$('#parallelbtns').show();
	} else if (currentTab == 'best') {
		plotBest(currentParallel, currentTest, currentSorter, currentBestLimit);
		// If in the Best 30s tab
		$('#bestN').show();
		$('#grpbtns').hide();
		$('#testbtns').show();
		$('#sortbtns').show();
		$('#parallelbtns').show();
	} else if ( currentTab in Scatters) {
		currentScatter = Scatters[currentTab];
		plotScatter(currentParallel, currentTest, currentScatter);
		// If in the scatter tabs
		$('#bestN').hide();
		$('#grpbtns').hide();
		$('#testbtns').show();
		$('#sortbtns').hide();
		$('#parallelbtns').show();
	} else {// If in the Home tab
		plotGroupVariations(currentGroup);
		$('#bestN').hide();
		$('#grpbtns').show();
		$('#testbtns').hide();
		$('#sortbtns').hide();
		$('#parallelbtns').hide();
	}
	//e.relatedTarget; // previous tab
});

$('#bestNform').keypress(function(e) {
	if (e.which == 13) {
		currentBestLimit = parseInt($('#bestNform').prop('value'));
		if (currentBestLimit === parseInt(currentBestLimit))
			plotBest(currentParallel, currentTest, currentSorter, currentBestLimit);
		else
			currentBestLimit = 30;
	}
});

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
