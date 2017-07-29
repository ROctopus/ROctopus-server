// Function imports
const srv = require("./libs/server");
const wrk = require("./libs/worker");
const ori = require("./libs/origin");
const tls = require("./libs/tools");

// Module imports
const url = require("url");
const fs = require("fs");
const path = require("path");
const app = require("http").createServer(srv.handler);

const sq = require("sqlite3").verbose();
const db = new sq.Database("./db/queue.db");
const io = require("socket.io")(app);
const uz = require("unzip");

// Set options
var opts = {
  apiVersion: "0.1.0",
  ip: "localhost:8080",
  port: "8080"
}

//This will open a server on port 8080.
app.listen(8080);
console.log("Serving on port 8080")


// Web Socket Connection
io.sockets.on("connection", function(socket) {
  var socketID = socket.id;
  var clientIP = socket.request.connection.remoteAddress;

  socket.emit("msg", 0)

  console.log("New connection from " + clientIP + " assigned to socket " + socketID);

  // Worker communication

  // Worker requests a task, return a task.
  socket.on("request_task", (data) => wrk.returnTask(data, opts, db, socket));
  // Worker sends back results, save them.
  socket.on("send_results", (data) => wrk.saveResults(data, opts, fs, db, socket));

  // Origin submits a job
  socket.on("submit_job", (data) => ori.addJob(data, opts, fs, db, uz, socket));
  // Origin requests job status
  socket.on("request_status", (data) => ori.returnStat(data, opts, db, socket));
  // Origin requests results package
  socket.on("request_results", (data) => ori.returnResults(data, opts, tls, fs, socket));
});
