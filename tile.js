var fs = require('fs-extra'), // https://www.npmjs.org/package/fs-extra
	exec = require('child_process').exec;

var bounds = [-80000, 6445000, 1120000, 7945000],
	tileSize = 50000,
	resolution = 10,
	x = process.argv[2] || 4,
	y = process.argv[3] || 22,
	west = bounds[0] + (x * tileSize),
	north = bounds[3] - (y * tileSize),
	east = west + tileSize,
	south = north - tileSize,	
	tileBounds = [west, south, east, north],
	folder = 'tiles/' + x + '/' + y + '/';

function run (command, callback){
	console.log(command);
	exec(command, function (err, stdout, stderr) {
		if (err) throw err;
		if (err) throw stderr;
		callback(stdout);
	});
}

// Add CRS to geojson file
function addCrs (file, callback){
	fs.readJson(file, function(err, geojson) {
		if (err) throw err;

		geojson.crs = {
			type: 'name',
			properties: {
				name: 'urn:ogc:def:crs:EPSG::32633'
			}
		};

		fs.writeJson(file, geojson, function(err){
			if (err) throw err;
			callback();
		});
	});
}

// Remove folder
fs.removeSync(folder);

// Create folder
fs.mkdirsSync(folder);

// Extract DEM data
run('gdalwarp -te ' + tileBounds.join(' ') + ' -r bilinear -co compress=lzw /data/norway/dem/utm33/utm33_10m.vrt ' + folder + 'dem.tif', function(){

	// Create color relief
	run('gdaldem color-relief -co compress=lzw ' + folder + 'dem.tif styles/color-relief.txt ' + folder + 'color-relief.tif', function(){

	});	

	// Create hillshade
	run('gdaldem hillshade -co compress=lzw ' + folder + 'dem.tif ' + folder + 'hillshade.tif', function(){

		// Create snow hillshade
		run('gdaldem color-relief -co compress=lzw ' + folder + 'hillshade.tif styles/hillshade-snow.txt ' + folder + 'hillshade-snow.tif', function(){

		});
	});

	// Create slope
	run('gdaldem slope ' + folder + 'dem.tif ' + folder + 'slope.tif', function(){

		// Mark steep slope
		run('gdaldem color-relief -co compress=lzw ' + folder + 'slope.tif styles/slope-steep.txt ' + folder + 'slope-steep.tif', function(){

			// Convert to pnm format supported by potrace
			run('gdal_translate -of PNM -ot Byte ' + folder + 'slope-steep.tif ' + folder + 'slope-steep.pnm', function(){

				// Vectorize steep terrain
				run('potrace -t 1 -b geojson ' + folder + 'slope-steep.pnm -o ' + folder + 'slope-steep.geojson -x ' + resolution + '  -L ' + west + ' -B ' + south, function(){
					addCrs(folder + 'slope-steep.geojson', function(){
						console.log('DONE!');
					});
				});

			});

		});

	});	

});