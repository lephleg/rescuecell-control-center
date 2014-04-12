// gsm-launcher.js
// GSM Launcher | Unix shell commands launching code

//List of commands
var EXEC_ECHO = 'echo "OpenBTS launcher script"';
var EXEC_SMQUEUE = 'xterm -e "cd $OPENBTS_DIR/smqueue/trunk/smqueue/ && sudo ./smqueue "&';
var EXEC_SIPAUTHSERVE = 'xterm -e "cd $OPENBTS_DIR/subscriberRegistry/trunk/ && sudo ./sipauthserve" &';
var EXEC_OPENBTS = 'xterm -e "cd $OPENBTS_DIR/openbts/trunk/apps/ && sudo ./OpenBTS " &';
var EXEC_OPENBTSCLI = 'xterm -e $OPENBTS_DIR/openbts/trunk/apps/OpenBTSCLI &';

/*==================================================*/

var exec = require('child_process').exec;
var child;

print("Launching GSM Network...",false);

if (checkOS() == "Linux") {

	execute(EXEC_ECHO);
	execute(EXEC_SMQUEUE);
	execute(EXEC_SIPAUTHSERVE);
	execute(EXEC_OPENBTS);
	execute(EXEC_OPENBTSCLI);

	print("OK",true);
	
} else {
	
	print("ERROR!",true);
	print( checkOS() + " OS detected! Please execute RescueCell CC on a Linux platform.",true);
	
}

//execute a kernel command 
function execute(command) {

  console.log('executing: [' + command + ']');

  child = exec(command, function (error, stdout, stderr) {
  if (error !== null) {
    console.log('exec error: ' + error);
    print('exec error: ' + error, true);
  }
  console.log('stdout: ' + stdout);
  console.log('stderr: ' + stderr);
});
}

//print to console panel
function print(str,newline) {
  var nl = "<br />";
  var output = JSON.stringify(str);

  //check for newline
  if (newline) { 
     $(".console").append(str + nl); 
  } else {
     $(".console").append(str); 
  }
    
  //keep scrollbar fixed to the bottom
  $(".console").scrollTop(10000);
	
}

//check platform
function checkOS() {
	
	var OSName="Unknown";
	if (process.platform.indexOf("win")!=-1) OSName="Windows";
	if (process.platform.indexOf("darwin")!=-1) OSName="MacOS";
	if (process.platform.indexOf("freebsd")!=-1) OSName="FreeBSD";
	if (process.platform.indexOf("linux")!=-1) OSName="Linux";
	
	return OSName;
}
