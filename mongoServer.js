/*!
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
        /*
         * @property {Array} lastCategoryList  `[]` el ultimo listado de categorias consultado 
         */
        lastCategoryList = [],
        /*
         * @propery {Array} categories  `[]` actual listado de categorias a buscar
         */
        categories = [],
        /**
         * @method mongoQuery description
         * @param {Object} options  `[]` description
         * @param {collection} collection  `{}` instance of mongo collection
         * @return {Array} data `[]` array solved
         * @private
         */
        mongoQuery = function (options, collection, limit, callback) {
            options = options || {};
            var config = options;
            var data = [];

            // if (options.and) {
            //     config['$and'] = [];
            //     config[options.logicConnector] = []
            //     if (options.text) {
            //         config['$and'].push({
            //             $text: {
            //                 $search: options.text
            //             }
            //         })
            //     }
            // }
            if (collection) {
                data = collection.find(
                    config
                    , {
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
                    ).limit(limit || 50);
            }

            return data;
        },
        /**
         * sendQuery ejecuta una consulta en base de dados con una configuracion y una instruccion sql
         * @param {Object} credential  `{ user: '', password: '', server: '', database:'' }` credenciales de autentificacion
         * @param {String} collectionName  `''` Nombre de la colleccion a buscar
         * @param {String} lang  `''` Lenguaje base
         * @param {function} calback  `function` handler para respuesta de considencias 
         * @return {Array} data  `[]`  solved data
         * @private
         */

        sendQuery = function (text, collectionName, lang, calback) {
            categories = [];

            if (excludedWordsArray.length == 0) {
                var Excluded = mongoContext.collection('R_EXCLUDEDWORDS_' + lang);
                Excluded.find({}, { _id: 0, VALUE: 1 }).toArray(function (err, result) {
                    var i, count;
                    for (i = 0, count = result.length; i < count; i++) {
                        excludedWordsArray.push(result[i].VALUE.toString());
                    }
                    return excludedWordsArray;
                });
            }
            else {
                for (var i = 0; i < excludedWordsArray.length; i++) {
                    var a1 = text.substring(0, excludedWordsArray[i].length + 1);
                    var a2 = excludedWordsArray[i].toString() + " ";
                    if (a1 === a2)
                        text = text.substring(excludedWordsArray[i].toString().length + 1, text.length)

                    text = text.replace(" " + excludedWordsArray[i].toString() + " ", " ");
                }
            }


            if (synonyms.length === 0) {
                var synonymsContext = mongoContext.collection('R_SYNONYMS_' + lang);
                synonymsContext.find({}, { _id: 0, INTERNALCODE: 1, VALUE: 1 }).toArray(function (err, resultSyn) {
                    var i, count;
                    for (i = 0, count = resultSyn.length; i < count; i++) {
                        synonyms.push(resultSyn[i]);
                    }
                    return synonyms;
                });
            }
            else {
                for (var i = 0; i < synonyms.length; i++) {
                    if (text.includes(synonyms[i].VALUE.toString())) {
                        categories.push(synonyms[i].INTERNALCODE);
                        text = text.replace(synonyms[i].VALUE.toString(), "");
                    }
                }
            }

            if (categories.length > 1) {
                categories.sort(function (a, b) {
                    return a - b;
                });
            }

            //text = text.toUpperCase();
            text = normalize(text);
            text = text.trim();

            console.log("text search", text, categories);
            //quitar articulaciones

            var collection = mongoContext.collection(collectionName);
            var whereMongo = {};
            if (categories.length === 0) {
                // var listKey = text.split(" ").join("|")
                // var regex = new RegExp(listKey.toString());
                // whereMongo = { VALUE: { $regex : regex, $options: 'ix' } };
                whereMongo = {
                    $text: {
                        $search: text,
                        $caseSensitive: false
                    }
                };
            }
            else {
                lastCategoryList = categories
                if (text == "") {
                    whereMongo = {
                        INTERNALCODE: { $in: categories }
                    };
                }
                else {

                    whereMongo = {
                        $and: [
                            {
                                $text: {
                                    $search: text,
                                    $caseSensitive: false
                                }
                            },
                            // { VALUE: {$regex : '.*' + text + '.*'}},
                            { INTERNALCODE: { $in: categories } }
                        ]
                    };
                }
            }
            var resultList = mongoQuery(
                whereMongo,
                collection
            );
            resultList.toArray(function (err, data) {
                assert.equal(err, null);
                calback(err, {
                    records: data,
                    hasCategory: (categories.length > 0)
                });

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
            var search = sendQuery(data.value, "R_" + data.eventValue + "_" + data.lang, data.lang, function (err, result) {

                socket.emit('hints', {
                    records: (err) ? [] : result.records,
                    success: (err) ? false : true,
                    keyIndex: lastIndex,
                    hasCategory: result.hasCategory,
                    isEqual: (!result.records.length && lastCategoryList === categories)
                });
            });
        }
    });
});
