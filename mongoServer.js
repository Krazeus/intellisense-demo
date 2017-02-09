/**
 * @author miguel yax <mig_dj@hotmail.com>
 * date 1/25/2017
 * intellisense remote with node js
 */

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var fs = require('fs');
var categoryList = JSON.parse(fs.readFileSync('data/categories.json', 'utf8'));

//word not allowed
var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');


var port = 6742;
var ip = '192.168.120.230';
/*
 * @cfg {String} lastIndex  `''` ultimo indice buscado
 */
var lastIndex = '';


var normalize = (function () {
    var from = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç",
        to = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuunncc",
        mapping = {};

    for (var i = 0, j = from.length; i < j; i++) {
        mapping[from.charAt(i)] = to.charAt(i);
    }

    return function (str) {
        str = str.toUpperCase();
        str.replace(/[.\-\_&\/,:;%]/g, ' ');
        str.replace(/\s\s+/g, ' ');
        var ret = [];
        for (var i = 0, j = str.length; i < j; i++) {
            var c = str.charAt(i);
            if (mapping.hasOwnProperty(str.charAt(i)))
                ret.push(mapping[c]);
            else
                ret.push(c);
        }
        return ret.join('');
    };
})();


//var data = [];


var getIndex = function (text) {

    text.replace(/[.\-\_&\/,:;%]/g, ' ');

    text.replace(/\s\s+/g, ' ');

    text = normalize(text);

    /**
     * selecciona 3 caracteres
     */
    //var matches = text.match(/\b(\w{3})/g);
    var matches = text.match(/\b(\w)/g);
    var array = matches || [];
    if (array.length > 1) {
        array = array.sort();
    }

    var letters = array;
    var combi = [];
    var temp = "";
    var letLen = Math.pow(2, letters.length);

    for (var i = 0; i < letLen; i++) {
        temp = "";
        for (var j = 0; j < letters.length; j++) {
            if ((i & Math.pow(2, j))) {
                temp += letters[j] + "_";
            }
        }
        temp = temp.substring(0, temp.length - 1);
        if (temp !== "") {
            combi.push({
                value: temp.toUpperCase(),
                index: letters.length
            });
        }
    }
    return combi;
};

server.listen(port);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    // Connection URL 
    // var url = 'mongodb://192.168.120.230:27017/config';
    var mongoContext = null;
    MongoClient.connect('mongodb://192.168.120.230:27017/config', function (err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");
        mongoContext = db;
    });

    var
        /**
         * sendQuery ejecuta una consulta en base de dados con una configuracion y una instruccion sql
         * @param {Object} credential  `{ user: '', password: '', server: '', database:'' }` credenciales de autentificacion
         * @param {String} query  `''` instruccion sql a ejecutar
         * @return {Array} data  `[]`  solved data
         * @private
         */
        sendQuery = function (text) {

            text = normalize(text);
            //quitar articulaciones

            //buscar categorias
//            var words = text.toArray();
//            var cat = "";
//            words.array.forEach(function(element) {
//                cat = categoryList.find(element.value);
//                if(cat != null)
//                    return
//            }, this);

            var collection = mongoContext.collection('dictionary')
            var resultList = collection.find({
                $text: {
                    $search: text,
                    $caseSensitive: false
                }
            }, {
                    v: 1,
                    t: 1,
                    e: 1,
                    i: 1,
                    _id: 0,
                    score: {
                        $meta: "textScore"
                    }
                }).sort({
                    score: {
                        $meta: "textScore"
                    }
                }).limit(50);

            var resultData = [];
            var sortedList = resultList.toArray(function (err, data) {
                assert.equal(err, null);
                //<debug>
                console.log('searched: ', text, 'results: ', data.length);
                //</debug>

                socket.emit('hints', {
                    records: data,
                    keyIndex: lastIndex,
                    isEqual: true
                });
            });

            // return resultData || [];
        };

    /**
     * connectMongo description
     * @return {Object} contextMongo  `null` contexto de mongo
     * @private
     */

    socket.on('disconnect', function (data) {
        mongoContext.close();
    });
    socket.on('search', function (data) {
        if (data.value) {
            var search = sendQuery(data.value);

            // socket.emit('hints', {
            //     records: search,
            //     keyIndex: lastIndex,
            //     isEqual: true
            // });
        }
    });
});
