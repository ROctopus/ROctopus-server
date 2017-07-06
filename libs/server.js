module.exports = {
  // Http handler function for fileserving and landing page
  handler: function(request, response) {
    const url = require("url");
    const fs = require("fs");
    const path = require("path");
    
    var filePath = __dirname + "/../public" + url.parse(request.url).pathname;
    if (filePath == __dirname + "/../public/")
      filePath = __dirname + "/../public/index.html";
  
  
    var extname = String(path.extname(filePath)).toLowerCase();
    var contentType = "text/html";
    var mimeTypes = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpg",
      ".gif": "image/gif",
      ".wav": "audio/wav",
      ".mp4": "video/mp4",
      ".woff": "application/font-woff",
      ".ttf": "application/font-ttf",
      ".eot": "application/vnd.ms-fontobject",
      ".otf": "application/font-otf",
      ".svg": "application/image/svg+xml",
      ".zip": "application/zip"
    };
  
    contentType = mimeTypes[extname] || "application/octet-stream";
  
    fs.readFile(filePath, function(error, content) {
      if (error) {
        if (error.code == "ENOENT") {
          fs.readFile("../public/404.html", function(error, content) {
            response.writeHead(200, {
              "Content-Type": contentType
            });
            response.end(content, "utf-8");
          });
        } else {
          response.writeHead(500);
          response.end("Sorry, check with the site admin for error: " + error.code + " ..\n");
          response.end();
        }
      } else {
        response.writeHead(200, {
          "Content-Type": contentType
        });
        response.end(content, "utf-8");
      }
    });
  }

}
