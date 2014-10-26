var pngparse = require("pngparse");




pngparse.parseFile("images/2014-10-25.png", function(err, image) {
	if (err) throw err; 

	var data = image.data;

	var snow = {
		'9227430': 'Våt', // 222 x 163 x 255
		'8208450': 'Tørr' // 145 x 222 x 255
	};

	for (var i = 0; i < image.width * image.height; i++) {
		var value = (data[i * 3] * data[i * 3 + 1] * data[i * 3 + 2]).toString();

		if (snow[value]) {
			console.log(i, Math.floor(i / image.height), i % image.height, snow[value]);
		}
	}

});