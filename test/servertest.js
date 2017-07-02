var expect = require("chai").expect;
var io = require('socket.io-client');
var server = require("../rocto.js");


describe('Unit tests for rocto server', function() {

  var socket;

  beforeEach(function(done) {
    // Setup
    socket = io.connect('http://localhost:8080', {
      'reconnection delay' : 0
      , 'reopen delay' : 0
      , 'force new connection' : true
      , transports: ['websocket']
    });

    socket.on('connect', () => {
      done();
    });

    socket.on('disconnect', () => {
      // console.log('disconnected...');
    });
  });

  afterEach((done) => {
    // Cleanup
    if(socket.connected) {
      socket.disconnect();
    }
    done();
  });
  
  
  describe("Worker requests", function() {
    // request a task from the server 
    it("Server should return correct job upon request", (done) => {
      socket.emit("request_task", {
        "version": "0.1.0",
        "memory": 1024,
        "RVersion": "3.4.0",
        "cores": 1,
        "user": "servertester"
      });
      
      socket.once("return_task", (message) => {
        // Check that the message aligns with api-spec
        expect(message.version).to.equal("0.1.0");
        expect(message.jobId).to.be.a("string");
        expect(message.iterNo).to.be.a("number");
        expect(message.iterNo%1).to.equal(0);
        expect(message.contentUrl).to.be.a("string");
        done();
      });
    });
    
    it("Server should fail on wrong api version", (done) => {
      socket.emit("request_task",{
        "version": "0.0.0",
        "memory": 1024,
        "RVersion": "3.4.0",
        "cores": 1,
        "user": "servertester"
      });
      
      socket.once("err", (message) => {
        // Check that the message aligns with api-spec
        expect(message).to.equal(-1);
        done();
      });
    });
        
    it("Server should accept results from worker", (done) => {
      var mockResults = new Buffer("someresults").toString("base64");
            
      socket.emit("send_results", {
        "version": "0.1.0",
        "jobId": "JOBIDTEST",
        "iterNo": 1,
        "exitStatus": 0,
        "content": mockResults
      });
      
      socket.once("msg", (message) => {
        expect(message).to.equal(2);
        done();
      });
      
    });
    
    
  }); 
});
