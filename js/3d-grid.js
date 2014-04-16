// 3d-grid.js
// 3D code | Grid initialization code & mesh design functions

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
var camera, controls, scene, renderer, gl;

init();
render();

function init() {
				
	camera = new THREE.PerspectiveCamera( 60, WIDTH/HEIGHT, 0.5, 400 );
	camera.position.z = 12;
	camera.position.y = 7;
	camera.position.x = 2.5;
	camera.lookAt(new THREE.Vector3(0,0,0));

	controls = new THREE.OrbitControls(camera, grid);
	controls.addEventListener( 'change', render );

	scene = new THREE.Scene();
	scene.add( new THREE.GridHelper(200,1));
	scene.add( new THREE.AxisHelper(200));
	scene.fog = new THREE.FogExp2( 0xcccccc, 0.007 );
	

	// info
	info = document.createElement( 'div' );
	info.className='grid-label';
	info.style.position = 'absolute';
	info.style.bottom = '10px';
	info.style.width = '100%';
	info.style.textAlign = 'center';
	info.innerHTML = "drag to rotate camera - right-click to move - scroll to zoom";
	$(".grid").append( info );


	// stat counter widget
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '5px';
	stats.domElement.style.zIndex = 100;
	$(".grid").append( stats.domElement );

	// lights
	var pointLight1 = 
		new THREE.PointLight(0xFFFFFF);
				
	pointLight1.position.x = 10;
	pointLight1.position.y = 50;
	pointLight1.position.z = 130;
			
	scene.add(pointLight1);
				
	var skylight = new THREE.HemisphereLight(0xADECFF, 0x000000, 0.8)
	scene.add(skylight);

	// renderer
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setClearColor( scene.fog.color, 1 );
	renderer.setSize(WIDTH, HEIGHT);

	grid.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

	camera.aspect = $("#grid").width() / ($( window ).height()-80);
	camera.updateProjectionMatrix();

	renderer.setSize( $("#grid").width(), ($( window ).height())-80);
		
		/*		
	if (window.innerWidth > 992) {
		camera.aspect = $("#grid").width() / (window.innerHeight-125);
		camera.updateProjectionMatrix();
				
		renderer.setSize( window.innerWidth*0.75, window.innerHeight-125);
	}
*/
	render();
}

function render() {

	renderer.render( scene, camera );
	stats.update();

}

function setSphere(device) {
	
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
		
	sphere.position.x = device.position.lat;
	sphere.position.z = device.position.lon;
	sphere.position.y = device.position.alt;

	scene.add(sphere);
	//centerCamera(sphere);
	
	render();
	return sphere;
}

function updateSphere(device) {

	//copy existing mesh properties
	var sphere = device.mesh;
	
	//update its position
	sphere.position.x = device.position.lat;
	sphere.position.z = device.position.lon;
	sphere.position.y = device.position.alt;
	
	render();

	return sphere;
}

function centerCamera(mesh) {
	
	//TODO - Tween needed
	
	//camera.position.z = (mesh.position.z+10);
	//camera.position.y = (mesh.position.y+10);
	//camera.position.x = (mesh.position.x+10);
	camera.lookAt(new THREE.Vector3(mesh.position.x,mesh.position.y,mesh.position.z));
	
	render();
}

//creates a semi-transparent sphere mesh around the device as an accuracy indicator
function setAccuracy(device) {
	
	//use accuracy value as sphere radius and a transparent material
	var radius = device.acc,
    geometry = new THREE.SphereGeometry( radius, SEGMENTS, RINGS );
    
  var range = new THREE.Mesh(geometry, ACCURACY_MATERIAL);
    
  //use device position as its center  
  range.position.set(device.position.lat,device.position.alt,device.position.lon);
  
	scene.add(range);
	render();
	
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
	range.position.x = device.position.lat;
	range.position.z = device.position.lon;
	range.position.y = device.position.alt; 
	 
	scene.add(range);
	render();
	
	return range;
}

function displayAccuracy(device) {
	
	device.range.visible = true;
	render();
	
}

function hideAccuracy(device) {

	device.range.visible = false;
	render();
	
}

