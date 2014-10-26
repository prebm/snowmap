var fs = require('fs'),
	request = require('request'),
	pngparse = require('pngparse'),
	Png = require('png').Png,
	sys = require('sys'),
	exec = require('child_process').exec;

var download = function (url, date, callback) {
	request({
		url: url,
		encoding: null
	}, function (err, response, body) {
		if (err) throw err;
		callback(body, date); 
	});
};

var parse = function (buffer, date) {
	var snow = {
		//'510': 'Lite', // 255 + 255 + 0
		'640': 'Våt',  // 222 + 163 + 255
		'622': 'Tørr'  // 145 + 222 + 255
	};

	pngparse.parseBuffer(buffer, function(err, image) {
		if (err) throw err;

		var data = image.data; // In buffer

		var out = new Buffer(image.width * image.height * 4); // Out buffer

		for (var i = 0; i < image.width * image.height; i++) {
			var value = (data[i * 3] + data[i * 3 + 1] + data[i * 3 + 2]).toString(),
	  			y = Math.floor(i / image.width),
				x = i % image.width;

			if (snow[value]) {
				out[i * 3] = 0;
				out[i * 3 + 1] = 0;
				out[i * 3 + 2] = 0;
			} else {
				out[i * 3] = 255;
				out[i * 3 + 1] = 255;
				out[i * 3 + 2] = 255;
			}
		}

		var png = new Png(out, image.width, image.height, 'rgb');

		var png_image = png.encodeSync();

		//fs.writeFileSync('images/' + date + '.png', png_image.toString('binary'), 'binary');

		fs.writeFile('images/' + date + '.png', png_image.toString('binary'), 'binary', function (err) {
			if (err) throw err;
  			convert(date);
		});

	});

};

var convert = function (date) {
	exec('gdal_translate -of PNM -ot Byte images/' + date + '.png tmp/' + date + '.pgm', function(err, stdout, stderr) {
		potrace(date);
	});
}

var potrace = function (date) {
	exec('potrace -b geojson tmp/' + date + '.pgm -o geojson/' + date + '.geojson -x 1000 -L -80000 -B 6445000', function(err, stdout, stderr) {
		addCrs(date);
	});
}

var addCrs = function (date) {
	var file = 'geojson/' + date + '.geojson';

	fs.readFile(file, 'utf8', function (err, data) {
		if (err) throw err;

		var geojson = JSON.parse(data);

		geojson.crs = {
  			type: 'name',
  			properties: {
    			name: 'urn:ogc:def:crs:EPSG::32633'
  			}
		};

		fs.writeFile(file, JSON.stringify(geojson, null, '\t'), 'utf8', function (err) {
			if (err) throw err;
  			console.log(file);
		});
	});
}

for (var i = 1; i < 27; i++) {
	var date = '2014-10-' + i,
		wms  = 'http://arcus.nve.no/WMS_server/wms_server.aspx?&request=GetMap&service=WMS&transparent=true&format=image%2Fpng&bgcolor=0xffffff&version=1.1.1&layers=ski&styles=&TIME=' + date + '&bbox=-80000%2C6445000%2C1120000%2C7945000&srs=EPSG%3A32633&width=1200&height=1500&custRefresh=0.09493798622861505',
		filename = date + '.png';

	download(wms, date, parse);
}