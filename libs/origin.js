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
  
  // upon status request
  returnStat: function(data, opts, db, socket) {
    console.log("Job status requested");

    // Check version
    if (data.version != opts.apiVersion) {
      console.log("incorrect api version");
      socket.emit("err", -1);
      return;
    }
    
    // Build the query
    var query = "SELECT * FROM queue WHERE jobId = '" + data.jobId + "' AND user = '" + data.user + "'";
    
    db.all(query, (err, rows) => {
      if (err) {
        console.log(err);
        socket.emit("err", -1);
      }
      if (rows.length == 0) {
        // User or jobId not found
        socket.emit("err", 8);
      } else {
        var stats = calculateStats(rows);
        stats.version = "0.1.0";
        stats.failures = getFails(data);
        socket.emit("return_status", stats);
      }
    });
  },
  
  returnResults: function(data, opts, tls, fs, socket) {
    console.log("Job results requested");

    // Check version
    if (data.version != opts.apiVersion) {
      console.log("incorrect api version");
      socket.emit("err", -1);
      return;
    }
    
    var jobDir = __dirname + "/../store/" + data.user + "/" + data.jobId;
    var resDir = jobDir + "/results/";
    var resFile = jobDir + "/" + data.jobId + ".rocres"
    tls.zipFolder(resDir, resFile, (err) => {
      if (err) {
        console.log(err)
        socket.emit("err", -1);
        return;
      } else {
        fs.readFile(resFile, (err, fileContent) => {
          if (err) {
            console.log(err)
            socket.emit("err", -1);
            return;
          } else {
            socket.emit("return_results", {
              "version": "0.1.0",
              "content": fileContent.toString("base64")
            });
          }
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
  // write the .rocto file to the directory
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
            var metaLocation = jobDir + "/roctoJob/" + items + "/meta.json";
            var meta = require(metaLocation); // read the json file
            callback(null, meta);
          }
        });

      });
    }
  });
}

var calculateStats = function(rows) {
  var nTasks = rows.length;
  var counts = {
    "qw": 0,
    "lc": 0,
    "dn": 0,
    "fl": 0
  };
  for (i=0; i<nTasks; i++) {
    var s = rows[i].status;
    switch(s) {
      case "qw":
        ++counts.qw;
        break;
      case "lc":
        ++counts.lc;
        break;
      case "dn":
        ++counts.dn;
        break;
    }
  }
  var doneProp = counts.dn/nTasks;
  
  return({
    "progress": doneProp,
    "status": {
      "waiting": counts.qw,
      "locked": counts.lc,
      "finished": counts.dn
    }
  });
}

var getFails = function(data) {
  
  try {
    var fails = require(__dirname + "/../store/" + data.user + "/" + data.jobId + "/results/failed/failed.json");
  } catch (e) {
    var fails = {};
  } finally {
    return(fails)
  }
  
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
