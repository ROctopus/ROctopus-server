var expect = require("chai").expect;
var io = require('socket.io-client');
var server = require("../rocto.js");
var fs = require("fs");


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
      // console.log('disconnected socket');
    });
  });

  afterEach((done) => {
    // Cleanup
    if(socket.connected) {
      socket.disconnect();
    }
    done();
  });
  
  
  describe("Origin communication", function() {
    it("Server should correctly write a new job to the database", (done) => {
      fs.readFile("./test/roctoJob.rocto", (err, data) => {
        if (err) throw err;
        socket.emit("submit_job", {
          "meta": {
            "version": "0.1.0",
            "jobId": "TESTJOBID",
            "user": "testuser",
            "numTasks": 100,
            "fileSize": data.byteLength,
            "notify": "notify@example.com", 
            "requirements": {
              "memory": 300,
              "cpuTime": 1,
              "packages": [],
              "RVersion": "3.2.0",
              "cores": 1
            }
          },          
          "content": data.toString("base64")
        });
        
        socket.once("msg", (message) => {
          expect(message).to.equal(4);
          done();
        });
      });
    });
    
    it("Server should reject job that was already added", (done) => {
      fs.readFile("./test/roctoJob.rocto", (err, data) => {
        if (err) throw err;
        socket.emit("submit_job", {
          "meta": {
            "version": "0.1.0",
            "jobId": "TESTJOBID",
            "user": "testuser",
            "numTasks": 9,
            "fileSize": data.byteLength,
            "notify": "notify@example.com", 
            "requirements": {
              "memory": 300,
              "cpuTime": 60,
              "packages": [],
              "RVersion": "3.4.0",
              "cores": 1
            }
          },          
          "content": data.toString("base64")
        });
        
        socket.once("err", (message) => {
          expect(message).to.equal(7);
          done();
        });
      });
    });
    
    it("Server should return job status upon request", (done) => {
      socket.emit("request_status", {
        "version": "0.1.0",
        "user": "testuser",
        "jobId": "TESTJOBID"
      });
      
      socket.once("return_status", (message) => {
        // Check that the message aligns with api-spec
        expect(message.version).to.equal("0.1.0");
        expect(message.progress).to.be.within(0,1);
        expect(message.status).to.be.an("object");
        expect(message.status.waiting % 1).to.equal(0);
        expect(message.status.locked % 1).to.equal(0);
        expect(message.status.finished % 1).to.equal(0);
        expect(message.failures).to.be.an("object");
        expect(Object.keys(message.failures).length).to.equal(0);
        done();
      });
    });
  
    it("Server should return status upon request", (done) => {
      socket.emit("request_status", {
          "version": "0.1.0",
          "user": "testuser",
          "jobId": "TESTJOBID"
      });
      
      socket.once("return_status", (data) => {
        expect(data.version).to.equal("0.1.0");
        expect(data.progress).to.equal(0);
        expect(data.status.waiting).to.equal(100);
        expect(data.status.locked).to.equal(0);
        expect(data.status.finished).to.equal(0);
        done();
      });
    });
  });
  
  
  describe("Worker communication", function() {
    it("Server should return correct job upon request", (done) => {
      socket.emit("request_task", {
        "version": "0.1.0",
        "memory": 1024,
        "RVersion": "3.4.0",
        "cores": 1,
        "user": "testworker"
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
        "user": "testworker"
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
        "jobId": "TESTJOBID",
        "iterNo": 1,
        "exitStatus": 0,
        "content": mockResults
      });
      
      socket.once("msg", (message) => {
        expect(message).to.equal(2);
        done();
      });
    });
    
    it("Server should accept failed results from worker", (done) => {
      var mockResults = new Buffer("failedresults").toString("base64");
      
      socket.emit("send_results", {
        "version": "0.1.0",
        "jobId": "TESTJOBID",
        "iterNo": 1,
        "exitStatus": 1,
        "content": mockResults
      });
      
      socket.once("msg", (message) => {
        expect(message).to.equal(3);
        done();
      });
    });
    
    it("Server should have saved the failed results", (done) => {
      setTimeout(function () {
        socket.emit("request_status", {
          "version": "0.1.0",
          "user": "testuser",
          "jobId": "TESTJOBID"
        });
        
        socket.once("return_status", (message) => {
          // Check that the message aligns with api-spec
          expect(message.version).to.equal("0.1.0");
          expect(message.progress).to.be.within(0,1);
          expect(message.status).to.be.an("object");
          expect(message.status.waiting % 1).to.equal(0);
          expect(message.status.locked % 1).to.equal(0);
          expect(message.status.finished % 1).to.equal(0);
          expect(message.failures).to.be.an("object");
          expect(message.failures["1"]).to.equal(1);
          done();
        });
      }, 500); // wait 0.5s for other stuff to finish
    }).timeout(3000); // lenghten timeout fail;
    
    it("Server should fail on wrong jobId", (done) => {
      var mockResults = new Buffer("someresults").toString("base64");
      socket.emit("send_results", {
        "version": "0.1.0",
        "jobId": "NONEXISTENT",
        "iterNo": 1,
        "exitStatus": 0,
        "content": mockResults
      });
      
      socket.once("err", (message) => {
        expect(message).to.equal(5);
        done();
      });
    });
    
    
  }); 
  
  describe("Results communication", function() {
    it("Server should have updated the status", (done) => {
      socket.emit("request_status", {
          "version": "0.1.0",
          "user": "testuser",
          "jobId": "TESTJOBID"
      });
      
      socket.once("return_status", (data) => {
        expect(data.version).to.equal("0.1.0");
        expect(data.progress).to.equal(0);
        expect(data.status.waiting).to.equal(99);
        expect(data.status.locked).to.equal(1);
        expect(data.status.finished).to.equal(0);
        // expect(data.status.failures.length).to.be.undefined;
        done();
      });
    });
    
    it("Sever should return results upon request", (done) => {
      socket.emit("request_results", {
          "version": "0.1.0",
          "user": "testuser",
          "jobId": "TESTJOBID"
      });
      
      socket.once("return_results", (data) => {
        expect(data.version).to.equal("0.1.0");
        // check for rocres file
        var rocres = __dirname+"/../store/testuser/TESTJOBID/TESTJOBID.rocres";
        expect(fs.existsSync(rocres)).to.be.true;
        done();
      });
    });
  });
  
});
