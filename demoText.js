/**
 * @author myax <mig_dj@hotmail.com>
 * date 1/20/2017
 * demo search text
 */
$(document).ready(function () {
	/*
	 * @cfg {Object} demo  `default` variable global
	 */
	demo = {
		/**
		 * guid description
		 * @private
		 */
		guid: function () {
			var d = new Date().getTime();
			var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
				var r = (d + Math.random() * 16) % 16 | 0;
				d = Math.floor(d / 16);
				return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
			});
			return uuid;
		},
		/**
		 * @method getRawDataByWS description
		 * @return {type} variable `default` description
		 * @private
		 */
		getRawDataByWS: function (callback) {
			var variable = null;

			$.ajax({
				type: "method",
				url: "http://192.168.121.17:8082/dictionaries.svc/all",
				data: '{ "uuidToken": "585F00B1-5D36-40E3-8BA6-6F915FD6B674", "uuidEvent": "0E45E63F-AA19-44E1-9DBF-DC3EB702D113" }',
				dataType: "json",
				method: 'POST',
				contentType: "application/json",
				timeout: 360000,
				success: function (response) {


				}
			});
			return variable;
		},
		/**
		 * @method makeDataToFileJson description
		 * @return {Array} data `default` description
		 * @private
		 */
		makeDataToFileJson: function (rawData) {
			var data = null;

			var link = document.createElement("A");
			link.setAttribute("download", 'jsonFile');
			var allData = [];
			var stringData = JSON.stringify(rawData);
			var stringAllData = "";
			var data = new Blob([stringData], { type: 'text/json' });
			link.href = window.URL.createObjectURL(data);
			for (var index = 0; index < 70; index++) {
				// allData = allData.concat(rawData);
				link.setAttribute("download", 'jsonFile' + index + ".json");
				stringAllData += stringData;
				link.click();
			}

			var data2 = new Blob([stringAllData], { type: 'text/json' });
			link.href = window.URL.createObjectURL(data2);
			link.setAttribute("download", 'jsonFileALL.json');
			// var data = new Blob(allData, { type: 'text/json' });
			// link.href = window.URL.createObjectURL(data);

			link.click();

			return data;
		},
		/**
		 * @method sendRequest description
		 * @param {String} url  `default`
		 * @param {function} callback  `` callback
		 * @private
		 */
		sendRequest: function (url, callback, param, method) {
			$.ajax({
				type: method || "GET",
				// url: "data/films.json",
				// url: "data/dictionary.json",
				url: url,
				data: param || "data",
				dataType: "json",
				contentType: "application/json",
				// contentType: "text/plain",
				timeout: 360000,
				success: function (response) {
					// makeDataToFileJson(response);
					callback(response);
					// initializeEditor(response);
				},
				error: function (response) {
					//<debug>
					console.error('error', response);
					//</debug>
				}
			});
		},
		/**
		 * 	renderData description
		 * @private
		 */
		renderData: function (data) {
			//<debug>
			console.log('renderData', arguments);
			//</debug>
			var length = (data.length > 100) ? 100 : data.length;
			var htmlString = '';
			for (var index = 0; index < length; index++) {
				var element = data[index];
				htmlString += "<li> " + element.v + " </li>";
			}


			$(".results li").remove();
			$(".results").append(htmlString);
			$(".total").text("resultados encontrados: " + data.length);
		},
		/**
		 * getJsonData description
		 * @private
		 */
		getJsonData: function () {
			demo.sendRequest("data/dictionary.json", demo.makeDataToFileJson);

		},
		/**
		 * loadFiles description
		 * @private
		 */
		loadFiles: function () {
			var summaryLoad = [];

			for (var index = 0; index < 70; index++) {
				var stringName = 'data/demo/jsonFile' + index + '.json';
				var fileItem = {
					name: stringName,
					start: new Date(),
					finish: null,
					timeLoad: null
				};
				// $.ajax({
				// 	type: "GET",
				// 	// url: "data/films.json",
				// 	url: stringName,
				// 	data: "data",
				// 	dataType: "json",
				// 	timeout: 360000,
				// 	success: function (response) {
				// 		//<debug>
				// 		console.log('debug', arguments);
				// 		//</debug>
				// 		fileItem.finish = new Date();
				// 		// fileItem.timeLoad = fileItem.start.getDate() - fileItem.getDate();
				// 		fileItem.timeLoad = new Date(fileItem.finish) - new Date(fileItem.start);
				// 		// makeDataToFileJson(response);
				// 		// initializeEditor(response);
				// 	}
				// });
				demo.sendRequest(stringName,
					function (response) {
						//<debug>
						console.log('debug', arguments);
						//</debug>
						fileItem.finish = new Date();
						// fileItem.timeLoad = fileItem.start.getDate() - fileItem.getDate();
						fileItem.timeLoad = new Date(fileItem.finish) - new Date(fileItem.start);
						// makeDataToFileJson(response);
						// initializeEditor(response);
					});
			}
			//<debug>
			console.log('loadFiles', summaryLoad);
			var totalTimeLoad = 0;
			summaryLoad.forEach(function (element) {
				totalTimeLoad += element.timeLoad;
			});
			console.log('total time', totalTimeLoad);
			//</debug>
		},
		/**
		 * loadBigFile description
		 * @private
		 */
		loadBigFile: function () {
			demo.sendRequest("data/demo/jsonFile100.json", function (response) {
				//<debug>
				console.log('debug', arguments);
				//</debug>
				var engineList = demo.initializeEditor(response);
				$("#textdemo").on("change", function (param) {
					//<debug>
					console.log('change', arguments);
					//</debug>

				});
				$("#textdemo").change(function (param) {
					//<debug>
					console.log('change', arguments);
					//</debug>
				});

				$(document).on("keyup", ".blackboard", function () {
					var search = this.textContent.trim();
					//<debug>
					console.log('cadena a buscar', search);
					//</debug>
					engineList.search(search, function (param) {
						//<debug>
						console.log('sincrono', arguments);
						//</debug>
						demo.renderData(param);
					}, function (param) {
						//<debug>
						console.log('asincrono', arguments);
						//</debug>
					});
				});

				$("#textdemo").bind("propertychange change keyup paste input", function () {
					// do stuff;
					//<debug>
					console.log('bind', arguments);
					//</debug>
				});
			});
		},
		/**
		 * initializeEditor description
		 * @private
		 */
		initializeEditor: function (rawData) {
			//<debug>
			console.log('debug', arguments);
			//</debug>
			var engineList = new Bloodhound({
				// datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
				datumTokenizer: Bloodhound.tokenizers.obj.whitespace('v'),
				queryTokenizer: Bloodhound.tokenizers.whitespace,
				// identify: function (obj) { return obj.uuid; },
				identify: function (obj) { return obj.i; },
				local: rawData
			});

			engineList.initialize();
			demo.engineList = engineList;


			// engineList.add(individualData);

			// var search = engineList.get("71D19F57-27E7-426C-9AD4-21A4903D438C");
			// var query = engineList.search("key", syncFn, asyncFn);

			// $('#remote .typeahead').typeahead(null, {
			// 	name: 'best-pictures',
			// 	display: 'value',
			// 	source: engineList
			// });

			// $('.custom-templates .typeahead').typeahead(null, {
			// 	name: 'best-pictures',
			// 	display: 'value',
			// 	source: engineList,
			// 	templates: {
			// 		empty: [
			// 			'<div class="empty-message">',
			// 			'unable to find any text',
			// 			'</div>'
			// 		].join('\n'),
			// 		suggestion: Handlebars.compile('<div><strong>{{value}}</strong> – {{year}}</div>')
			// 	}
			// });
			return engineList;
		},
		/**
		 * getRestData description
		 * @private
		 */
		loadRestData: function () {
			demo.sendRequest("http://192.168.14.72:8084/tools.svc/get/registries", function (response) {
				//<debug>
				console.log('debug', arguments);
				//</debug>
				// var alldata = JSON.stringify(response.individualList);
				var alldata = JSON.stringify(response.r);
				var data2 = new Blob([alldata], { type: 'text/json' });
				var link = document.createElement("A");
				link.setAttribute("download", 'jsonFile');
				link.href = window.URL.createObjectURL(data2);
				// link.setAttribute("download", 'jsonFileALL.json');
				link.setAttribute("download", 'jsonFile2.json');
				link.click();
			}, '{"uuidToken": "B3A75069-67C3-42DA-BED1-36DFDE52CCAF" }', "POST");
		},
		/**
		 * initComponent description
		 * @private
		 */
		initComponent: function () {
			demo.sendRequest("data/dictionary.json", demo.initializeEditor);
		}
	};

	/**
	 * init jquery
	 */
	// demo.initComponent();

});