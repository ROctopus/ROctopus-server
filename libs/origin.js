module.exports = {
  // Upon job submit
  addJob: function(data, opts, fs, db, uz, socket) {
    console.log("Job submit requested");

    // Check version
    if (data.meta.version != opts.apiVersion) {
      console.log("incorrect api version")
      socket.emit("err", -1);
      return;
    }

    // First, check if jobID already exists
    var query = "SELECT * FROM queue WHERE jobId = '" + data.meta.jobId + "' AND user = '" + data.meta.user + "'";

    db.get(query, (err, row) => {
      if (err) {
        // some database error occurred
        console.log(err);
        socket.emit("err", -1); // database error
      } else if (typeof row != 'undefined') {
        // jobId already exists!
        console.log("Tried to add job that exists: " + data.meta.user + " " + data.meta.jobId);
        socket.emit("err", 7);
      } else {
        // Now we can proceed to add the job
        unpackRocto(data, fs, uz, (err, meta) => {
          if (err) {
            console.log("Error occurred when unpacking: " + err);
            socket.emit("err", -1);
          } else {
            // add the iterations to the database
            var contentUrl = "http://" + opts.ip + "/store/" + data.meta.user + "/" + data.meta.jobId + "/roctoJob.rocto";
            db.serialize(function() {
              var nAdded = 0;
              for (var i = 0; i < data.meta.numTasks; i++) {
                db.run("INSERT INTO queue (jobId, user, iterNo, contentUrl, status) VALUES (?, ?, ?, ?, ?)", [
                  data.meta.jobId,
                  data.meta.user,
                  i + 1,
                  contentUrl,
                  "qw"
                ], (err) => {
                  if (err) {
                    console.log("Error occured when adding to database: " + err);
                    socket.emit("err", -1);
                  } else {
                    nAdded++;
                    if (nAdded == data.meta.numTasks) {
                      console.log("Tasks successfully added");
                      socket.emit("msg", 4);
                    }
                  }
                });
              }
            });
          }
        });
      }
    });
  },
  
  sendStatus: function(data, opts, db, socket) {
    console.log("Status update requested by " + data.user + " on job " + data.jobId)
    
    // Check version
    if (data.version != opts.apiVersion) {
      console.log("incorrect api version")
      socket.emit("err", -1);
      return;
    }
    
    var query = "SELECT * FROM queue WHERE user='" + data.user + "' AND jobId='" + data.jobId + "'";
    
    db.all(query, (err, rows) => {
      if (err) {
        // some database error occurred
        console.log(err);
        socket.emit("err", -1);
      } else if (rows.length < 1) {
        console.log("Job or user does not exist");
        socket.emit("err", 8);
      } else {
        // We have rows! Now calculate and emit status.
        var stats = rowsToStats(rows);
        var pathToFailed = __dirname + "/../store/" + data.user + "/" + data.jobId + "/results/failed/failed.json"
        try { 
          var fail = require(pathToFailed); // load json
        } catch(e) {
          console.log( "No failed tasks yet: \n\n" + e)
          var fail = {};
        }
        
        socket.emit("return_status", {
          "version": "0.1.0",
          "progress": stats.progress,
          "status": stats.status,
          "failures": fail
        });
      }
    });
  }
}

var unpackRocto = function(data, fs, uz, callback) {
  // first create user & job directory if it does not exist
  // TODO: async all of this
  var userDir = __dirname + "/../store/" + data.meta.user;
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir);
  }
  var jobDir = userDir + "/" + data.meta.jobId
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir);
  }
  // write the .rocto file to the irectory
  var buf = Buffer.from(data.content, "base64")
  fs.writeFile(jobDir + "/roctoJob.rocto", buf, (err) => {
    if (err) {
      callback(err, null);
    } else {
      // unzip the .rocto file
      var stream = fs.createReadStream(jobDir + "/roctoJob.rocto")
        .pipe(uz.Extract({
          path: jobDir + "/roctoJob"
        }));
      stream.on("error", (err) => {
        callback(err, null);
      });
      stream.on('close', () => {
        console.log("file extracted");
        fs.readdir(jobDir + "/roctoJob", (err, items) => {
          if (err) {
            callback(err, null);
          } else {
            // TODO: check whether the job is a good job
            // read the meta info and callback.
            console.log(items)
            var metaLocation = jobDir + "/roctoJob/" + items + "/meta.json";
            console.log(metaLocation);
            var meta = require(metaLocation); // read the json file
            callback(null, meta);
          }
        });

      });
    }
  });
}

var nofunc = function() {
  // get lowest jobID
  db.get("SELECT * FROM queue ORDER BY ID DESC", function(err, row) {
    if (err) {
      console.log(err);
      socket.emit("err", {
        msg: 7
      }); // Database did not respond
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
      db.run(insertQuery, function(err) {
        if (err) {
          console.log(err);
          socket.emit("err", {
            msg: 8
          }); // Task insertion failed
        } else {
          socket.emit("task_added", {
            "ID": curID
          });
        }
      });
    }
  });
}

var rowsToStats = function(rows) {
  // First, let's get status frequencies
  var stati = [];
  for (i = 0; i < rows.length; i++) {
    stati.push(rows[i].status);
  }
  // nice magic returns a frequency array
  var tbl = stati.reduce(function(countMap, word) {countMap[word] = ++countMap[word] || 1; return countMap}, {});
  
  var freq = { "waiting": 0, "locked": 0, "finished": 0 }
  
  if (typeof tbl.qw != 'undefined') freq.waiting += tbl.qw;
  if (typeof tbl.lc != 'undefined') freq.waiting += tbl.lc;
  if (typeof tbl.fn != 'undefined') freq.finished += tbl.fn;
  
  // progress
  var prog = freq.finished/rows.length*100
  
  return({
    "progress": prog,
    "status": freq
  })
}
