// gui-init.js 
// GUI-Init | GUI Initialization code

//Global variables
//default settings for Settings modal form
var settings = new settings("120","41234","127.0.0.1","55555",false,false);	

// Click event listener on fullscreen button
$("#full-screen").click( function() {
	
    $('#grid').toggleClass('col-sm-8 col-sm-12');
    $('#full-screen').toggleClass('glyphicon-resize-full glyphicon-resize-small');
        
    if ($("#grid").hasClass("col-sm-12")) {
    	onFullScreen(true);
    } else {
    	onFullScreen(false);
    }
   
});

// Click listener for Settings modal 
$(document).on("click", ".open-settingsModal", function (e) {
	$('#timeout').val(settings.timeout);
	$('#server-port').val(settings.server);
	$('#pa-ip').val(settings.paip);
	$('#pa-port').val(settings.paport);
	$('#accuracy-switch').bootstrapSwitch('state',settings.accuracy);
	$('#polygon-switch').bootstrapSwitch('state',settings.polygon);
});

// DataTable | Device datatable initialization code
var devTable;

$(document).ready(function() {
	devTable = $('#device-table').dataTable( { 
 		"bSorted": false,
    "bAutoWidth": true,
    "bFilter": true,
    "bLengthChange": false,
    "bInfo":false,
    "bPaginate": false,
		"aoColumnDefs": [
			{ "sClass": "ip-column", "aTargets": [ 3 ] },
			{ "sClass": "status-column", "aTargets": [ 4 ] }
		]
  } );
} );

// Initialize Bootstrap popovers 
$('[data-toggle="popover"]').popover();
$('body').on('click', function (e) {
	$('[data-toggle="popover"]').each(function () {
  //the 'is' for buttons that trigger popups
  //the 'has' for icons within a button that triggers a popup
  	if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
    	$(this).popover('hide');
    }
  });
});

// Hide coords (default state)
$("#coords").hide();

// SETTINGS MODAL INITIALIZATION
// Initialize Bootstrap Switch
$('input:checkbox').bootstrapSwitch();

// Click event listener for save button
$("#save-btn").click(function() {
	
	settings.timeout = $('#timeout').val();
	settings.server = $('#server-port').val();
	settings.paip = $('#pa-ip').val();
	settings.paport = $('#pa-port').val();
	settings.accuracy = $("#accuracy-switch").is(":checked");
	settings.polygon = $("#polygon-switch").is(":checked");

	$('#settingsModal').modal('hide');
	setSettings(settings);
	
});

// CONSTRUCTOR

//settings obj constructor
function settings(timeout,server,paip,paport,accuracy,polygon) {
	this.timeout=timeout;
	this.server=server;
	this.paip=paip;
	this.paport=paport;
	this.accuracy=accuracy;
	this.polygon=polygon;
}


