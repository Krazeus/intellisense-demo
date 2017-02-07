var MongoClient = require('mongodb').MongoClient
	, assert = require('assert');

// Connection URL 
var url = 'mongodb://127.0.0.1:27017/config';

var insertDocuments = function (db, callback) {
	// Get the documents collection 
	var collection = db.collection('documents');

	// Insert some documents 
	collection.insertMany([
		{ a: 1 }, { a: 2 }, { a: 3 }
	], function (err, result) {
		assert.equal(err, null);
		assert.equal(3, result.result.n);
		assert.equal(3, result.ops.length);
		console.log("Inserted 3 documents into the document collection");
		callback(result);
	});
}


var findDocuments = function (db, callback) {
	// Get the documents collection 
	var collection = db.collection('dictionary');
	// Find some documents 
	collection.find({
		$text: {
			$search: "MENORES total",
			$caseSensitive: false
		}
	}, {
			t: 1,
			e: 1,
			i: 1,
			v: 1,
			_id: 0,
			score: {
				$meta: "textScore"
			}
		}).sort({
			score: {
				$meta: "textScore"
			}
		})
		.toArray(function (err, docs) {
			assert.equal(err, null);
			//assert.equal(2, docs.length);
			console.log("Found the following records");
			console.dir(docs);
			callback(docs);
		});
}


// Use connect method to connect to the Server 
MongoClient.connect(url, function (err, db) {
	assert.equal(null, err);
	console.log("Connected correctly to server");

	/*var a = insertDocuments(db, function () {
		findDocuments(db, function () {
			db.close();
		});
	});*/

	var collection = db.collection('dictionary');

	var a = findDocuments(db, function () {
		db.close();
	});

});
