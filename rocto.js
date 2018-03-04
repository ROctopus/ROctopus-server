// Function imports
const srv = require("./src/server");
const wrk = require("./src/worker");
const ori = require("./src/origin");

// Config import
const config = require("./config.json");

// Set up logging
const log = require("./src/logger");

// Set up database connection
const sq = require("sqlite3").verbose();
const db = new sq.Database("./db/queue.db");

// Set up server
const app = require("http").createServer(srv.handler);
const io = require("socket.io")(app);
// This will open a server on the configured port.
app.listen(config.port);
log.info("Serving on " + config.ip + ":" + config.port);


// Web Socket Connection
io.sockets.on("connection", function(socket) {
  var socketID = socket.id;
  var clientIP = socket.request.connection.remoteAddress;

  socket.emit("msg", 0);

  log.verbose("New connection from " + clientIP +
              " assigned to socket " + socketID);

  // Worker communication
  // Worker requests a task, return a task.
  socket.on("request_task",
            (data) => wrk.returnTask(data, config, db, socket, log));
  // Worker sends back results, save them.
  socket.on("send_results",
            (data) => wrk.saveResults(data, config, db, socket, log));

  // Origin communication
  // Origin submits a job
  socket.on("submit_job",
            (data) => ori.addJob(data, config, db, socket, log));
  // Origin requests job status
  socket.on("request_status",
            (data) => ori.returnStat(data, config, db, socket, log));
  // Origin requests results package
  socket.on("request_results",
            (data) => ori.returnResults(data, config, socket, log));
});
