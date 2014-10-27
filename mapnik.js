var mapnik = require('mapnik');
var fs = require('fs');

// register fonts and datasource plugins
mapnik.register_default_fonts();
mapnik.register_default_input_plugins();

//console.log(mapnik);

var map = new mapnik.Map(12000, 15000);
map.load('styles/snowmap.xml', function (err, map) {
    if (err) throw err;
    map.zoomAll();
    var im = new mapnik.Image(12000, 15000);
    map.render(im, function (err,im) {
      if (err) throw err;
      im.encode('png', function(err, buffer) {
          if (err) throw err;
          fs.writeFile('images/map.png', buffer, function (err) {
              if (err) throw err;
              console.log('saved map image to map.png');
          });
      });
    });
});
