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
var sql = require('mssql');

var Bloodhound = require('bloodhound-js');

server.listen(6742);

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


    socket.emit('hints', [data[0]]);
    socket.on('other', function (data) {
        console.log(data);
    });
    socket.on('search', function (data) {
        console.log(data);
        if (data.value) {
            var validLength = (3 * data.index) + (data.index - 1);
            if (data.value.length === validLength) {
                // var query = "SELECT d.UUID_DICTIONARY as i, d.expression as e, d.dictionary_translation as v  FROM MPDV_DICTIONARY_ES d  WHERE d.UUID_DICTIONARY IN (SELECT DISTINCT UUIDDICTIONARY FROM MPD_IDX03ES_DICTIONARY WHERE COMBINED_KEY = 'FIE_LAS_TRX')";
                var query = "SELECT d.UUID_DICTIONARY as i, d.expression as e, d.dictionary_translation as v  FROM MPDV_DICTIONARY_ES d  WHERE d.UUID_DICTIONARY IN (SELECT DISTINCT UUIDDICTIONARY FROM MPD_IDX0" + data.index + "ES_DICTIONARY WHERE COMBINED_KEY = '" + data.value + "')";
                sendQuery(config, query);
            }
        }
    });
});
