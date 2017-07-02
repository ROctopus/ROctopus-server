var app = require("http").createServer(handler);
var io = require("socket.io")(app);
var url = require("url");
var fs = require("fs");
var sq = require("sqlite3").verbose();
var db = new sq.Database("./db/queue.db");
var path = require("path")

// Set the API compliance version
var apiVersion = "0.1.0";

//This will open a server on port 8080.
app.listen(8080);
console.log("Serving on port 8080")

// Http handler function for fileserving and landing page
function handler (request, response) {

    var filePath = __dirname + "/public" + url.parse(request.url).pathname;
    if (filePath == __dirname + "/public/")
        filePath = __dirname + "/public/index.html";
    
    
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
            if(error.code == "ENOENT"){
                fs.readFile("./public/404.html", function(error, content) {
                    response.writeHead(200, { "Content-Type": contentType });
                    response.end(content, "utf-8");
                });
            }
            else {
                response.writeHead(500);
                response.end("Sorry, check with the site admin for error: "+error.code+" ..\n");
                response.end();
            }
        }
        else {
            response.writeHead(200, { "Content-Type": contentType });
            response.end(content, "utf-8");
        }
    });
}


// Web Socket Connection
io.sockets.on("connection", function (socket) {
  var socketID = socket.id;
  var clientIP = socket.request.connection.remoteAddress;
  
  socket.emit("msg", 0)
  
  console.log("New connection from "+clientIP+" assigned to socket "+socketID);
  
  // Socket connections
  
  // Worker requests a job, get it from database and send it back if available!
  socket.on("request_task", function(data) {
    console.log("task requested")
    if (data) { 
      if (data.version != apiVersion) {
        socket.emit("err", -1);
      } else {
        // Check if any tasks are available
        db.get("SELECT COUNT(*) FROM queue WHERE STATUS='qw'", function(err,nrow) {
          if(err){
            console.log(err);
            socket.emit("err", 2); // Failed to count available tasks
          } else {
            if (nrow[["COUNT(*)"]]>0) {
              console.log(nrow[["COUNT(*)"]]+" jobs available.");
              // If task is available, lock it and send it!
              // Select the first available task from the table
              var taskQuery = `
              SELECT jobId, iterNo, contentUrl
              FROM queue
              WHERE status= 'qw'
              ORDER BY datetime(timeStamp) DESC, iterNo ASC;
              `
              db.get(taskQuery, function(err,row) {
                if (err){
                  console.log(err);
                  socket.emit("err", 3); // No task found
                } else {
                  var task = row;
                  console.log("Assigning and locking " + row.jobId + row.iterNo );
                  var lockQuery = `
                  UPDATE queue 
                  SET status = "lc" 
                  WHERE jobId = '` + row.jobId + `'
                  AND iterNo = ` + row.iterNo + `
                  ;
                  `
                  db.run(lockQuery, function(err){
                    if (err){
                      console.log(err);
                      socket.emit("err", 4); // Task failed to lock
                    } else {
                      // We can send the task to the worker!
                      console.log("Sending task to client");
                      task.version = apiVersion;
                      socket.emit("return_task", task);
                    }
                  });
                }
              });
            } else {
              socket.emit("err", 1); // No tasks available
            }
          }
        });
      }
    }

  });
  
  // Worker sends back results, save them.
  socket.on("send_results", function(data){
    
    if (data.version == "0.1.0"){
      var jobId = data.jobId;
      var iterNo = data.iterNo;
      var bytes = new Buffer(data.content, "base64");
      
      if (data.exitStatus != 0){
        console.log("something went wrong with task " + jobId + "_" + iterNo);
        console.log(bytes.toString());
        socket.emit("err", -1);
        
      } else {
        // determine where to save the job results
        var query = "SELECT user FROM queue WHERE jobId = '" + jobId + "'"
        db.get(query, (err, row) => {
          if (err){
            
            console.log(err);
            socket.emit("err", 5); // User not found
            
          } else {
            // Check if correct directory exists and otherwise make it
            var userDir = __dirname+"/results/" + row.user;
            if (!fs.existsSync(userDir)){
                fs.mkdirSync(userDir);
            }
            var jobDir = userDir + "/" + jobId
            if (!fs.existsSync(jobDir)){
                fs.mkdirSync(jobDir);
            }
            
            // write file to results directory
            fs.writeFile(jobDir + "/" + iterNo, bytes, function(err) {
                if(err) {
                  console.log(err);
                  socket.emit("err", 6); // File save failed
                } else {
                  console.log("The file was saved!");
                  socket.emit("msg", 2); // File successfully saved
                }
            });
          }
        });
      }

    } else {
      console.log("Incorrect api version");
      socket.emit("err", -1)
    }
  });
  
  // Alice submits a job
  socket.on("submit_job", function(data){
    console.log("Job add requested")
    
    // Check version
    if (data.version == "0.1.0"){
      
      
      
    } else {
      
      socket.emit("err", -1)
      
    }
    
    
    // get lowest jobID
    db.get("SELECT * FROM queue ORDER BY ID DESC", function(err, row){
      if (err){
        console.log(err);
        socket.emit("err", {msg: 7}); // Database did not respond
      } else {
        var curID = parseInt(row.ID) + 1
        // Create sql query
        var insertQuery = "INSERT INTO queue VALUES(" +
          curID + ",'" + 
          data.rscript + "','" + 
          data.rdata + "','" + 
          data.user + 
          "','qw')";
        console.log(insertQuery);
        // run query
        db.run(insertQuery, function(err){
          if (err) {
            console.log(err);
            socket.emit("err", {msg: 8}); // Task insertion failed
          } else {
            socket.emit("task_added", { "ID": curID });
          }
        }); 
      }
    });
  });
    
});


// Functions
function genID(){
  // This function generates a unique job identifier based on the current time
  // get current time in microseconds
  var st = process.hrtime().toString().replace(",","");
  // add random component
  var st2 = st + "-" + Math.random().toString().replace("0.","").substr(0,5);
  // base64 encode
  bu = new Buffer(st2, "binary");
  return bu.toString("base64");
}
