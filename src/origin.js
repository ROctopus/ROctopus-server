const fs = require("fs");
const uz = require("unzip");
const tls = require("./tools");
const log = require("./logger");

module.exports = {
  // Upon job submit
  addJob: function(data, opts, db, socket) {
    log.verbose("Job submit requested");

    // Check version
    if (data.meta.version != opts.apiVersion) {
      log.verbose("incorrect api version")
      socket.emit("err", -1);
      return;
    }

    // First, check if jobID already exists
    var query = "SELECT * FROM queue WHERE jobId = '" +
      data.meta.jobId + "' AND user = '" + data.meta.user + "'";

    db.get(query, (err, row) => {
      if (err) {
        // some database error occurred
        log.error(err);
        socket.emit("err", -1); // database error
      } else if (typeof row != 'undefined') {
        // jobId already exists!
        log.verbose("Tried to add job that exists: " +
                    data.meta.user + " " + data.meta.jobId);
        socket.emit("err", 7);
      } else {
        // Now we can proceed to add the job
        unpackRocto(data, (err, meta) => {
          if (err) {
            log.error("Error occurred when unpacking: " + err);
            socket.emit("err", -1);
          } else {
            // add the iterations to the database
            var contentUrl = "http://" + opts.ip + "/store/" +
              data.meta.user + "/" + data.meta.jobId + "/roctoJob.rocto";
            db.serialize(function() {
              var nAdded = 0;
              for (var i in data.meta.selectedTasks) {
                db.run("INSERT INTO queue (jobId, user, iterNo, contentUrl, status) VALUES (?, ?, ?, ?, ?)", [
                  data.meta.jobId,
                  data.meta.user,
                  Number(i) + 1, // here we switch from 0-start to 1-start for R
                  contentUrl,
                  "qw"
                ], (err) => {
                  if (err) {
                    log.error("Error occured when adding to database: " +
                              err);
                    socket.emit("err", -1);
                  } else {
                    nAdded++;
                    if (nAdded == data.meta.selectedTasks.length) {
                      log.verbose("Tasks successfully added");
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
    log.verbose("Job status requested");

    // Check version
    if (data.version != opts.apiVersion) {
      log.verbose("incorrect api version");
      socket.emit("err", -1);
      return;
    }

    // Build the query
    var query = "SELECT * FROM queue WHERE jobId = '" + data.jobId + "' AND user = '" + data.user + "'";

    db.all(query, (err, rows) => {
      if (err) {
        log.err(err);
        socket.emit("err", -1);
      }
      if (rows.length == 0) {
        // User or jobId not found
        socket.emit("err", 8);
      } else {
        var stats = calculateStats(rows);
        stats.version = opts.apiVersion;
        stats.failures = getFails(data);
        socket.emit("return_status", stats);
      }
    });
  },

  // upon results request
  returnResults: function(data, opts, socket) {
    log.verbose("Job results requested");

    // Check version
    if (data.version != opts.apiVersion) {
      log.verbose("incorrect api version");
      socket.emit("err", -1);
      return;
    }

    var jobDir = __dirname + "/../store/" + data.user + "/" + data.jobId;
    var resDir = jobDir + "/results/";
    var resFile = jobDir + "/" + data.jobId + ".rocres"
    tls.zipFolder(resDir, resFile, (err) => {
      if (err) {
        log.error(err)
        socket.emit("err", -1);
        return;
      } else {
        fs.readFile(resFile, (err, fileContent) => {
          if (err) {
            log.error(err)
            socket.emit("err", -1);
            return;
          } else {
            socket.emit("return_results", {
              "version": opts.apiVersion,
              "content": fileContent.toString("base64")
            });
          }
        });

      }
    });
  }
}

var unpackRocto = function(data, callback) {
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
        log.verbose("file extracted");
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
