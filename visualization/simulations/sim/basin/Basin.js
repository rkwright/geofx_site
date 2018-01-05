/*
 * @author rkwright / www.geofx.com
 *
 * Copyright 2017, All rights reserved.
 *
 */

var BASIN = {
            revision : 'r02',
            QNUMER   :  1.0,	// numerator of slope f(Q) eqn.
            QEXPON   : -0.15,    // exponent of slope f(Q) eqn
            QINTCP   :  2.0,    // offset for slope f(Q) eqn
            RUGOSITY :  0.5     // degree of rugosity (channel interfluve height)
};

BASIN.GeoCell = function () {

    this.order     = -1;	// stream order of this cell, -1 means not set
    this.area      = 1;     //  Init as 1 - every basin must be its own contributor!
    this.chanLen   = 0;     // channel length below this cell
    this.exit      = 0;     // side on which stream exits cell
    this.chanElev  = 0;     // elev of channel, in maze units
    this.chanSlope = 0;		// slope of chanel, in maze units
};

/**
 * Constuctor
 */

BASIN.Basin = function ( nCells ) {

    this.nCells = nCells;

    this.maze = null;

    this.rat = null;

    this.geos = [];

    this.firstOrder = [];

    this.elevScale = 0.5 / nCells;

    this.basinArea = nCells * nCells;

    bthis = this;
};

BASIN.Basin.prototype = {

    /**
     * Construct the catchment (maze) then walk the maze twice to
     * get the channel and morphology parameters.
     */
    construct: function () {

        this.maze = new MAZE.Maze( this.nCells, this.nCells, 0, 0 );

        this.maze.build();

        this.maze.dissolveExit( MAZE.WEST);

        for ( var i = 0; i < this.maze.row; i++ ) {
            this.geos[i] = [];

            for ( var j = 0; j < this.maze.col; j++ ) {
                this.geos[i][j] = new BASIN.GeoCell();
            }
        }

        this.traverseStreams();
    },

    /**
     * Construct the rat and traverse the streams (twice)
     */
    traverseStreams: function () {

        this.rat = new MAZE.MazeRat(this.maze);

        this.rat.initSolveObj(0x80, false, this.getMorphParms);

        this.rat.findSolution(-1, 0);

        this.rat.retraceSteps();

        this.rat.initSolveObj(0x80, true, this.getChanParms);

        this.rat.findSolution(-1, 0);
    },

    /**
     * First pass the rat is going up to each cul-de-sac (first order basin) and
     * then retracing its steps back down and reporting the results.
     */
    getMorphParms: function( label, rat,  i,  j, nexi, nexj, pathlen, bSac ) {
        var	x0,y0;
        var curG = bthis.geos[i][j];
        var nexG = (nexi >= 0 && nexj >=  0) ? bthis.geos[nexi][nexj] : undefined;
        x0 = nexj - j + 1;
        y0 = nexi - i + 1;

        curG.exit = MAZE.EdgeIndx[y0][x0];

        // if this is a cul-de-sac, then init it to be 1, i.e. first order
        if ( bSac )
            curG.order = 1;

        //curG.chanSlope = (BASIN.QNUMER / Math.pow( curG.area + BASIN.QINTCP, BASIN.QEXPON)) * bthis.elevScale;
        curG.chanSlope = 1 / Math.pow( bthis.basinArea / curG.area, BASIN.QEXPON) * bthis.elevScale;

        if (nexG !== undefined) {
            nexG.area += curG.area;

            if (nexG.order === curG.order)
                nexG.order++;
            else if (nexG.order < curG.order)
                nexG.order = curG.order;

            //console.log(label + " i,j: " + i.toFixed(0) + " " + j.toFixed(0) + " nexti,j: " + nexi.toFixed(0) + " " + nexj.toFixed(0) +
            //    " area: " + curG.area + " next_area: " + nexG.area.toFixed(0) + " order: " + curG.order.toFixed(0) +
            //    " next_order: " + nexG.order.toFixed(0) + " chanSlope: " + curG.chanSlope.toFixed(3) + " pathLen: " + pathlen.toFixed(1));
        }
        //else
            //console.log(label + " i,j: " + i.toFixed(0) + " " + j.toFixed(0) + " nexti,j: " + -1 + " " + -1 +
            //    " area: " + curG.area + " next_area: " + -1 + " order: " + curG.order.toFixed(0) +
            //    " next_order: " + -1 + " chanSlope: " +  curG.chanSlope.toFixed(3)  + " pathLen: " + pathlen.toFixed(1));
    },

    /**
     * If we are in the second pass and GOING UP the stream network (maze)
     * then we calculate the elevation of each catchment elm as the elevation
     * of the elm we are leaving (into which this elm flows) and the slope
     * of the elm we are leaving.  We do this on the second pass since during
     * the first pass we don't know the slope of each elm because we don't
     * know the area contributing to each elm until the whole basin has been
     * traversed.
     */
    getChanParms: function( label, rat,  i,  j, previ, prevj, pathlen, bSac ) {

        var curG = bthis.geos[i][j];
        var prevG = (previ >= 0 && prevj >= 0) ? bthis.geos[previ][prevj] : undefined;

        if (prevG !== undefined)
            curG.chanElev = prevG.chanElev + prevG.chanSlope;

        if (bSac) {
            // save position in Sack list
            bthis.firstOrder.push(MAZE.Coord(i, j));
        }

        // chan_leng is the length of the mouse's current travels!
        curG.chanLen = pathlen;

        /*
        if (prevG !== undefined)
            console.log(label + " From: i,j: " + previ.toFixed(0) + " " + prevj.toFixed(0) +
                " To i,j: " + i.toFixed(0) + " " + j.toFixed(0) + " elev: " + curG.chanElev.toFixed(3)  + " pathLen: " + pathlen.toFixed(1) );
        else
            console.log(label + " From: i,j: " + -1 + " " + -1 +
                " to i,j: " + i.toFixed(0) + " " + j.toFixed(0) + " elev: " + 0  + " pathLen: " + pathlen.toFixed(1) );
        */
    }
};


