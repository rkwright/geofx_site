/*
 * @author rkwright / www.geofx.com
 *
 * Copyright 2017, All rights reserved.
 *
 */

var GEOCELL = {
    revision: 'r01',
};

BASIN.GeoCell = function () {

	this.order     = 0;		// stream order of this cell
	this.area      = 0;     // catchment area, in unit cells
	this.chanLen   = 0;     // channel length below this cell
	this.exit      = 0;     // side on which stream exits cell
	this.elev      = 0;     // elevation of outlet itself
 	this.chanElev  = 0;     // elev of channel, in maze units
	this.chanSlope = 0;		// slope of chanel, in maze units
};
