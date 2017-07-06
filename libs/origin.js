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
