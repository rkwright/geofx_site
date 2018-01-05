/*
 * @author rkwright / www.geofx.com
 *
 * Copyright 2017, All rights reserved.
 *
 */

var MAZE = {
    revision: 'r02',

    // cardinal directions
    SOUTH : 0,
    WEST  : 1,
    NORTH : 2,
    EAST  : 3,

    // 1 << (cardinal_direction)
    SOUTH_BIT : 1,
    WEST_BIT  : 2,
    NORTH_BIT : 4,
    EAST_BIT  : 8,

    //this.EdgeStr = ["S", "W", "N", "E"];
    EdgeBit    : [1, 2, 4, 8],
    OppEdgeBit : [4, 8, 1, 2],
    XEdge      : [0, -1, 0, 1],
    YEdge      : [-1, 0, 1, 0],
    EdgeIndx   : [[-1,  0, -1],
                  [ 1, -1,  3],
                  [-1,  2, -1]]
};

/**
 * Simple little class to hold the coordinates for the stack management
 * @param x
 * @param y
 */
MAZE.Coord = function( x, y ) {

    this.x = x;
    this.y = y;
};

/**
 * Initialize the parameters that control the maze-building
 * process.
 *
 * @param col - number of columns in the maze
 * @param row - number of rows in the maze
 * @param seedX - x-index of seed cell
 * @param seedY - y-index of seed cell
 */
MAZE.Maze = function ( col, row, seedX, seedY ) {

    this.neighbors = [];
    this.maxNeighbors = 0;	// just for info's sake

    this.row = row;         // actual number of rows in maze
    this.col = col;         // actual number of cols in maze

    this.cells = new Uint8Array(this.row * this.col).fill(0);

    this.seedX = seedX;
    this.seedY = seedY;

    this.cells[seedY * this.row + seedX] = 0xff;

    this.random = [
        0.7089998792613033,
        0.2984042827075908,
        0.151327677518597,
        0.5311409004659107,
        0.3592650838882001,
        0.12786247721616228,
        0.08303331111448853,
        0.13022329844710323,
        0.3901487586026049,
        0.9507173128886488,
        0.43746401482808395,
        0.349821701435554,
        0.7707404924385883,
        0.032055300540311915,
        0.20838748976454724,
        0.9388920819931408,
        0.0756514748990138,
        0.606463251716048,
        0.7744438337871995,
        0.8881816498950352,
        0.6959170586112238,
        0.7078428113596047,
        0.9319804811012935,
        0.3097252899190752,
        0.30846991398937096,
        0.9158152580489112,
        0.6421344322846634,
        0.5149000577715059,
        0.7896001483653874,
        0.5242420736444318,
        0.344417139647895,
        0.7072985028307064
    ];

    //for ( var i=0; i<32; i++ ) {
    //    console.log(Math.random() + ",");
    //}
};

MAZE.Maze.prototype = {

    /**
     * Builds the maze.  basically, it just starts with the seed and visits
     * that cell and checks if there are any neighbors that have NOT been
     * visited yet.  If so, it adds the to neighbors list.
     */
    build: function () {

        var coord = new MAZE.Coord( this.seedX, this.seedY );

        do {

            this.findNeighbors( coord.x, coord.y );

            var k = this.getRandomInt( 0, this.neighbors.length );
            var k = this.getRandomInt( 0, this.neighbors.length );

            coord = this.neighbors.splice(k,1)[0];

            //console.log("Dissolving edge for current cell: " + coord.x.toFixed(0) + " " +
            //      coord.y.toFixed() + " k: "  + k.toFixed(2));

            this.dissolveEdge( coord.x, coord.y) ;
        }
        while (this.neighbors.length > 0);
    },

    /**
     * Finds all neighbors of the specified cell.  Each neighbor is pushed onto
     * the "stack" (actually just an array list.
     *
     * @param x - current index into the array
     * @param y
     */
    findNeighbors: function (  x, y ) {

        var     zx,zy;

        for ( var i=0; i<4; i++ ) {

            zx = x + MAZE.XEdge[i];
            zy = y + MAZE.YEdge[i];

            // if indicies in range and cell still zero then the cell is still in the "src list"
            if (zx >= 0 && zx < this.col && zy >= 0 && zy < this.row
                        && this.cells[zy * this.row + zx] === 0) {

                // set the upper bits to indicate that this cell has been "found"
                this.cells[zy * this.row + zx] = 0xf0;

                this.neighbors.push(new MAZE.Coord(zx,zy));

                //console.log("Adding to neighbors: " + zx.toFixed(0) + " " + zy.toFixed(0));

                this.maxNeighbors = Math.max( this.maxNeighbors, this.neighbors.length );
            }
        }
    },

    /**
     * Dissolves the edge between the specified cell and one of the
     * adjacent cells in the spanning tree.  However, it does so ONLY
     * if the adjacent cell is already part of the "maze tree", i.e.
     * it won't open a cell into an unvisited cell.
     * The algorithm is such that it is guaranteed that each cell will
     * only be visited once.
     *
     * @param x - cur index
     * @param y
      * return - true if added to the tree
     */
    dissolveEdge: function( x, y ) {

        var		edg;
        var     edgeRay = [];
        var		zx,zy;
        var     cellVal;

        // build the fence for this cell
        this.cells[y * this.row + x] = 0xff;

        for ( var i=0; i<4; i++ ) {

            zx = x + MAZE.XEdge[i];
            zy = y + MAZE.YEdge[i];

            // if indicies in range and cell has been visited, push it on the local stack
            cellVal = this.cells[zy * this.row + zx] & MAZE.OppEdgeBit[i];
            if ( zx >= 0 && zx < this.col && zy >= 0 && zy < this.row && cellVal !== 0 ) {

                edgeRay.push( i );
            }
        }

        if ( edgeRay.length > 0 ) {

            var n = this.getRandomInt(0, edgeRay.length);
            edg = edgeRay[n];
            zx  = x + MAZE.XEdge[edg];
            zy  = y + MAZE.YEdge[edg];

            this.cells[y * this.row + x]   ^= MAZE.EdgeBit[edg];
            this.cells[zy * this.row + zx] ^= MAZE.OppEdgeBit[edg];

            //console.log("In cell " + x.toFixed(0) + " " + y.toFixed(0) +
             //   " dissolving edge: " + this.EdgeStr[edg] + " into cell: " + zx.toFixed(0) + " " + zy.toFixed(0));
        }
    },

    /**
     * Dissolve the specified edge of the seed cell to form an exit
     * @param edg
     */
    dissolveExit: function ( edg ) {
        this.cells[this.seedY * this.row + this.seedX]   ^= MAZE.EdgeBit[edg];
    },

    /**
     * Get a random integer between the minimum and the maximum.  The result may include the minimum
     * but will NOT include the maximum.
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
     *
     * @param min
     * @param max
     */
    getRandomInt: function ( min, max ) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    },

    /**
     * Return a random integer between min and max. The result may include the minimum
     * but will NOT include the maximum.  The random value is pulled from a static list of
     * pre-generated list of random values. This is to allow reproducible mazes.
     */
    getRandomInt2: function ( min, max ) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(this.random.pop() * (max - min)) + min;
    },
    /**
     * @param col
     * @param row
     */
    dumpEdges: function(  col, row ) {
        for ( var  i=0; i<row; i++)
            for ( var  j=0; j<col; j++ )
            {
                var mz = this.cells[i * this.row + j];
                console.log(i.toFixed(0) + " " + j.toFixed(0) +
                    " S: " + (mz & MAZE.SOUTH_BIT) + " W: " + (mz & MAZE.WEST_BIT) +
                    " N: " + (mz & MAZE.NORTH_BIT) + " E: " + (mz & MAZE.EAST_BIT)  );
            }
    }
};


