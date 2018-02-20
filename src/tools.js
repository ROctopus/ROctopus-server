const archiver = require("archiver");
const fs = require("fs")

module.exports = {
  genID: function() {
    // This function generates a unique job identifier based on the current time
    // get current time in microseconds
    var st = process.hrtime().toString().replace(",", "");
    // add random component
    var st2 = st + "-" + Math.random().toString().replace("0.", "").substr(0, 5);
    // base64 encode
    bu = new Buffer(st2, "binary");
    return bu.toString("base64");
  }, 
  
  zipFolder: function(srcFolder, zipFilePath, callback) {
  	var output = fs.createWriteStream(zipFilePath);
  	var zipArchive = archiver('zip', { zlib: { level: 9 } });

  	output.on('close', function() {
  		callback();
  	});

  	zipArchive.pipe(output);

  	zipArchive.directory(srcFolder, false);

  	zipArchive.finalize(function(err, bytes) {
  		if(err) {
  			callback(err);
  		}
  	});
  },
  
  sysTime: function(f, args) {
    // input function and array of args, output time and result of function
    if (typeof args != "array") {
      args = [ args ];
    }
    var start = process.hrtime();
    var out = f.apply(this, args);
    var elapsed = process.hrtime(start);
    console.log((elapsed[0] + elapsed[1]/1000000) + " ms");
    return(out);
  }
}
