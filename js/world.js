// world.js
// 3D World code | Grid initialization code & mesh design functions

//Canvas dimensions
var grid = document.getElementById("grid");
var WIDTH = $("#grid").width(),
	HEIGHT = $("#grid").height();

//Sphere design parameters
var RADIUS = 0.35,
	SEGMENTS = 24,
	RINGS = 24;

var RED_SPHERE_MATERIAL = new THREE.MeshLambertMaterial(
		{ color: 0xCC0000 });
var GREEN_SPHERE_MATERIAL = new THREE.MeshLambertMaterial(
		{ color: 0x229210 });
var BLUE_SPHERE_MATERIAL = new THREE.MeshLambertMaterial(
		{ color: 0x004dfc });
		
//Accuracy indicator design parameters
var ACCURACY_MATERIAL = new THREE.MeshBasicMaterial( 
		{ color: 0xF0C400, 
			transparent: true });
ACCURACY_MATERIAL.opacity = 0.4;

/*===============================================================*/

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var stats;
var camera, controls, scene, renderer, gl, projector, objects = [];
var polyMesh;
var edges;

init();
animate();

function init() {
	
	//Additional non-3d elements	
	// info div
	info = document.createElement( 'div' );
	info.className='grid-label';
	//info.style.color = "#ffffff";
	info.style.position = 'absolute';
	info.style.bottom = '10px';
	info.style.width = '100%';
	info.style.textAlign = 'center';
	info.innerHTML = 
		"<strong>drag</strong> to rotate - " + 
		"<strong>right-click</strong> to move - " + 
		"<strong>scroll</strong> to zoom - " + 
		"<strong>click</strong> for node details";
	$(".grid").append( info );

	// stat monitor widget
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '5px';
	stats.domElement.style.zIndex = 100;
	$(".grid").append( stats.domElement );		
	
	//3d world setup
	// scene
	scene = new THREE.Scene();
	scene.add( new THREE.GridHelper(200,1));
	scene.add( new THREE.AxisHelper(200));
	scene.fog = new THREE.FogExp2( 0xcccccc, 0.007 );	
	
	// camera
	camera = new THREE.PerspectiveCamera( 60, WIDTH/HEIGHT, 0.5, 400 );
	camera.position.z = 12;
	camera.position.y = 7;
	camera.position.x = 2.5;
	camera.lookAt(new THREE.Vector3(0,0,0));

	// orbit cotrols
	controls = new THREE.OrbitControls(camera, grid);
	controls.addEventListener( 'change', render );

	// lights
	var pointLight = new THREE.PointLight(0xFFFFFF);
				
	pointLight.position.x = 10;
	pointLight.position.y = 50;
	pointLight.position.z = 130;
			
	scene.add(pointLight);
				
	var skylight = new THREE.HemisphereLight(0xADECFF, 0x000000, 0.8)
	scene.add(skylight);

	// renderer
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setClearColor( scene.fog.color, 1 );
	renderer.setSize(WIDTH, HEIGHT);
	grid.appendChild( renderer.domElement );
	
	// projector
	projector = new THREE.Projector();

}

//renders a frame
function render() {

	renderer.render( scene, camera );
	stats.update();
}

//animates frames by using requestAnimationFrame
function animate() {
	render();

	TWEEN.update();
	requestAnimationFrame( animate );
}

//resizes 3d canvas to fullscreen, back and forth
function onFullScreen(state) {
	
	//in case of fullscreen hide the bottom margin of 10px
	if (state) {
	
		camera.aspect = $("#grid").width() / ($( window ).height()-40);
		camera.updateProjectionMatrix();
		renderer.setSize( $("#grid").width(), ($( window ).height())-40);

	//if not, reveal it
	} else {
		
		camera.aspect = $("#grid").width() / ($( window ).height()-50);
		camera.updateProjectionMatrix();
		renderer.setSize( $("#grid").width(), ($( window ).height())-50);
		
	}
}

//onClick event handler
function onCanvasClick(event) {
    
		//screen-to-world translation pattern
    var elem = renderer.domElement, 
        boundingRect = elem.getBoundingClientRect(),
        x = (event.clientX - boundingRect.left) * (elem.width / boundingRect.width),
        y = (event.clientY - boundingRect.top) * (elem.height / boundingRect.height);    

    var vector = new THREE.Vector3( 
         ( x / WIDTH ) * 2 - 1, 
        - ( y / HEIGHT ) * 2 + 1, 
        0.5 
    );

    projector.unprojectVector( vector, camera );
    var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
    var intersects = ray.intersectObjects( objects );    

    if ( intersects.length > 0 ) {
        intersects[0].object.callback();
    } else {
    		hideLL();
    }
}

//creates a new sphere mesh object for the specific device
function setSphere(device) {
	
	//set the color based on type
	var material;
	if (device.type == "sNode") {
		material = RED_SPHERE_MATERIAL;
	} else if (device.type == "mNode") {
		material = GREEN_SPHERE_MATERIAL;
	} else if (device.type == "MT") {
		material = BLUE_SPHERE_MATERIAL;
	}
	
	var sphere = new THREE.Mesh(
		new THREE.SphereGeometry(RADIUS,SEGMENTS,RINGS),
		material);
	
	//place the sphere at the right position
	sphere.position.x = device.XYposition.lat;
	sphere.position.z = device.XYposition.lon;
	sphere.position.y = device.XYposition.alt;

	//set a callback function to display LL position on click
	sphere.callback = function() { 
		setLL(device);
	}
	
	//set initial scale to 10% and animate to 100% within 0.75sec
	sphere.scale.x = 0.1;
	sphere.scale.y = 0.1;
	sphere.scale.z = 0.1;
	
	var start = {x:0.1, y:0.1, z:0.1 };
	var target = {x:1.0, y:1.0, z:1.0 };

	var tween = new TWEEN.Tween(start).to(target, 750);
	tween.easing(TWEEN.Easing.Elastic.Out);

	tween.onUpdate(function(){
    sphere.scale.x = start.x;
    sphere.scale.y = start.y;
    sphere.scale.z = start.z;
	});
	tween.start();

	//add sphere to scene
	scene.add(sphere);
	
	//add sphere to objects stack
	objects.push(sphere);	
	
	return sphere;
}

//updates a sphere's position & accuracy based on new device obj properties
function updateSphere(device) {

	//copy existing mesh properties
	var sphere = device.mesh;
	
	//set the start and target position for the tween
	var position = { x:sphere.position.x, z:sphere.position.z, y:sphere.position.y };
	var target = { x:device.XYposition.lat, z:device.XYposition.lon, y:device.XYposition.alt };

	//set the time of animation
	var tween = new TWEEN.Tween(position).to(target, 750);
	//set the easing function
	tween.easing(TWEEN.Easing.Quadratic.Out);
	
	//update position at every step
	tween.onUpdate(function(){
    sphere.position.x = position.x;
    sphere.position.y = position.y;
    sphere.position.z = position.z;
	});
	
	//complete configuration and set it active
	tween.start();
	
	return sphere;
}

//creates a semi-transparent sphere mesh around the device as an accuracy indicator
function setAccuracy(device) {
	
	//use accuracy value as sphere radius and a transparent material
	var radius = device.acc,
    geometry = new THREE.SphereGeometry( radius, SEGMENTS, RINGS );
    
  var range = new THREE.Mesh(geometry, ACCURACY_MATERIAL);
    
  //use device position as its center  
  range.position.set(device.XYposition.lat,device.XYposition.alt,device.XYposition.lon);
  
	scene.add(range);
	
	return range;
}

//updates the current accuracy indicator for the specified device
//based on its new position and accuracy values
function updateAccuracy(device) {
	
	//remove old mesh from scene
	scene.remove(device.range);
	
	//create a new geometry with the new radius
	var geometry = new THREE.SphereGeometry( device.acc, SEGMENTS, RINGS );

	//create a new mesh with a the new geometry and the old material
	var range = new THREE.Mesh(geometry, ACCURACY_MATERIAL);

	//set its position
	range.position.x = device.XYposition.lat;
	range.position.z = device.XYposition.lon;
	range.position.y = device.XYposition.alt; 
	 
	scene.add(range);
	
	return range;
}

//display the accuracy indicator mesh
function displayAccuracy(device) {
	
	if (device.range != null) {
		device.range.visible = true;
	}
}

//hide the accuracy indicator mesh
function hideAccuracy(device) {

	if (device.range != null) {
		device.range.visible = false;
	}
}

//creates a semi-transparent shape with sNodes as its edges, to highlight search area 
function setPolygon(convexHull) {
	
	//remove existent shapes
	scene.remove(polyMesh);
	scene.remove(edges);
	
	//create a shape geometry using sNodeConvexHull points as edges
	polygon = new THREE.Shape();
	polygon.moveTo(sNodeConvexHull[0].x,sNodeConvexHull[0].y);
	for (i = 1; i < convexHull.length; i++) {
		polygon.lineTo(convexHull[i].x,convexHull[i].y);
	}	
	var polyGeom = new THREE.ShapeGeometry( polygon );
	
	//set shape's color and transparency
	var polyMat = new THREE.MeshBasicMaterial( { color: 0xff0000, side: THREE.DoubleSide, transparent: true } );
	polyMat.opacity = 0.4;
	
	polyMesh = new THREE.Mesh(polyGeom, polyMat);	
	
	//set shape to horizontal position
	polyMesh.rotation.x = 1.57;
	
	//use EdgesHelper to highlight the actual polygon
	edges = new THREE.EdgesHelper( polyMesh, 0xff0000);
	edges.material.linewidth = 3;
	
	//add meshes to scene
	scene.add(polyMesh);
	scene.add(edges);
}

//display sNodes convex hull
function displayPolygon() {
	polyMesh.visible = true;
	edges.visible = true;
}

//hide sNodes convex hull
function hidePolygon() {
	polyMesh.visible = false;
	edges.visible = false;
}