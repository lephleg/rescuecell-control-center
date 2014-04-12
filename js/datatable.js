// datatable.js
// DataTable | Device datatable initialization code

var devTable;

$(document).ready(function() {
	devTable = $('#device-table').dataTable( { 
 		"bSorted": false,
    "bAutoWidth": true,
    "bFilter": false,
    "bLengthChange": false,
    "bInfo":false,
    "bPaginate": false,
		"aoColumnDefs": [
			{ "sClass": "ip-column", "aTargets": [ 3 ] },
			{ "sClass": "status-column", "aTargets": [ 4 ] }
		]
  } );
} );
