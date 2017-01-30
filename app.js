/**
 * @author miguel yax <mig_dj@hotmail.com>
 * date 1/25/2017
 * intellisense remote with node js
 */

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
// var data = JSON.parse(fs.readFileSync('data/jsonFile100.json', 'utf8'));
var data = JSON.parse(fs.readFileSync('data/demoData1302017.json', 'utf8'));

var Bloodhound = require('bloodhound-js');

server.listen(6742);

var engineList = new Bloodhound({
	datumTokenizer: Bloodhound.tokenizers.obj.whitespace('t'),
	// datumTokenizer: Bloodhound.tokenizers.whitespace,
	// datumTokenizer: Bloodhound.tokenizers.obj.whitespace('v'),
	queryTokenizer: Bloodhound.tokenizers.whitespace,
	identify: function (obj) { return obj.i; },
	local: data
});

//<debug>
console.log('loadData', data.length);
//</debug>
app.all('/', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {

	socket.emit('hints', [data[0]]);
	socket.on('search', function (data) {
		//<debug>
		console.log('debug', data);
		//</debug>
		engineList.search(data.value, function (param) {
			var data = (param.length > 500) ? param.slice(0, 500) : param;

			socket.emit('hints', data);
			console.log('search', data.value, param.length);
		}, function (param) {
			console.log('asincrono', arguments);
		});
	});
});
