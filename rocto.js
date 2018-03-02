// Function imports
const srv = require("./src/server");
const wrk = require("./src/worker");
const ori = require("./src/origin");

// Module imports
const app = require("http").createServer(srv.handler);
const sq = require("sqlite3").verbose();
const db = new sq.Database("./db/queue.db");
const io = require("socket.io")(app);

// Config import
const config = require("./config.json");

//This will open a server on port 8080.
app.listen(config.port);
console.log("Serving on " + config.ip + ":" + config.port);


// Web Socket Connection
io.sockets.on("connection", function(socket) {
  var socketID = socket.id;
  var clientIP = socket.request.connection.remoteAddress;

  socket.emit("msg", 0);

  console.log("New connection from " + clientIP +
              " assigned to socket " + socketID);

  // Worker communication

  // Worker requests a task, return a task.
  socket.on("request_task",
            (data) => wrk.returnTask(data, config, db, socket));
  // Worker sends back results, save them.
  socket.on("send_results",
            (data) => wrk.saveResults(data, config, db, socket));

  // Origin submits a job
  socket.on("submit_job",
            (data) => ori.addJob(data, config, db, socket));
  // Origin requests job status
  socket.on("request_status",
            (data) => ori.returnStat(data, config, db, socket));
  // Origin requests results package
  socket.on("request_results",
            (data) => ori.returnResults(data, config, socket));
});
