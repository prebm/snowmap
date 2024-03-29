var fs = require('fs-extra'), // https://www.npmjs.org/package/fs-extra
	exec = require('child_process').exec,
	mapnik = require('mapnik');

// register fonts and datasource plugins
mapnik.register_default_fonts();
mapnik.register_default_input_plugins();

var bounds = [-80000, 6445000, 1120000, 7945000],
	tileSize = 50000,
	resolution = 10,
	mapSize = tileSize / resolution;

// Clean tiles folder
//fs.removeSync('tiles');

function run (command, callback){
	//console.log(command);
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




function createTile (x, y, callback) {

	var map = new mapnik.Map(mapSize, mapSize),
		west = bounds[0] + (x * tileSize),
		north = bounds[3] - (y * tileSize),
		east = west + tileSize,
		south = north - tileSize,	
		tileBounds = [west, south, east, north],
		folder = 'tiles/' + x + '/' + y + '/',
		relief = false,
		hillshade = false,
		slopeshade = false,
		slope = false;

	// Create folder
	fs.mkdirsSync(folder);

	// Copy style file
	fs.copySync('styles/map.xml', folder + '/map.xml');

	function createMap (relief, hillshade, slopeshade, slope) {
		if (relief && hillshade && slopeshade && slope) {

			map.load(folder + 'map.xml', function (err, map) {
				if (err) throw err;

				map.extent = tileBounds;

				var im = new mapnik.Image(mapSize, mapSize);
				map.render(im, function (err, im) {
					if (err) throw err;
					im.encode('png', function(err, buffer) {
						if (err) throw err;
						fs.writeFile(folder + 'map.png', buffer, function (err) {
							if (err) throw err;

							// Convert to GeoTIFF
							var file = 'tiles/' + x + '/' + y + '.tif';
							run('gdal_translate -of GTiff -a_ullr ' + [west, north, east, south].join(' ') + ' -a_srs EPSG:32633 ' + folder + 'map.png ' + file, function(){
								//fs.removeSync(folder);
								callback(file);
							});

						});
					});
				});

			});

		}
	}

	// Extract DEM data
	run('gdalwarp -te ' + tileBounds.join(' ') + ' -ts ' + mapSize + ' ' + mapSize + ' -r bilinear -co compress=lzw /Volumes/Seagate/Data/Norway/dem/utm33/utm33_10m.vrt ' + folder + 'dem.tif', function(){

		// Create color relief
		run('gdaldem color-relief -co compress=lzw ' + folder + 'dem.tif styles/color-relief.txt ' + folder + 'color-relief.tif', function(){
			createMap(relief = true, hillshade, slopeshade, slope);
		});	

		// Create hillshade
		run('gdaldem hillshade -co compress=lzw ' + folder + 'dem.tif ' + folder + 'hillshade.tif', function(){

			// Create snow hillshade
			run('gdaldem color-relief -co compress=lzw ' + folder + 'hillshade.tif styles/hillshade-snow.txt ' + folder + 'hillshade-snow.tif', function(){
				createMap(relief, hillshade = true, slopeshade, slope);
			});
		});

		// Create slope
		run('gdaldem slope ' + folder + 'dem.tif ' + folder + 'slope.tif', function(){

			// Create snow slopehade
			run('gdaldem color-relief -co compress=lzw ' + folder + 'slope.tif styles/slopeshade-snow.txt ' + folder + 'slopeshade-snow.tif', function(){
				createMap(relief, hillshade, slopeshade = true, slope);
			});

			// Mark steep slope
			run('gdaldem color-relief -co compress=lzw ' + folder + 'slope.tif styles/slope-steep.txt ' + folder + 'slope-steep.tif', function(){

				// Convert to pnm format supported by potrace
				run('gdal_translate -of PNM -ot Byte ' + folder + 'slope-steep.tif ' + folder + 'slope-steep.pnm', function(){

					// Vectorize steep terrain
					run('potrace -t 1 -b geojson ' + folder + 'slope-steep.pnm -o ' + folder + 'slope-steep.geojson -x ' + resolution + '  -L ' + west + ' -B ' + south, function(){
						addCrs(folder + 'slope-steep.geojson', function(){
							createMap(relief, hillshade, slopeshade, slope = true);
						});
					});

				});

			});

		});	

	});

}


var tiles = [
	{x: 1, y: 21}, {x: 2, y: 21}, {x: 3, y: 21}, {x: 4, y: 21}, {x: 5, y: 21}, {x: 6, y: 21}, {x: 7, y: 21}, 	
	{x: 1, y: 22}, {x: 2, y: 22}, {x: 3, y: 22}, {x: 4, y: 22}, {x: 5, y: 22}, {x: 6, y: 22}, {x: 7, y: 22}, 	
	{x: 1, y: 23}, {x: 2, y: 23}, {x: 3, y: 23}, {x: 4, y: 23}, {x: 5, y: 23}, {x: 6, y: 23}, {x: 7, y: 23}, 	
	{x: 1, y: 24}, {x: 2, y: 24}, {x: 3, y: 24}, {x: 4, y: 24}, {x: 5, y: 24}, {x: 6, y: 24}, {x: 7, y: 24}, 	
	{x: 1, y: 25}, {x: 2, y: 25}, {x: 3, y: 25}, {x: 4, y: 25}, {x: 5, y: 25}, {x: 6, y: 25}, {x: 7, y: 25}, 		
	{x: 1, y: 26}, {x: 2, y: 26}, {x: 3, y: 26}, {x: 4, y: 26}, {x: 5, y: 26}, {x: 6, y: 26}, {x: 7, y: 26}, 	
	{x: 1, y: 27}, {x: 2, y: 27}, {x: 3, y: 27}, {x: 4, y: 27}, {x: 5, y: 27}, {x: 6, y: 27}, {x: 7, y: 27}						
];

var tiles = [{"x":18,"y":0},{"x":19,"y":0},{"x":20,"y":0},{"x":21,"y":0},{"x":22,"y":0},{"x":23,"y":0},{"x":16,"y":1},{"x":17,"y":1},{"x":18,"y":1},{"x":19,"y":1},{"x":20,"y":1},{"x":21,"y":1},{"x":22,"y":1},{"x":23,"y":1},{"x":14,"y":2},{"x":15,"y":2},{"x":16,"y":2},{"x":17,"y":2},{"x":18,"y":2},{"x":19,"y":2},{"x":20,"y":2},{"x":21,"y":2},{"x":22,"y":2},{"x":23,"y":2},{"x":13,"y":3},{"x":14,"y":3},{"x":15,"y":3},{"x":16,"y":3},{"x":17,"y":3},{"x":18,"y":3},{"x":19,"y":3},{"x":20,"y":3},{"x":22,"y":3},{"x":23,"y":3},{"x":13,"y":4},{"x":14,"y":4},{"x":15,"y":4},{"x":16,"y":4},{"x":17,"y":4},{"x":18,"y":4},{"x":19,"y":4},{"x":20,"y":4},{"x":22,"y":4},{"x":11,"y":5},{"x":12,"y":5},{"x":13,"y":5},{"x":14,"y":5},{"x":15,"y":5},{"x":16,"y":5},{"x":17,"y":5},{"x":18,"y":5},{"x":19,"y":5},{"x":20,"y":5},{"x":10,"y":6},{"x":11,"y":6},{"x":12,"y":6},{"x":13,"y":6},{"x":14,"y":6},{"x":15,"y":6},{"x":17,"y":6},{"x":18,"y":6},{"x":19,"y":6},{"x":9,"y":7},{"x":10,"y":7},{"x":11,"y":7},{"x":12,"y":7},{"x":13,"y":7},{"x":14,"y":7},{"x":15,"y":7},{"x":9,"y":8},{"x":10,"y":8},{"x":11,"y":8},{"x":12,"y":8},{"x":13,"y":8},{"x":14,"y":8},{"x":8,"y":9},{"x":9,"y":9},{"x":10,"y":9},{"x":11,"y":9},{"x":12,"y":9},{"x":9,"y":10},{"x":10,"y":10},{"x":11,"y":10},{"x":12,"y":10},{"x":8,"y":11},{"x":9,"y":11},{"x":10,"y":11},{"x":11,"y":11},{"x":12,"y":11},{"x":8,"y":12},{"x":9,"y":12},{"x":10,"y":12},{"x":11,"y":12},{"x":8,"y":13},{"x":9,"y":13},{"x":10,"y":13},{"x":11,"y":13},{"x":7,"y":14},{"x":8,"y":14},{"x":9,"y":14},{"x":10,"y":14},{"x":11,"y":14},{"x":7,"y":15},{"x":8,"y":15},{"x":9,"y":15},{"x":10,"y":15},{"x":5,"y":16},{"x":6,"y":16},{"x":7,"y":16},{"x":8,"y":16},{"x":9,"y":16},{"x":10,"y":16},{"x":4,"y":17},{"x":5,"y":17},{"x":6,"y":17},{"x":7,"y":17},{"x":8,"y":17},{"x":9,"y":17},{"x":2,"y":18},{"x":3,"y":18},{"x":4,"y":18},{"x":5,"y":18},{"x":6,"y":18},{"x":7,"y":18},{"x":8,"y":18},{"x":1,"y":19},{"x":2,"y":19},{"x":3,"y":19},{"x":4,"y":19},{"x":5,"y":19},{"x":6,"y":19},{"x":7,"y":19},{"x":8,"y":19},{"x":0,"y":20},{"x":1,"y":20},{"x":2,"y":20},{"x":3,"y":20},{"x":4,"y":20},{"x":5,"y":20},{"x":6,"y":20},{"x":7,"y":20},{"x":8,"y":20},{"x":0,"y":21},{"x":1,"y":21},{"x":2,"y":21},{"x":3,"y":21},{"x":4,"y":21},{"x":5,"y":21},{"x":6,"y":21},{"x":7,"y":21},{"x":8,"y":21},{"x":0,"y":22},{"x":1,"y":22},{"x":2,"y":22},{"x":3,"y":22},{"x":4,"y":22},{"x":5,"y":22},{"x":6,"y":22},{"x":7,"y":22},{"x":8,"y":22},{"x":9,"y":22},{"x":0,"y":23},{"x":1,"y":23},{"x":2,"y":23},{"x":3,"y":23},{"x":4,"y":23},{"x":5,"y":23},{"x":6,"y":23},{"x":7,"y":23},{"x":8,"y":23},{"x":9,"y":23},{"x":0,"y":24},{"x":1,"y":24},{"x":2,"y":24},{"x":3,"y":24},{"x":4,"y":24},{"x":5,"y":24},{"x":6,"y":24},{"x":7,"y":24},{"x":8,"y":24},{"x":0,"y":25},{"x":1,"y":25},{"x":2,"y":25},{"x":3,"y":25},{"x":4,"y":25},{"x":5,"y":25},{"x":6,"y":25},{"x":7,"y":25},{"x":8,"y":25},{"x":0,"y":26},{"x":1,"y":26},{"x":2,"y":26},{"x":3,"y":26},{"x":4,"y":26},{"x":5,"y":26},{"x":6,"y":26},{"x":7,"y":26},{"x":8,"y":26},{"x":0,"y":27},{"x":1,"y":27},{"x":2,"y":27},{"x":3,"y":27},{"x":4,"y":27},{"x":5,"y":27},{"x":6,"y":27},{"x":7,"y":27},{"x":0,"y":28},{"x":1,"y":28},{"x":2,"y":28},{"x":3,"y":28},{"x":4,"y":28},{"x":5,"y":28},{"x":6,"y":28},{"x":7,"y":28},{"x":1,"y":29},{"x":2,"y":29},{"x":3,"y":29},{"x":4,"y":29}];

var count = 0;
function createTileset (tile) {
	createTile(tile.x, tile.y, function(file) {
		console.log(file);
		if (++count < tiles.length) {
			createTileset(tiles[count])
		}
	});
}

//createTileset(tiles[0]);




createTile(4, 22, function(file) {
	console.log(file);
});

