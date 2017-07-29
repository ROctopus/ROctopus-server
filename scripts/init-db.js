if (process.argv.length <= 2) {
  console.log("Initing db with 0 tasks.");
  console.log("To init with amount: npm run init-db numTasks\n\n");
  var numTasks = 0;
} else if (process.argv[2].charAt(0) == "h") {
  console.log("Usage: npm run init-db numTasks\n\n");
  process.exit(-1);
} else {
  var numTasks = process.argv[2];
  console.log("Initing db with " + numTasks + " tasks.\n\n");
}

const sq = require("sqlite3").verbose();
const fs = require("fs");

var ip = "localhost:8080"; // IP address here, e.g., 192.168.1.100:8080

var tableDef = `
CREATE TABLE queue(
  jobId VARCHAR (200) NOT NULL,
  user VARCHAR (200) NOT NULL,
  iterNo INT NOT NULL,
  contentUrl VARCHAR (200) NOT NULL,
  status CHAR (2) NOT NULL,
  timeStamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (jobId, iterNo)
);`;

fs.unlink("./db/queue.db", (err) => {
  if (err) {
    if (err.code != "ENOENT") { // file doesn't exist
      throw err;
    }
  }
  var db = new sq.Database("./db/queue.db");
  db.serialize(function() {
    db.run("PRAGMA journal_mode = WAL;");
    db.run(tableDef);
    for (var i = 0; i < numTasks; i++) {
      db.run("INSERT INTO queue (jobId, user, iterNo, contentUrl, status) VALUES (?, ?, ?, ?, ?)", [
        "INITJOBID",
        "testuser",
        i + 1,
        "http://" + ip + "/store/testuser/TESTJOBID/roctoJob.rocto",
        "qw"
      ]);
    }
  }, function() {
    db.close(function() {
      console.log("Database successfully initialised.\n\n");
    });
  });
});
