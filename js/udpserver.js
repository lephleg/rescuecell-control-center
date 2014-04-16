//Listening port
var SRV_PORT = 41234;

//Positioning Algorithm address
var POS_ALGORITHM ={address:"127.0.0.1",port:55555};

//Transmitter modes
var TO_PA = 1;
var TO_MNODES = 2;

//Time internal and timeout in miliseconds for status updates
var CHK_INTERNAL = 5 * 1000; //check status every 5sec
var CHK_TIMEOUT = 2 * 60 * 1000; //set activity timeout to 2mins

//URLs for status icons
var ACTIVE_ICON_URL = "image/connection-active.png"; 
var INACTIVE_ICON_URL = "image/connection-inactive.png";

//Display accuracy on MTs constant (should be defined by settings)
var ACCURACY = true;

/* =====================================================*/

var dgram = require("dgram");
var server = dgram.createSocket("udp4");

//Global variables
var devMatrix = new Array();
var origin;
var exists;
var error = false;

server.on("error", function (err) {
  console.log("server error:\n" + err.stack);
  error =true;
  server.close();
});


server.on("message", function (msg, rinfo) {
  //display received data for debug
  console.log("server got: " + msg + " from " +
    rinfo.address + ":" + rinfo.port);
    
  //notify console panel  
	print("Datagram received from [" +
   	rinfo.address + ":" + rinfo.port + "]...");
   	
	//store received data and sender
	var item={data:msg,address:rinfo};
	
	//analyze incoming data
	var dev = analyzer(item);
		
	if (dev==1) {
		print("Server is listening on [0.0.0.0:41234]...");
		return;
	}
	
	//store or update data on devMatrix
	storeData(dev);
	
	//updateGUI
	updateGUI(dev);
	
	//updateCanvas
	updateCanvas(dev);
	
	print("Server is listening on [0.0.0.0:41234]...");
});

server.on("listening", function () {
  var address = server.address();
  console.log("server listening " +
      address.address + ":" + address.port);
});

//////////////////////////////////////////////////////////

//start the UDP server 
server.bind(SRV_PORT);
print("Server is listening on [0.0.0.0:41234]...");

//check status of all devices periodically
setInterval(function(){
	
	var now = new Date();
	for (var i=0; i<devMatrix.length; i++) {
		if (devMatrix[i].active) {
			var t = now.getTime() - devMatrix[i].time.getTime();
				if (t > CHK_TIMEOUT) {
					console.log(devMatrix[i].type + " (#" + devMatrix[i].id + ") has timed out after " + (t/1000) + "sec of inactivity.");
					devMatrix[i].active = false;
					updateGUI(devMatrix[i]);
				}
			}
		}
	},CHK_INTERNAL);

//////////////////////////////////////////////////////////


//analyzes incoming datagram and creates a device object instance along with its address
//[01,01,40.626176,22.948059,2.2234]
function analyzer(item) {
	
	var string = item.data.toString();
	//remove possible whitespace
	string = string.replace(/\s/g, '');
	//split string to substrings
	var data = string.split(",");
	
	//check datagram format
	if (data.length == 5) {
		//mNode or sNode
		if (data[1] == 1) {
			var type = "sNode";
			//forward sNode to all mNodes
			transmitter(TO_MNODES,string);
		} else if (data[1] == 2) {
			var type = "mNode";
		}
		//inform the user that the datagram was accepted and a device was detected
		print(type + " [ID #" + data[0] + "] device detected!");
		//forward device to Positioning Algorithm
		transmitter(TO_PA,string);
		//check if this is the first device received and set it as an origin for the XY coords
		if (devMatrix.length == 0) {
			origin = new position(data[2],data[3],data[4]);
			print("Device set as origin.");
		}
			
		//transform the coords from LL to XY format
	 	var posLL = new position(data[2],data[3],data[4]);
	 	var posXY = transformLLtoXY(origin, posLL);

		//create a new device instance with the properties from analysis
		var dev = new device(data[0],type, item.address, posXY);			
	
	} else if (((data.length == 6) && (data[1] == 3)) && (devMatrix.length != 0)) {
		//MT + not first device received
		var type = "MT";
		
		//inform the user that the datagram was accepted and a device was detected
		print(type + " [ID #" + data[0] + "] device detected!");
		//forward MT to all mNodes
		transmitter(TO_MNODES,string);

		//transform the coords from LL to XY format
		var posLL = new position(data[2],data[3],data[4]);
		var posXY = transformLLtoXY(origin, posLL);
		//create a new device instance with the properties from analysis
		var dev = new device(data[0],type, item.address, posXY);

		//create extra property for accuracy
		dev["acc"] = data[5];
	} else {
		
		//inform the user that the datagram was rejected
	  print("Invalid format of incoming data. Package rejected!");
	  return 1;
	}
			
	return dev;
}


//update the GUI panels
function updateGUI(dev) {

	var icon;
	var time = "Last active:" + "<br>" + dev.time.toLocaleTimeString("en-US");

	if (dev.active) {
		//status = "Active";
		icon = '<img data-toggle="tooltip" title="' + time + '" src="' + ACTIVE_ICON_URL +'">';
	} else {
		//status = "Inactive";
		icon = '<img data-toggle="tooltip" title="' + time + '" src="' + INACTIVE_ICON_URL +'">';
	}
	
	var rows = devTable.fnGetNodes();

	if (exists || !dev.active) {
		for (i=0;i<rows.length;i++) {
			if ((rows[i].cells[1].innerHTML == dev.type) && (rows[i].cells[2].innerHTML == ("#" + dev.id))) {
 				devTable.fnUpdate( [i+1, dev.type, "#" + dev.id, dev.address.address, icon], i );
			}
		}
	} else {
		$('#device-table').dataTable().fnAddData( [
			rows.length+1,
    	dev.type,
    	"#" + dev.id,
    	dev.address.address,
    	icon ]
  	);
	}
	
	$('[data-toggle="tooltip"]').tooltip({
    'placement': 'auto top',
    'html': 'true'
	});
	
}

//creates the 3D objects needed and updates the canvas
function updateCanvas(device) {
		
	if (!exists) {
		device.mesh = setSphere(device);
	} else {
		device.mesh = updateSphere(device);
	}
	
	//if MT, create or update its accuracy indicator
	if (device.type == "MT") {
		if (!exists) {
			device.range = setAccuracy(device);
		} else {
			device.range = updateAccuracy(device);
		}	
	}
	
	//store 3D objects to devMatrix
	storeMeshes(device);
	print("3D canvas updated.");

}

//print to console panel
function print(str) {
	var nl = "<br>";
	
	//var output = JSON.stringify(str);
  $(".console").append(str + nl);
    
  //keep scrollbar fixed to the bottom
  $(".console").scrollTop(10000);
	
}

//device obj constructor
function device(id, type, address, position) {
	this.id=id;
	this.type=type;
	this.address = address;
	this.position = position;
	this.acc = null;
	this.time = new Date();
	this.active = true;
	this.mesh = null;
	this.range = null;
	
	this.devToString = devToString;
	function devToString() {
		var ret = "type: " + this.type + " id: " + this.id + " address: " + this.address.address 
			+ ":" + this.address.port + " position: [" + position.posToString() + "]";
		return ret;
	}

}

//position obj constructor
function position(lat,lon,alt) {
	this.lat=lat;
	this.lon=lon;
	this.alt=alt;
	
	this.posToString=posToString;
	function posToString() {
  	var ret = "lat=  " + this.lat + " long= " + this.lon + " alt= " + this.alt;
  	return ret;
	}
	
}

//stores or updates a device object on devMatrix
function storeData(device) {
	exists = false;
	
	//check if device already exists
	for (i = 0; i < devMatrix.length; i++) {
	 	if ((devMatrix[i].type == device.type) && (devMatrix[i].id == device.id)) {
	 		print("Device exist! Updating data...");
	 		//update address, time, status and position
			devMatrix[i].address = device.address;
			devMatrix[i].time = device.time;
			devMatrix[i].active = true;
			devMatrix[i].position = device.position;
			
			//pass 3d mesh to temp device to update canvas
			device.mesh = devMatrix[i].mesh;
			device.range = devMatrix[i].range;
			
			exists = true;
			break;
		}
	}
	
	//store a new device
	if (!exists) {
		devMatrix.push(device);
		print("Device stored successfully.");
	}
}

//stores 3D meshes to a device object on devMatrix
function storeMeshes(device) {
	
	for (i = 0; i < devMatrix.length; i++) {
	 	if ((devMatrix[i].type == device.type) && (devMatrix[i].id == device.id)) {
			devMatrix[i].mesh = device.mesh;
			if (device.type == "MT") {
				devMatrix[i].range = device.range;
			}
		}
	}
	
}

//transforms a pair of LAT/LONG coordinates to X/Y 
//using NDSFutility [translate_coordinates(mode,origin)]
function transformLLtoXY(org, posLL) {

	//set origin format required by NDSFutility
	var   origin={};
	
	origin={
		slat:posLL.lat,
		slon:posLL.lon,
		coord_system:1,
		olat:org.lat,
		olon:org.lon,
		xoffset_mtrs:0,
    yoffset_mtrs:0,
    rotation_angle_degs:0,
    rms_error:0
    };
	
	//[mode=2] for LL to XY translation
	var ll2xy = translate_coordinates(2,origin);
	
	//set origin's height as 0m
	posLL.alt = posLL.alt - org.alt + 0.35;
	
	print("Transforming coordinates.. completed!")
	console.log("ll2xy.x=" + ll2xy.x + " ll2xy.y=" + ll2xy.y);
	
	//apply three.js reversed format (Y,X,Z)
	var posXY = new position(ll2xy.y, ll2xy.x, posLL.alt);
	
	return posXY;
}

//handles CC's outgoing transmissions
function transmitter (mode,msg) {
	
	var message = new Buffer(msg);
	
	if (mode == TO_PA) {
		//forward message to Positioning Algorithm
		print("Package forwarded to Positioning Algorithm on [" + POS_ALGORITHM.address + ":" + POS_ALGORITHM.port + "].");
		server.send(message, 0, message.length, POS_ALGORITHM.port, POS_ALGORITHM.address, function(err, bytes) {
			console.log("Package forwarded to PA successfully.");
		});
		
	} else if (mode == TO_MNODES) {
	 	//forward message to all mNodes
	 	for (i = 0; i < devMatrix.length; i++) {
			if (devMatrix[i].type == "mNode") {
				print("Forwarding datagram to mNode #" + devMatrix[i].id + " on [" + devMatrix[i].address.address + ":" + devMatrix[i].address.port + "]...");
				server.send(message, 0, message.length, devMatrix[i].address.port, devMatrix[i].address.address, function(err, bytes) {
					console.log("Package forwarded to mNode successfully.");
				});
			}
		}
	 	
	}

}
