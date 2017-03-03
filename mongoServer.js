/*!
 * @author miguel yax <mig_dj@hotmail.com>
 * date 1/25/2017
 * intellisense remote with node js
 */
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
var replace = require('replace');
var config = JSON.parse(fs.readFileSync('config/default.json', 'utf8'));
var categoryList = JSON.parse(fs.readFileSync('data/categories.json', 'utf8'));


//word not allowed
var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

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

server.listen(config.port);

app.get('/', function (req, res) {
    var indexFilePath = __dirname + '/index.html';
    fs.readFile(indexFilePath, 'utf8', function (send, text) {
        text = text.replace(/{ipAndPort}/g, config.ip + ":" + config.port);
        res.send(text);
    });
});

io.on('connection', function (socket) {
    // Connection URL
    var mongoContext = null;
    MongoClient.connect(config.mongodb.config, function (err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");
        mongoContext = db;
    });
    socket.emit('categories', categoryList);
    // socket.emit('datatype', )

    var excludedWordsArray = [];
    var synonyms = [];

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
        mongoQuery = function (options, collection, limit, callback, isRetry) {
            options = options || {};
            var config;
            if (isRetry) {
                config = options.retry;
                options.retry = null;
            } else {
                config = options.first;
            }
            var data = [];

            if (collection && config) {
                data = collection.find(
                    config, {
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
                    ).limit(limit || 100);

                data.toArray(function (err, data) {
                    assert.equal(err, null);
                    if (data.length) {
                        callback(err, {
                            records: data,
                            hasCategory: (categories.length > 0)
                        });
                    } else {
                        mongoQuery(options, collection, limit, callback, true);
                    }
                });
            } else {
                callback(true, {
                    records: [],
                    hasCategory: (categories.length > 0)
                });
            }
        },
        /**
         * sendQuery ejecuta una consulta en base de dados con una configuracion y una instruccion sql
         * @param {Object} credential  `{ user: '', password: '', server: '', database:'' }` credenciales de autentificacion
         * @param {String} collectionName  `''` Nombre de la colleccion a buscar
         * @param {String} lang  `''` Lenguaje base
         * @param {function} callback  `function` handler para respuesta de considencias
         * @param {Object} options  `{}` objeto opcional para configurar modalidades extendidas
         *      {
         *          allData {Boolean} `false || null` si es verdadero retorna toda la data en la coleccion
         *       }
         * @return {Array} data  `[]`  solved data
         * @private
         */

        sendQuery = function (text, collectionName, lang, callback, options) {
            categories = [];
            options = options || {};
            text = text.toUpperCase();

            if (excludedWordsArray.length === 0) {
                var Excluded = mongoContext.collection('R_EXCLUDEDWORDS_' + lang);
                Excluded.find({}, { _id: 0, VALUE: 1 }).toArray(function (err, result) {
                    var count = result.length;
                    for (var i = 0; i < count; i++) {
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
                        text = text.substring(excludedWordsArray[i].toString().length + 1, text.length);

                    text = text.replace(" " + excludedWordsArray[i].toString() + " ", " ");
                }
            }


            if (synonyms.length === 0) {
                var synonymsContext = mongoContext.collection('R_SYNONYMS_' + lang);
                synonymsContext.find({}, { _id: 0, INTERNALCODE: 1, VALUE: 1 }).toArray(function (err, resultSyn) {
                    var count = resultSyn.length;
                    for (var i = 0; i < count; i++) {
                        synonyms.push(resultSyn[i]);
                    }
                    return synonyms;
                });
            } else {
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

            text = normalize(text);
            text = text.trim();

            console.log("text search", text, categories);
            //quitar articulaciones

            var collection = mongoContext.collection(collectionName);
            var whereMongo = {
                first: {},
                retry: null
            };

            if (categories.length === 0) {
                var listKey = text.split(" ").join("|");
                var regex = new RegExp(listKey.toString());
                if (options.allData) {
                    whereMongo = {
                        first: {
                            VALUE: { $regex: regex, $options: 'ix' }
                        },
                        retry: {}
                    };
                }
                else {
                    whereMongo = {
                        first: {
                            $text: {
                                $search: text,
                                $caseSensitive: false
                            }
                        },
                        retry: {
                            VALUE: { $regex: regex, $options: 'ix' }
                        }
                    };
                }
            }
            else {

                if (text === "") {
                    whereMongo.first = {
                        INTERNALCODE: { $in: categories }
                    };
                }
                else {
                    whereMongo = {
                        first: {
                            INTERNALCODE: { $in: categories },
                            $text: {
                                $search: text,
                                $caseSensitive: false
                            }
                        },
                        retry: {
                            INTERNALCODE: { $in: categories }
                        }
                    };
                }
            }
            var resultList = mongoQuery(
                whereMongo,
                collection,
                100,
                callback
            );
        };

    /**
     * connectMongo description
     * @return {Object} contextMongo  `null` contexto de mongo
     * @private
     */
    socket.on('disconnect', function (data) {
        mongoContext.close();
    });
    socket.on('field', function (data) {
        if (data.value) {
            var uid = [];
            uid = data.eventValue.split("-");
            var search = sendQuery(data.value, "R_" + uid.join("") + "_" + data.lang, data.lang, function (err, result) {
                var isEqual = (!result.records.length && lastCategoryList === categories);

                lastCategoryList = categories;
                socket.emit('hints', {
                    records: (err) ? [] : result.records,
                    success: (err) ? false : true,
                    keyIndex: lastIndex,
                    hasCategory: result.hasCategory,
                    isEqual: isEqual,
                    type: 'field'
                });
            }, {
                    allData: true
                });
        }
    });
    /*!
     * implementar el siguiente codigo
     */
    socket.on("operator", function (data) {
        if (data.value) {
            var search = sendQuery(data.value, "R_ARITHMETICOPERATOR_" + data.lang, data.lang, 2, function (err, result) {
                // var isEqual = (!result.records.length && lastCategoryList === categories);

                // lastCategoryList = categories;
                socket.emit('hints', {
                    records: (err) ? [] : result.records,
                    success: (err) ? false : true,
                    keyIndex: lastIndex,
                    hasCategory: result.hasCategory,
                    isEqual: false,
                    type: 'operator'
                });
            });
        }
    });
    socket.on("connector", function (data) {
        if (data.value) {
            var search = sendQuery(data.value, "R_LOGICALOPERATOR_" + data.lang, data.lang, 2, function (err, result) {
                // var isEqual = (!result.records.length && lastCategoryList === categories);

                // lastCategoryList = categories;
                socket.emit('hints', {
                    records: (err) ? [] : result.records,
                    success: (err) ? false : true,
                    keyIndex: lastIndex,
                    hasCategory: result.hasCategory,
                    isEqual: false,
                    type: 'connector'
                });
            }, {
                    allData: true
                });
        }
    });
});
