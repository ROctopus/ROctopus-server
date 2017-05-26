var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var url = require('url');
var fs = require('fs');
var sq = require('sqlite3').verbose();
var db = new sq.Database('./public/queue.db');
var path = require('path')

//This will open a server on port 8080.
app.listen(8080);
console.log("Serving on port 8080")

// Http handler function
function handler (request, response) {

    var filePath = __dirname + '/public' + url.parse(request.url).pathname;
    if (filePath == __dirname + '/public/')
        filePath = __dirname + '/public/index.html';
    
    
    var extname = String(path.extname(filePath)).toLowerCase();
    var contentType = 'text/html';
    var mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.svg': 'application/image/svg+xml'
    };

    contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code == 'ENOENT'){
                fs.readFile('./public/404.html', function(error, content) {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                response.end();
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });
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
        // Check if user directory exists
        var targetDir = __dirname+"/results/"+row.USER
        if (!fs.existsSync(targetDir)){
            fs.mkdirSync(targetDir);
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
  
  socket.on('add_task', function(data){
    console.log("taskadd requested")
    // get lowest jobID
    db.get('SELECT * FROM queue ORDER BY ID DESC', function(err, row){
      if (err){
        console.log(err);
        socket.emit('err', {msg: 7}); // Database did not respond
      } else {
        var curID = parseInt(row.ID) + 1
        // Create sql query
        var insertQuery = 'INSERT INTO queue VALUES(' +
          curID + ',"' + 
          data.rscript + '","' + 
          data.rdata + '","' + 
          data.user + 
          '","qw")';
        console.log(insertQuery);
        // run query
        db.run(insertQuery, function(err){
          if (err) {
            console.log(err);
            socket.emit('err', {msg: 8}); // Task insertion failed
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
  return bu.toString('base64');
}
