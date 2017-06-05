var socket;
var lastresult;

// Socket initialisation
function connectSocket(address,port){
  socket = io('http://'+address+':'+port)
  // received messages
  socket.on('err', function(data){
    console.log("error: "+codes.error[[data.msg]].msg);
  });
  
  socket.on('msg', function(data){
    if (data.msg == 0){
      document.getElementById("status").innerHTML = codes.message[[data.msg]].msg;
    }
    console.log("message: "+codes.message[[data.msg]].msg);
  });  
  
  socket.on('result_returned', function (data) {
    console.log(data);
    lastresult = data;
  });
  
  socket.on('task_added', function (data) {
    console.log("Assigned ids: " + data.ID)
  });
}


window.addEventListener("load", function(){
  var button = document.getElementById('connect')
  
  button.addEventListener('click', function() {
    var address = document.getElementById('address').value;
    var port = document.getElementById('port').value;
    connectSocket(address,port);
  });
  
  var button2 = document.getElementById('task');

  button2.addEventListener('click', function() {
      console.log("getting task...");
      socket.emit('request_job');
  });
  
  var button3 = document.getElementById('file');
  
  button3.addEventListener('click', function() {
    if (lastresult){
      console.log("writing file ");
      var texttosend = btoa("haha this is some base64 encoded content"); 
      socket.emit('send_results', { ID: lastresult.ID, content: texttosend});
    } else {
      console.log("get a job first!");
    }  
  });
  
  var button4 = document.getElementById('addtask');
  
  button4.addEventListener('click', function() {
    var rscript = document.getElementById('rscript').value;
    var rdata = document.getElementById('rdata').value;
    var user = document.getElementById('user').value;
    
    if (rscript == null || rdata == null || user == null) {
      console.log("Input some data first!");
    } else {
      if (confirm('Are you sure you want to save this thing into the database?')) {
        socket.emit("add_task", {"rscript": rscript, 
                                 "rdata": rdata,
                                 "user": user});
      } else {
        console.log("Not saved");
      }
      
    }
    
    
    
  });

});
