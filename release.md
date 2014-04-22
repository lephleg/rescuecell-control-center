# RESCUECELL Control Centre
##Release Log


#### v0.65 Release Notes

*  CC can receive and forward socket datagrams to devices.
*  CC can receive and forward socket datagrams to Positional Algorithm.
*  GSM networks are now launched in the background by executing shell commands (linux only).

#### v0.8 Release Notes

*	Coordinates transformation enabled. CC can now receive data in decimal Latitude/Longitude format.
*	Layout optimized for lower screen resolutions (900x600).
*	Linux test release.

#### v0.9 Release Notes

*	Device connection status now change after 2 minutes of inactivity.
*	Status of Nodes & Terminals table panel:
> *   Empty table displays now a message.
> *	  Mouse hover over status icon displays the time the last datagram received from the selected device.
*	A bug preventing the update on an existing 3D mesh position has been fixed.

#### v1.00 Release Notes

*	Accuracy indicators has been added for MTs.
*	Search area highlight polygon has been added.
*	Clicking on a sphere 3d object reveals it’s real world coordinates and filters the Status of Node & Terminals table panel. Clicking everywhere else resets to general view.
*	Control Centre’s window is now non resizable, to ensure selecting accuracy (fixed to 900x600).
*	3D world full size mode button has been added.
*	Settings modal is now full functional:
> *	General Settings
> > *	End-user can now set the inactivity timeout internal (default: 120 seconds)
> *	Connection Settings
> > *	Control Centre’s listening port can now be set at runtime. (default: 41234)
> > *	Positioning Algorithm’s IP address and port can now be configured at runtime. (default: 127.0.0.1:55555)
> *	Display Options
> > *	End-user can switch accuracy indicators visibility ON/OFF. (default: OFF)
> > *	End-user can turn search area highlight polygon ON/OFF. (default: OFF)
