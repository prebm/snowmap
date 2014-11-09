var fs = require('fs'),
	request = require('request'),
	pngparse = require('pngparse'),
	Png = require('png').Png;

var date = '2014-11-09',
	bounds = [-80000, 6445000, 1120000, 7945000],
	resolution = 1000, 
	width = (bounds[2] - bounds[0]) / resolution, 
	height = (bounds[3] - bounds[1]) / resolution,	
	url = 'http://arcus.nve.no/WMS_server/wms_server.aspx?&request=GetMap&service=WMS&transparent=true&format=image%2Fpng&bgcolor=0xffffff&version=1.1.1&layers=ski&styles=&TIME=' + date + '&bbox=' + bounds.join() + '&srs=EPSG%3A32633&width=' + width + '&height=' + height,
	snow = {
		//'510': 'Lite', // 255 + 255 + 0
		'640': 'Våt',  // 222 + 163 + 255
		'622': 'Tørr'  // 145 + 222 + 255
	};

request({ url: url, encoding: null }, function (err, response, body) {
	if (err) throw err;

	pngparse.parseBuffer(body, function(err, image) {
		if (err) throw err;

		var buffer = image.data,
			out = new Buffer(image.width * image.height * 3); 

		for (var i = 0; i < image.width * image.height; i++) {
			var value = (buffer[i * 3] + buffer[i * 3 + 1] + buffer[i * 3 + 2]).toString(),
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

		var png = new Png(out, image.width, image.height, 'rgb'),
			png_image = png.encodeSync();

		fs.writeFile('snow/' + date + '.png', png_image.toString('binary'), 'binary', function (err) {
			if (err) throw err;
  			//convert(date);
		});

	});


});