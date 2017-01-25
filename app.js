/**
 * @author miguel yax <mig_dj@hotmail.com>
 * date 1/25/2017
 * intellisense remote with node js
 */

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
var data = JSON.parse(fs.readFileSync('data/jsonFile100.json', 'utf8'));

var Bloodhound = require('bloodhound-js');

server.listen(6742);

var engineList = new Bloodhound({
	datumTokenizer: Bloodhound.tokenizers.obj.whitespace('v'),
	queryTokenizer: Bloodhound.tokenizers.whitespace,
	identify: function (obj) { return obj.i; },
	local: data
});


app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
	socket.emit('hints', [data[0]]);
	socket.on('other', function (data) {
		console.log(data);
	});
	socket.on('search', function (data) {

		engineList.search(data.value, function (param) {
			if (param.length > 500) {
				socket.emit('hints', param.slice(0, 500));
			} else {
				socket.emit(param);
			}
			console.log('search', data.value, param.length);
		}, function (param) {
			console.log('asincrono', arguments);
		});
	});
});
