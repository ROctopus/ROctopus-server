const sq = require("sqlite3").verbose();
const fs = require("fs");
var db = new sq.Database("./db/queue.db");

if (process.argv.length == 1 && process.argv[2].charAt(0) == "h") {
  console.log("Usage: npm run read-db start end\n");
  console.log("All: npm run read-db 0 last\n\n");
  process.exit(-1);
} else if (process.argv.length <= 3) {
  console.log("Selecting first 10 elements from db.\n");
  console.log("For help: npm run read-db help\n\n");
  var start = 0;
  var end = 9;
} else {
  var start = process.argv[2];
  var end = process.argv[3];
}

db.all("SELECT * FROM queue", (err, data) => {
  if (err) throw(err);
  if (end == "last" || parseInt(end) > data.length) {
    end = data.length;
  }
  if (parseInt(start) < 0) {
    start = 0;
  } else if (start == "last" || parseInt(start) > data.length - 1) {
    start = data.length - 1;
  } else {
    start = parseInt(start);
  }
  console.log(JSON.stringify(data.slice(start, end), null, 2));
});
