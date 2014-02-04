var colors = Highcharts.getOptions().colors;
var logs = TAFFY();
var currentSorter = 'time';
var currentLimit = 30;
var Sorters = {
    'time' : "Actual time elapsed",
    'cost' : "Cost necessary to complete x264 benchmark"
};

function plotx264(sorter, limit) {
    var names = logs().order(sorter).limit(limit).map(function(i){
        return i.name;
    });
    var ec2times = logs().order(sorter).limit(limit).map(function(i){
        var time = (i.cloud=='EC2') ? i.time : 0;
        return parseFloat(time.toFixed(2));
    });
    var racktimes = logs().order(sorter).limit(limit).map(function(i){
        var time = (i.cloud=='Rackspace') ? i.time : 0;
        return parseFloat(time.toFixed(2));
    });
    var costs = logs().order(sorter).limit(limit).map(function(i){
        return parseFloat(i.cost.toFixed(2));
    });;

    names.reverse();
    ec2times.reverse();
    racktimes.reverse();
    costs.reverse();

	$('#x264').highcharts({
		title : {
			text : 'H.264 Encoding Performance on AWS EC2 and Rackspace'
		},
		subtitle : {
			text : 'Sorted by ' + Sorters[sorter]
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
        },{
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
		}]
	});
    $('#x264').highcharts().setSize(1000, 600);
}

$(function() {
    $.getJSON("data/x264result_new.json", function(d) {
    	$.each(d, function(k, v) {
    		logs.insert({
    			name : k,
    			cloud : v['cloud'],
    			memory : v['memory'],
    			vcpu : v['vcpu'],
    			price : v['price'],
    			time : v['time'],
                cost : v['cost']
    		});
    	});
    	plotx264('time', 30);
    });
});

$('#limitForm').keypress(function(e) {
	if (e.which == 13) {
		currentLimit = parseInt($('#limitForm').prop('value'));
        plotx264(currentSorter, currentLimit);
	}
});

$('#s_time').on('click', function(e) {
    currentSorter = 'time';
    plotx264(currentSorter, currentLimit);
});
$('#s_cost').on('click', function(e) {
    currentSorter = 'cost';
    plotx264(currentSorter, currentLimit);
});
