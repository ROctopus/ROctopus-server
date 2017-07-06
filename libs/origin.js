module.exports = {
  // Upon job submit
  addJob: function(data, opts, fs, db, socket) {
    console.log("Job add requested")
  
    // Check version
    if (data.version == "0.1.0") {
  
  
  
    } else {
  
      socket.emit("err", -1)
  
    }
  
  
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
}
