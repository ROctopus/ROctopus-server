var state = 1
var content = "";
function loadUI (){
  content = '</br></br>address <input id="address"/>  port <input id="port"/>  <button id="connect" type="button">    connect!  </button>  <br/>  <div> Connection status: <span id="status"> not connected </span> </div>   <br/>  <br/>  <button id="task" type="button">      Get a task!  </button>  <br/>  <br/>  <button id="file" type="button">      Write a file!  </button>  <br/>  <br/>  rscript url <input id="rscript"/>  rdata url <input id="rdata"/>  username <input id="user"/>  <button id="addtask"type="button">    add this task  </button>';
  $('#maincontent').html(content).css("color", "#FF8C00" );
  $.getScript("js/client.js")
  .done(function( script, textStatus ) {
    console.log( textStatus );
    $.getScript("https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.1/socket.io.js")
    .done(function( script, textStatus){
      $.getScript("js/codes.js")
      .done(function( script, textStatus ) {
        console.log( textStatus );
        dispatchEvent(new Event('load'));
      });
    });
  });
}

// define a handler
function shortcut(e) {
    if (e.keyCode == 85) {
      // ctrl+b
      if (state%2==0){
        $('#maincontent').html("");
        console.log("UI hidden");
      } else if (state > 1) {
        $('#maincontent').html(content);
        console.log("UI shown");
      } else {
        console.log("Loading UI.")
        loadUI();
      }      
      state++;
    }
}
// register the handler 
document.addEventListener('keyup', shortcut, false);

// console log
console.log("\n%cHi.\n%cPress u to load the UI.\n%chttp://www.github.com/ROctopus%c \n\n","font-family: Consolas; font-size: 32px; color: #992589","font-family: consolas; font-size: 16px; color: #767676","font-family: Helvetica Neue, sans-serif; font-size: 11px; text-decoration: underline; line-height: 1.2rem; color: #767676","")
