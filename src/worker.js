const fs = require("fs");

module.exports = {
  // Upon task request
  returnTask: function(data, opts, db, socket) {
    console.log("task requested")
    if (data) {
      if (data.version != opts.apiVersion) {
        socket.emit("err", -1);
      } else {
        // Check if any tasks are available
        db.get("SELECT COUNT(*) FROM queue WHERE STATUS='qw'", function(err, nrow) {
          if (err) {
            console.log(err);
            socket.emit("err", 2); // Failed to count available tasks
          } else {
            if (nrow[["COUNT(*)"]] > 0) {
              console.log(nrow[["COUNT(*)"]] + " jobs available.");
              // If task is available, lock it and send it!
              // Select the first available task from the table
              var taskQuery = `
              SELECT jobId, iterNo, contentUrl
              FROM queue
              WHERE status= 'qw'
              ORDER BY datetime(timeStamp) DESC, iterNo ASC;
              `
              db.get(taskQuery, function(err, row) {
                if (err) {
                  console.log(err);
                  socket.emit("err", 3); // No task found
                } else {
                  var task = row;
                  console.log("Assigning and locking " + row.jobId + row.iterNo);
                  var lockQuery = `
                  UPDATE queue
                  SET status = "lc"
                  WHERE jobId = '` + row.jobId + `'
                  AND iterNo = ` + row.iterNo + `
                  ;
                  `
                  db.run(lockQuery, function(err) {
                    if (err) {
                      console.log(err);
                      socket.emit("err", 4); // Task failed to lock
                    } else {
                      // We can send the task to the worker!
                      console.log("Sending task to client");
                      task.version = opts.apiVersion;
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
  },

  // Upon send results
  saveResults: function(data, opts, db, socket) {

    if (data.version == opts.apiVersion) {
      var jobId = data.jobId;
      var iterNo = data.iterNo;
      var bytes = new Buffer(data.content, "base64");


      // determine where to save the job results
      var query = "SELECT * FROM queue WHERE jobId = '" + jobId + "'"
      db.get(query, (error, row) => {
        if (typeof row == 'undefined') {
          // The row does not exist
          socket.emit("err", 5); // User not found

        } else {

          // Check if correct directory exists and otherwise make it
          // TODO: async & error handling
          var userDir = __dirname + "/../store/" + row.user;
          if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir);
          }
          var jobDir = userDir + "/" + jobId
          if (!fs.existsSync(jobDir)) {
            fs.mkdirSync(jobDir);
          }
          var resultsDir = jobDir + "/results"
          if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir);
          }

          if (data.exitStatus == 0) {
            // write file to results directory
            fs.writeFile(resultsDir + "/" + iterNo + ".Rdata", bytes,
              function(err) {
                if (err) {
                  console.log(err);
                  socket.emit("err", 6); // File save failed
                } else {
                  console.log("The file was saved!");
                  socket.emit("msg", 2); // Results successfully saved
                }
              });

          } else {
            // The task failed
            var failedDir = resultsDir + "/" + "failed"
            if (!fs.existsSync(failedDir)) {
              fs.mkdirSync(failedDir);
            }
            if (fs.existsSync(failedDir + "/failed.json")) {
              var failed = require(failedDir + "/failed.json");
            } else {
              var failed = {}
            }
            // write failed log
            if (failed[data.iterNo]) {
              failed[data.iterNo] += 1;
            } else {
              failed[data.iterNo] = 1;
            }

            fs.writeFile(failedDir + "/failed.json", JSON.stringify(failed),
              function(err) {
                if (err) {
                  console.log(err);
                  socket.emit("err", 6); // File save failed
                } else {
                  console.log("The json fail log was updated.");
                  socket.emit("msg", 3); // Failed results saved
                }
              });

            // write error message
            fs.writeFile(failedDir + "/" + iterNo + ".txt", bytes.toString(),
              function(err) {
                if (err) {
                  console.log(err);
                  socket.emit("err", 6); // File save failed
                } else {
                  console.log("The failure output was saved.");
                  socket.emit("msg", 3); // Failed results saved
                }
              });

          }

        }
      });

    } else {
      console.log("Incorrect api version");
      socket.emit("err", -1)
    }
  }
}
