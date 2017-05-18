var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var url = require('url');
var fs = require('fs');
var sq = require('sqlite3').verbose();
var db = new sq.Database('./public/queue.db');


//This will open a server on port 8080.
app.listen(8080);
console.log("Serving on port 8080")

// Http handler function
function handler (req, res) {

    // Using URL to parse the requested URL
    var path = url.parse(req.url).pathname;

    // Managing the root route
    if (path == '/') {
        index = fs.readFile(__dirname+'/public/index.html', 
            function(error,data) {

                if (error) {
                    res.writeHead(500);
                    return res.end("Error: unable to load index.html");
                }

                res.writeHead(200,{'Content-Type': 'text/html'});
                res.end(data);
            });
    // Managing the route for the javascript files
    } else if( /\.(js)$/.test(path) ) {
        index = fs.readFile(__dirname+'/public'+path, 
            function(error,data) {

                if (error) {
                    res.writeHead(500);
                    return res.end("Error: unable to load " + path);
                }

                res.writeHead(200,{'Content-Type': 'text/plain'});
                res.end(data);
            });
    } else {
        res.writeHead(404);
        res.end("Error: 404 - File not found.");
    }

}


// Web Socket Connection
io.sockets.on('connection', function (socket) {
  var socketID = socket.id;
  var clientIP = socket.request.connection.remoteAddress;
  
  socket.emit('message', { msg: 0 })
  
  console.log('New connection from '+clientIP+' assigned to socket '+socketID);
  // Worker requests a job, get it from database and send it back if available!
  socket.on('request_job', function(data){
    console.log("job requested.");
    if (data) { console.log(data) };
    // Check if any jobs are available
    db.get('SELECT COUNT(*) FROM queue WHERE STATUS="qw"', function(err,nrow){
      if(err){
        console.log(err);
        socket.emit('err', { msg: 2 }); // Failed to count available jobs
      } else {
        if (nrow[['COUNT(*)']]>0){
          console.log(nrow[['COUNT(*)']]+" jobs available.");
          // If job is available, lock it and send it!
          // Select the first available job from the table
          db.get('SELECT * FROM queue WHERE STATUS="qw" ORDER BY ID', function(err,row){
            if (err){
              console.log(err);
              socket.emit('err', { msg: 3 }); // No job found
            } else {
              console.log("Assigning jobID and locking "+row.ID);
              var result = row
              // lock the job
              db.run('UPDATE queue SET STATUS="lc" WHERE ID='+row.ID, 
              function(err){ 
                if (err){
                  console.log(err);
                  socket.emit('err', { msg: 4 }); // Job failed to lock
                } else {
                  // Send job info to the worker
                  console.log("Sending job to client");
                  socket.emit('result_returned',result);
                }
              });
            }
          });
        } else {
          socket.emit('err', { msg: 1 }); // No jobs available
        }
      }
    });
  });
  
  // Worker sends back results, save them.
  socket.on('send_results', function(data){
    
    var jobID = data.ID;
    var extension = data.ext;
    var bytes = new Buffer(data.content, 'base64');
    
    // determine where to save the job results
    db.get('SELECT user FROM queue WHERE ID='+jobID, function(err, row){
      if (err){
        console.log(err);
        socket.emit('err', { msg: 5 }); // Save folder not found
      } else {
        // Check if directory exists
        var targetDir = __dirname+"/results/"+row.USER
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        // write file to results directory
        fs.writeFile(targetDir+"/"+jobID, bytes, function(err) {
            if(err) {
              console.log(err);
              socket.emit('err', { msg: 6 }); // File save failed
            } else {
              console.log("The file was saved!");
              socket.emit('message', { msg: 1 }); // File successfully saved
            }
        });
      }
    });
    
  });
});
