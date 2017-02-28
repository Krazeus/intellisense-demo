/**
 * @author miguel yax <mig_dj@hotmail.com>
 * date 1/25/2017
 * intellisense remote with node js
 */
//var edge = require('edge');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
var categoryList = JSON.parse(fs.readFileSync('data/categories.json', 'utf8'));

//word not allowed
var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

var port = 6742;
var ip = 'http://192.168.120.230';

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
        //str = str.toUpperCase();
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

    
    var excludedWordsArray = new Array();
    var synonyms = new Array();
         


            /**
             *         var Events = edge.func({
                           assemblyFile: 'C:/Monitor Plus/Narrativa/intellisense-demo/libs/BLL.dll',
                           typeName: 'BLL.Config.EVENT',
                           methodName: 'Invoke'//'allAsync' // Func<object,Task<object>>
                       });
           
                       var eventsArray = Events('{"uuidOrganizationNode" :"a8842958-7bb6-4493-8a4b-d859c655eef7", "uuidModule":"844288EA-C950-432A-9322-D62A6BFEE579"}');
             */


    var
        /**
         * sendQuery ejecuta una consulta en base de dados con una configuracion y una instruccion sql
         * @param {Object} credential  `{ user: '', password: '', server: '', database:'' }` credenciales de autentificacion
         * @param {String} query  `''` instruccion sql a ejecutar
         * @param {String} collectionName  `''` Nombre de la colleccion a buscar
         * @param {String} lang  `''` Lenguaje base
         * @param {function} calback  `function` handler para respuesta de considencias 
         * @return {Array} data  `[]`  solved data
         * @private
         */
        sendQuery = function (text, collectionName, lang, calback) {
            var categories = "";
            
            if(excludedWordsArray.length == 0){
                var Excluded = mongoContext.collection('R_EXCLUDEDWORDS_' + lang);
                Excluded.find({}, {_id:0, VALUE:1}).toArray(function (err, result) {
                            var i, count;
                            for (i = 0, count = result.length; i < count; i++) {
                                excludedWordsArray.push(result[i].VALUE.toString());
                            }
                            return excludedWordsArray;
                        });
            }
            else
            {
                for(var i = 0; i < excludedWordsArray.length; i++){
                    var a1 = text.substring(0, excludedWordsArray[i].length + 1);
                    var a2 = excludedWordsArray[i].toString() + " ";
                    if(a1 == a2)
                        text = text.substring(excludedWordsArray[i].toString().length + 1, text.length)

                    text = text.replace(" " + excludedWordsArray[i].toString() + " ", " ");
                }
            }


            if(synonyms.length == 0){
                var synonymsContext = mongoContext.collection('R_SYNONYMS_' + lang);
                synonymsContext.find({}, {_id:0, INTERNALCODE:1 , VALUE:1}).toArray(function (err, resultSyn) {
                            var i, count;
                            for (i = 0, count = resultSyn.length; i < count; i++) {
                                synonyms.push(resultSyn[i]);
                            }
                            return synonyms;
                        });
            }
            else
            {
                for(var i = 0; i < synonyms.length; i++){
                    if(text.includes(synonyms[i].VALUE.toString())){
                        categories += "," + synonyms[i].INTERNALCODE.toString();
                        text = text.replace(synonyms[i].VALUE.toString(), "");
                    }
                }
                if(categories.length > 0)
                    categories = categories.substring(1, categories.length)
            }

            
            text = normalize(text);
            text.trim();

            console.log("text search", text, categories);
            //quitar articulaciones
            
            var collection = mongoContext.collection(collectionName);

            if(categories.length === 0)
            {
                var resultList = collection.find({
                        $text: {
                            $search: text,
                            $caseSensitive: false
                        }
                    }, {
                            VALUE: 1,
                            TOKEN: 1,
                            EXPRESSION: 1,
                            UUID: 1,
                            INTERNALCODE: 1,
                            _id: 0,
                            score: {
                                $meta: "textScore"
                            }
                        }).sort({
                            score: {
                                $meta: "textScore"
                            }
                        }
                    ).limit(50);
            }
            else{
                if(text == ""){
                    var resultList = collection.find(
                        {  INTERNALCODE:{$in:[ categories ]}  
                        }, {
                                VALUE: 1,
                                TOKEN: 1,
                                EXPRESSION: 1,
                                UUID: 1,
                                INTERNALCODE: 1,
                                _id: 0,
                                score: {
                                    $meta: "textScore"
                                }
                            }).sort({
                                score: {
                                    $meta: "textScore"
                                }
                            }
                        ).limit(50);
                }
                else
                {
                    var resultList = collection.find(
                        { $and:[
                                {$text: {$search: text, $caseSensitive: false}},
                                {   INTERNALCODE:{$in:[ categories ]}   }
                            ]
                        }, {
                                VALUE: 1,
                                TOKEN: 1,
                                EXPRESSION: 1,
                                UUID: 1,
                                INTERNALCODE: 1,
                                _id: 0,
                                score: {
                                    $meta: "textScore"
                                }
                            }).sort({
                                score: {
                                    $meta: "textScore"
                                }
                            }
                        ).limit(50);
                }

            }

            resultList.toArray(function (err, data) {
                 assert.equal(err, null);            
                 calback(err, data);
             });
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
            var search = sendQuery(data.value, "R_" + data.eventValue + "_" + data.lang, data.lang, function (err, data) {

                socket.emit('hints', {
                    records: (err) ? [] : data,
                    success: (err) ? false : true,
                    keyIndex: lastIndex,
                    isEqual: true
                });
            });
        }
    });
});
