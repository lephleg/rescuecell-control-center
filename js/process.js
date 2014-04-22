// process.js
// Backend Process | Socket connectivity, data analysis, storage and control 

//Listening port (should be defined by settings)
var SRV_PORT = 41234;

//Positioning Algorithm address (should be defined by settings)
var POS_ALGORITHM ={address:"127.0.0.1",port:55555}; 

//Transmitter modes
var TO_PA = 1;
var TO_MNODES = 2;

//Time internal and timeout in miliseconds for status updates
var CHK_INTERNAL = 5 * 1000; //check status every 5sec
var CHK_TIMEOUT = 2 * 60 * 1000; //set activity timeout to 2mins (should be defined by settings)

//URLs for status icons
var ACTIVE_ICON_URL = "image/connection-active.png"; 
var INACTIVE_ICON_URL = "image/connection-inactive.png";

//Display accuracy on MTs constant (should be defined by settings)
var ACCURACY = false;
//Highlight polygon drawn by sNodes (convex hull)(should be defined by settings)
var POLYGON = false;

/* =====================================================*/

//Global variables
var devMatrix = new Array();
var sNodePoints = new Array();
var sNodeConvexHull = new Array();
var sNodeConvexHull_size;
var origin = null;
var exists = false;
var error = false;

var dgram = require("dgram");
var server = dgram.createSocket("udp4");

//start the UDP server 
server.bind(SRV_PORT);
//check status of all devices every CHK_INTERNAL
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

//SERVER'S EVENT HANDLERS

server.on("error", function (err) {
  error(err);
});

server.on("message", function (msg, rinfo) {
	message(msg,rinfo);
});

server.on("listening", function () {
  listening();
});

//REUSABLE EVENT HANDLERS

function error(err) {
  print("server error:\n" + err.stack);
  error =true;
  server.close();
}

function message(msg, rinfo) {
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
		print("Server is listening on [0.0.0.0:" + SRV_PORT + "]...");
		return;
	}
	
	//store or update data on devMatrix
	storeData(dev);
	
	//updateGUI
	updateGUI(dev);
	
	//updateCanvas
	updateCanvas(dev);
	
	print("Server is listening on [0.0.0.0:" + SRV_PORT + "]...");
}

function listening() {
  var address = server.address();
  console.log("Server is listening on [" + address.address + ":" + address.port + "]..");
  print("Server is listening on [" + address.address + ":" + address.port + "]..");
}

//CONTRUCTORS

//device obj constructor
function device(id, type, address, LLposition, XYposition) {
	this.id=id;
	this.type=type;
	this.address = address;
	this.LLposition = LLposition;
	this.XYposition = XYposition;
	this.acc = null;
	this.time = new Date();
	this.active = true;
	this.mesh = null;
	this.range = null;
	
	this.devToString = devToString;
	function devToString() {
		var ret = "type: " + this.type + " id: " + this.id + " address: " + this.address.address 
			+ ":" + this.address.port + " LLposition: [" + LLposition.posToString() + "]";
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

//point obj contructor
function point(id, x, y) {
	this.id=id;
	this.x=x;
	this.y=y;
	this.lat = lat;
	this.lng = lng;
	
	function lat() {
		return this.x;
	}
	
	function lng() {
		return this.y;
	}
	
}

//TOOLS

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
		var dev = new device(data[0],type, item.address, posLL, posXY);			
	
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
		var dev = new device(data[0],type, item.address, posLL, posXY);			

		//create extra property for accuracy
		dev["acc"] = data[5];
	} else {
		
		//inform the user that the datagram was rejected
	  print("Invalid format of incoming data. Package rejected!");
	  return 1;
	}
			
	return dev;
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
					console.log("Package forwarded a mNode successfully.");
				});
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
	var XYalt = posLL.alt - org.alt + 0.35;
	
	print("Transforming coordinates.. completed!")
	console.log("ll2xy.x=" + ll2xy.x + " ll2xy.y=" + ll2xy.y);
	
	//apply three.js reversed format (Y,X,Z)
	var posXY = new position(ll2xy.y, ll2xy.x, XYalt);
	
	return posXY;
}

//stores or updates a device object on devMatrix
function storeData(device) {
	exists = false;
	
	//check if device already exists
	for (i = 0; i < devMatrix.length; i++) {
	 	if ((devMatrix[i].type == device.type) && (devMatrix[i].id == device.id)) {
	 		print("Device exist! Updating data...");
	 		//update address, time, status, position, sNodesPoints record
			devMatrix[i].address = device.address;
			devMatrix[i].time = device.time;
			devMatrix[i].active = true;
			devMatrix[i].XYposition = device.XYposition;
			devMatrix[i].LLposition = device.LLposition;
			//pass 3d mesh to temp device to update canvas
			device.mesh = devMatrix[i].mesh;
			device.range = devMatrix[i].range;
			
			if (devMatrix[i].type == "sNode") {
				for (j=0; j < sNodePoints.length; j++) {
					if (devMatrix[i].id == sNodePoints[j].id) {
						sNodePoints[j].x = devMatrix[i].XYposition.lat;
						sNodePoints[j].y = devMatrix[i].XYposition.lon;
					}
				}
			}
			exists = true;
			break;
		}
	}
	
	//store a new device
	if (!exists) {
		devMatrix.push(device);
		if (device.type == "sNode") {
			var pnt = new point(device.id, device.XYposition.lat, device.XYposition.lon);
			sNodePoints.push(pnt);
		}
	}
	
	print("Device stored successfully.");
}

//updates the GUI panels
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
		var addId = $('#device-table').dataTable().fnAddData( [
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
		//if accuracy indicator settings is off, make range invisible
		if (!ACCURACY) {
			hideAccuracy(device);
		};
	}
	
	if (device.type == "sNode") {
		if (sNodePoints.length > 2) {
			setPolygon(calculateConvexHull());
			//if search area highlight setting is off, make polygon invisible
			if (!POLYGON) {
				hidePolygon();
			}
		}
	}

	//store 3D objects to devMatrix
	storeMeshes(device);
	print("3D canvas updated.");

}

//prints to console panel
function print(str) {
	var nl = "<br>";
	
	//var output = JSON.stringify(str);
  $(".console").append(str + nl);
    
  //keep scrollbar fixed to the bottom
  $(".console").scrollTop(1000000000);
	
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

//applies Settings changes
function setSettings(settings) {
	
	if (CHK_TIMEOUT != settings.timeout * 1000) {
		CHK_TIMEOUT = settings.timeout * 1000;
		print("Node timeout internal set to " + CHK_TIMEOUT/1000 + " seconds.");
	}
	if (SRV_PORT != settings.server) {
		SRV_PORT = settings.server;
		print("Control Centre's server port set to [" + SRV_PORT + "].");
		updatePort(SRV_PORT, error, message, listening);
	}
	if (POS_ALGORITHM.address != settings.paip) {
		POS_ALGORITHM.address = settings.paip;
		print("Positioning Algorithm IP Address updated to [" + POS_ALGORITHM.address + "].");
	}
	if (POS_ALGORITHM.port != settings.paport) {
		POS_ALGORITHM.port = settings.paport;
		print("Positioning Algorithm port number updated to [" + POS_ALGORITHM.port + "].");
	}
	if (ACCURACY != settings.accuracy) {
		ACCURACY = settings.accuracy;
		if (ACCURACY) {
	 		for (i = 0; i < devMatrix.length; i++) {
	 			if (devMatrix[i].type == "MT") {
	 				displayAccuracy(devMatrix[i]);
	 			}
	 		}
	 		print("Accuracy indicators activated.");
		} else {
	 		for (i = 0; i < devMatrix.length; i++) {
	 			if (devMatrix[i].type == "MT") {
	 				hideAccuracy(devMatrix[i]);
	 			}
	 		}
	 		print("Accuracy indicators deactivated.");
		}
	}
	
	if (POLYGON != settings.polygon) {
		POLYGON = settings.polygon;
		if (POLYGON) {
			print("Search area highlight activated.");
			if (sNodePoints.length > 2) {
	 			displayPolygon();
	 		}
		} else {
			print("Search area highlight deactivated.");
			if (sNodePoints.length > 2) {
	 			hidePolygon();
			}
		}
	}

}

//fills the Key Map panel with the real-world coords
function setLL(device) {
	
	var tlat = parseFloat(device.LLposition.lat);
	var tlon = parseFloat(device.LLposition.lon);
	var talt = parseFloat(device.LLposition.alt);
	
	$("#lat").html(" " + tlat.toFixed(6) + " ");
	$("#long").html(" " + tlon.toFixed(6) + " ");
	$("#alt").html(" " + talt.toFixed(2) + " ");

	displayLL(device);	
}

//displays info & coords for the selected device
function displayLL(device) {
 	
 	devTable.fnFilter("#" + device.id + " " + device.type);
 	
	//clear previous clicks
	$("#snode").removeClass("hovered");
	$("#mnode").removeClass("hovered");
	$("#mterminal").removeClass("hovered");
	
	//hover the appropriate type
	if (device.type == "sNode") {	
		$("#snode").addClass("hovered");
	} else if (device.type == "mNode") {	
		$("#mnode").addClass("hovered");
	} else if (device.type == "MT") {	
		$("#mterminal").addClass("hovered");
	}
	
	//reveal its coordinates
	$("#coords").show(300);
}

//hides specific info & coords and resets GUI to all-view
function hideLL() {
	
	devTable.fnFilter(" ");

	//hide the coordinates
	$("#coords").hide(200);
	
	//clear clicks
	$("#snode").removeClass("hovered");
	$("#mnode").removeClass("hovered");
	$("#mterminal").removeClass("hovered");
}

//calculates the Convex Hull of sNodes, returning the array with the points
function calculateConvexHull() {

	// Sort the points by X, then by Y (required by the algorithm)
	sNodePoints.sort(sortPointY);
	sNodePoints.sort(sortPointX);
	
	// Calculate the convex hull
	// Takes: an (1) array of points with x() and y() methods defined
	//          (2) Size of the points array
	//          (3) Empty array to store the hull points
	// Returns: The number of hull points, which may differ the the hull points array’s size
	sNodeConvexHull_size = chainHull_2D(sNodePoints, sNodePoints.length, sNodeConvexHull);

	return sNodeConvexHull;
}

//closes and creates a new socket server updating the listening port
function updatePort(SRV_PORT, error, message, listening) {
	
	print("Restarting socket server..");
	server.close();
	server = dgram.createSocket("udp4");
	server.bind(SRV_PORT);

	server.on("error", function (err) {
  	error(err);
	});
	
	server.on("message", function (msg, rinfo) {
		message(msg,rinfo);
	});  
	
	server.on("listening", function () {
  	listening();
	});  
	
}