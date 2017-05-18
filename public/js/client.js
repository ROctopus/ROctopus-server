var socket;
var lastresult;

// Socket initialisation
function connectSocket(address,port){
  socket = io('http://'+address+':'+port)
  // received messages
  socket.on('result_returned', function (data) {
      console.log(data);
      lastresult = data;
  });
  
  socket.on('err', function(data){
    console.log("error: "+data.msg);
  });
  
  socket.on('message', function(data){
    if (data.msg == 0){
      document.getElementById("status").innerHTML = "successfully connected"
    }
    console.log("message: "+data.msg);
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

});
