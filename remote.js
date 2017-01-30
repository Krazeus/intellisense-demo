/**
 * @author miguel yax <mig_dj@hotmail.com>
 * date 1/25/2017
 * intellisense remote with node js
 */

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
var sql = require('mssql');

var port = 6742;
var ip = '192.168.56.99';




var normalize = (function () {
    var from = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç",
        to = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuunncc",
        mapping = {};

    for (var i = 0, j = from.length; i < j; i++) {
        mapping[from.charAt(i)] = to.charAt(i);
    }

    return function (str) {
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




var getIndex = function (text) {
    // var text = "BAYRÓN-DANIEL&CARRANZA RIVERA"
    text = text.replace(".", " ").replace("-", " ").replace("_", " ").replace("&", " ").replace("/", " ").replace(",", " ").replace(":", " ").replace(";", " ").replace("%", " ");
    text = normalize(text);
    text = text.replace("      ", " ").replace("     ", " ").replace("    ", " ").replace("   ", " ").replace("  ", " ");
    var matches = text.match(/\b(\w\w\w)/g);

    var array = matches;
    array = array.sort();

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
                value: temp,
                index: letters.length
            });
        }
    }
    return combi;
};


//word not allowed




var Bloodhound = require('bloodhound-js');

server.listen(port);

var config = {
    user: 'user',
    password: 'password',
    server: 'server',
    database: 'database'
};


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {


    var
        /**
         * sendQuery ejecuta una consulta en base de dados con una configuracion y una instruccion sql
         * @param {Object} credential  `{ user: '', password: '', server: '', database:'' }` credenciales de autentificacion
         * @param {String} query  `''` instruccion sql a ejecutar
         * @private
         */
        sendQuery = function (credential, query) {
            var data = [];

            sql.connect(credential, function (error) {
                if (error) {
                    //<debug>
                    console.log('error', error);
                    //</debug>
                }
                var request = new sql.Request();
                request.query(query, function (error, recordset) {
                    if (error) {
                        //<debug>
                        console.log('error', error);
                        //</debug>


                    }
                    socket.emit('hints', recordset);
                });
            });
        };

    socket.on('other', function (data) {
        console.log(data);
    });
    socket.on('search', function (data) {


        if (data.value) {
            if (data.value.length > 2) {
                var indexList = getIndex(data.value);
                // var lastItemIndex = indexList[indexList.length - 1];
                data = indexList[indexList.length - 1];
                //<debug>
                console.log('searching', data);
                //</debug>


                var validLength = (3 * data.index) + (data.index - 1);
                if (data.value.length === validLength) {
                    // var query = "SELECT d.UUID_DICTIONARY as i, d.expression as e, d.dictionary_translation as v  FROM MPDV_DICTIONARY_ES d  WHERE d.UUID_DICTIONARY IN (SELECT DISTINCT UUIDDICTIONARY FROM MPD_IDX03ES_DICTIONARY WHERE COMBINED_KEY = 'FIE_LAS_TRX')";
                    var query = "SELECT d.UUID_DICTIONARY as i, d.expression as e, d.dictionary_translation as v  FROM MPDV_DICTIONARY_ES d  WHERE d.UUID_DICTIONARY IN (SELECT DISTINCT UUIDDICTIONARY FROM MPD_IDX0" + data.index + "ES_DICTIONARY WHERE COMBINED_KEY = '" + data.value + "')";
                    sendQuery(config, query);
                }
            }
        }
    });
});
