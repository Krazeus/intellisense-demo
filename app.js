/**
 * @author miguel yax <mig_dj@hotmail.com>
 * date 1/25/2017
 * intellisense remote with node js
 */

//este es un comentario realizado por Danilo
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
var data = JSON.parse(fs.readFileSync('data/nuevo.json', 'utf8'));
var dataClean = JSON.parse(fs.readFileSync('data/nuevo.json', 'utf8'));
var categoryList = JSON.parse(fs.readFileSync('data/categories.json', 'utf8'));
var dataTypeList = JSON.parse(fs.readFileSync('data/datatype.json', 'utf8'));
// var data = JSON.parse(fs.readFileSync('data/hints.json', 'utf8'));
var maxLength = 100;
// var data = JSON.parse(fs.readFileSync('data/demoData1302017.json', 'utf8'));

var Bloodhound = require('bloodhound-js');

// var normalize = (function () {
var from = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç",
	to = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuunncc",
	mapping = {};

for (var i = 0, j = from.length; i < j; i++) {
	mapping[from.charAt(i)] = to.charAt(i);
}

// return function (str) {
var normalize = function (str) {
	var ret = [];
	for (var i = 0, j = str.length; i < j; i++) {
		var c = str.charAt(i);
		if (mapping.hasOwnProperty(str.charAt(i)))
			ret.push(mapping[c]);
		else
			ret.push(c);
	}
	var text = ret.join('');

	text = text.replace(/[.\-\_&\/,:;%]/gi, ' ');
	text = text.replace(/\s\s+/g, ' ');
	//<debug>
	console.log('text', text);
	//</debug>
	return text;
};
// })();



server.listen(6742);

//<debug>
// for (var index = 0; index < data.length; index++) {
// 	var element = data[index];
// 	element.v = normalize(element.v);
// 	element.t = normalize(element.t);
// }
// fs.writeFile("data/nuevo.json", JSON.stringify(data));
// console.log('writeFile', '');
//</debug>
var engineList = new Bloodhound({
	datumTokenizer: Bloodhound.tokenizers.obj.whitespace('t'),
	// datumTokenizer: Bloodhound.tokenizers.whitespace,
	// datumTokenizer: Bloodhound.tokenizers.obj.whitespace('v'),
	queryTokenizer: Bloodhound.tokenizers.whitespace,
	identify: function (obj) { return obj.i; },
	local: data
});


app.all('/', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {

	socket.emit('categories', categoryList);
	socket.emit('datatype', dataTypeList);

	socket.on('search', function (data) {

		//<debug>
			console.log('search', data.value);
		//</debug>
		engineList.search(data.value, function (param) {
			var data = (param.length > maxLength) ? param.slice(0, maxLength) : param;
			socket.emit('hints', { records: data, isEqual: false });
		}, function (param) {
			console.log('asincrono', arguments);
		});
	});
});
