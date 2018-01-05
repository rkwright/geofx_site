/*
 * @author rkwright / www.geofx.com
 *
 * Copyright 2017, All rights reserved.
 *
 */

BASIN3D = {
    revision : 'r02',
    MIN_ORDER : 3
};

BASIN3D.Basin3D = function ( nCells ) {

    this.nCells = nCells;
    this.plane = null;
    this.terrain = [];
    this.basin = null;
    this.planeMesh = null;
    this.scale3D = 5 / nCells;
    this.deltaBase = 0;
    this.limits = {};
    this.streamMat =  new THREE.MeshLambertMaterial({color: 0x79a1d1});
    this.streamNet = new THREE.Group();
    this.cylinderUtil = new GFX.CylinderUtil();

    this3D = this;

    this.surfaceCover = [
        { name: "grass"    , rgb: 0xE6DF73, fluveScale: 0.25 },
        { name: "chapparal", rgb: 0xC4BF6E, fluveScale: 0.50 },
        { name: "hardwood" , rgb: 0x7ea74f, fluveScale: 0.75 },
        { name: "conifer"  , rgb: 0x469f4e, fluveScale: 1.00 },
        { name: "tundra"   , rgb: 0xB9D39C, fluveScale: 1.25 },
        { name: "rock"     , rgb: 0xAAA4AA, fluveScale: 1.50 },
        { name: "snow"     , rgb: 0xF8FBFC, fluveScale: 2.00 }
    ];

    this.buildBasin( nCells );

};

BASIN3D.Basin3D.prototype = {

    buildBasin: function( nCells ) {
        this.nCells = nCells;
        this.plane = null;
        this.terrain = [];
        this.basin = null;
        this.planeMesh = null;
        this.scale3D = 5 / nCells;
        this.deltaBase = 0;
        this.limits = {};
        this.streamMat =  new THREE.MeshLambertMaterial({color: 0x79a1d1});
        this.streamNet = new THREE.Group();
        this.cylinderUtil = new GFX.CylinderUtil();

        this3D = this;

        this.basin = new BASIN.Basin(nCells);

        this.basin.construct();

        this.createTerrain();

        this.computeElevations();

        this.getMaxElev();

        this.deltaSC = (this.limits.maxElev + 0.1) / this.surfaceCover.length;

        //this.dumpTerrain();
        //this.dumpCells();

        this.createPlaneGeometry();

        this.createPlaneMesh();

        this.renderStreams();

        this.renderSides();
    },

    deleteBasin: function() {
        gfxScene.remove( this.planeMesh );

        while (this.streamNet.children.length > 0) {
            gfxScene.remove(this.streamNet.children[0]);
            this.streamNet.remove(this.streamNet.children[0]);
        }
    },

    /**
     * This creates the terrain array but sets elevation to -1 to indicate that
     * it is uninitialized.
     */
    createTerrain: function() {

        for ( var i = 0; i < this.nCells * 2 + 1; i++ ) {
            this.terrain[i] = [];
            for ( var j = 0; j < this.nCells * 2 + 1; j++ ) {
                this.terrain[i][j] = new THREE.Vector3(i * this.scale3D, -1, j * this.scale3D);
            }
        }
    },

    /*
     * This creates the mesh comprised of nCells by nCells quad-patches.
     * Elevations are still all -1
     */
    createPlaneGeometry: function () {
        this.plane = new THREE.Geometry();

        for ( var i = 0; i < this.nCells * 2; i += 2 ) {
            for ( var j = 0; j < this.nCells * 2; j += 2 ) {
                this.createQuadPatch(i, j);
            }
        }

        this.plane.computeFaceNormals();
        this.plane.computeVertexNormals();
    },

    /**
     * Walk the existing geometry and compute, for each quad-patch
     * the elevations of the vertices.
     */
    computeElevations: function () {

        this.getDeltaBase();

        for ( var i = 0; i < this.nCells; i++ ) {
            for ( var j = 0; j < this.nCells; j++ ) {
                this.computeCellElevations(i, j);
            }
        }
    },

    getDeltaBase: function() {

        var maxBase = -1;
        for ( var i = 0; i < this.nCells; i++ ) {
            for ( var j = 0; j < this.nCells; j++ ) {
                maxBase = Math.max(this.basin.geos[i][j].chanElev, maxBase );
            }
        }

        this.deltaBase = (maxBase + 0.1) / this.surfaceCover.length;
    },

    /**
     *  Create the actual mesh from the geometry and some fakes material.
     */
    createPlaneMesh: function() {

        var vertexMat = new THREE.MeshLambertMaterial({ vertexColors: THREE.VertexColors });

        this.planeMesh = new THREE.Mesh(this.plane, vertexMat);

        // and add it to the scene
        gfxScene.add(this.planeMesh);
        this.planeMesh.position.set(-this.nCells * this.scale3D, 0, -this.nCells * this.scale3D);
    },

    /**
     * get the max Elev as well as the row limits, elevation of the corners, etc.
     * Mainly avoids having to pass too many parameters all over.
     */
    getMaxElev: function () {

        var maxRow   = this.nCells * 2;
        var maxElev  = -1;
        for ( var i = 0; i < maxRow + 1; i++ ) {
            for ( var j = 0; j < maxRow + 1; j++ ) {
                maxElev = Math.max( this.terrain[i][j].y, maxElev);
            }
        }

        var maxOrder = -1;
        var maxLen   = 0;
        var geos = this.basin.geos;
        for ( i = 0; i < this.nCells; i++ ) {
            for ( j = 0; j < this.nCells; j++ ) {
                maxOrder = Math.max( geos[i][j].order, maxOrder);
                maxLen   = Math.max( geos[i][j].chanLen, maxLen);
            }
        }

        this.limits.maxElev = maxElev;
        this.limits.minOrder = maxOrder - BASIN3D.MIN_ORDER;
        this.limits.maxLen = maxLen;
        this.limits.maxRow  = maxRow;
        this.limits.minZ    = this.terrain[0][0].z;
        this.limits.maxZ    = this.terrain[0][this.limits.maxRow].z;
        this.limits.minX    = this.terrain[0][0].x;
        this.limits.maxX    = this.terrain[this.limits.maxRow][0].x;
        this.limits.maxYX   = this.terrain[this.limits.maxRow][0].y;
        this.limits.maxYZ   = this.terrain[0][this.limits.maxRow].y;
        this.limits.maxYXZ  = this.terrain[this.limits.maxRow][this.limits.maxRow].y ;
        this.limits.nCS     = this.nCells * this.scale3D;
    },

    /**
     * Compute the elevation of the 9 vertices that make up each quad-patch
     */
    computeCellElevations: function ( i, j ) {
        // get the cell for convenience and the terrain indices
        var bounds = this.basin.maze.cells[i * this.basin.maze.row + j];
        var cell = this.basin.geos[i][j];
        var it = i * 2 + 1;
        var jt = j * 2 + 1;
        // first set the center of the cell, which is already computed
        this.terrain[it][jt].y = cell.chanElev;

        // next, check each edge and see if this cell has a stream to the next
        // if so, simply interpolate between the two slopes
        this.computeStreamElev(bounds, cell, i, j);

        // now check the other interpolated points
        this.computeElevBounds(bounds, i, j);
    },

    /**
     * Compute the interpolated elevation of any streams entering or leaving the cell
     */
    computeStreamElev: function ( bounds, cell, i, j )  {
        var it = i * 2 + 1;
        var jt = j * 2 + 1;
        var eI, eJ;

        if ((bounds & MAZE.SOUTH_BIT) === 0) {
            eI = Math.max(i + MAZE.YEdge[MAZE.SOUTH], 0);
            eJ = Math.max(j + MAZE.XEdge[MAZE.SOUTH], 0);
            this.terrain[it - 1][jt].y = (cell.chanElev + this.basin.geos[eI][eJ].chanElev) / 2;
        }

        if ((bounds & MAZE.WEST_BIT) === 0) {
            eI = Math.max(i + MAZE.YEdge[MAZE.WEST], 0);
            eJ = Math.max(j + MAZE.XEdge[MAZE.WEST], 0);
            this.terrain[it][jt - 1].y = (cell.chanElev + this.basin.geos[eI][eJ].chanElev) / 2;
        }

        if ((bounds & MAZE.NORTH_BIT) === 0) {
            eI = Math.max(i + MAZE.YEdge[MAZE.NORTH], 0);
            eJ = Math.max(j + MAZE.XEdge[MAZE.NORTH], 0);
            this.terrain[it + 1][jt].y = (cell.chanElev + this.basin.geos[eI][eJ].chanElev) / 2;
        }

        if ((bounds & MAZE.EAST_BIT) === 0) {
            eI = Math.max(i + MAZE.YEdge[MAZE.EAST], 0);
            eJ = Math.max(j + MAZE.XEdge[MAZE.EAST], 0);
            this.terrain[it][jt + 1].y = (cell.chanElev + this.basin.geos[eI][eJ].chanElev) / 2;
        }
    },

    /**
     * Check the 8 points of the compass and add any streams found.
     *
     */
    addChannelSlopes: function ( n, i, j ) {

        var rowLim = this.basin.maze.row - 1;
        var colLim = this.basin.maze.col - 1;
        var geos   = this.basin.geos;
        var slopes = [];

        switch (n) {
            case 0:     // south
                if (i !== 0) {
                    slopes.push(this.basin.geos[i - 1][j].chanSlope);
                }
                break;
            case 1:     // southwest
                if (i !== 0 && j !== 0) {
                    slopes.push(geos[i - 1][j - 1].chanSlope);
                }
                if (j !== 0) {
                    slopes.push(geos[i][j - 1].chanSlope);
                }
                if (i !== 0) {
                    slopes.push(geos[i - 1][j].chanSlope);
                }
                break;
            case 2:     // west
                if (j !== 0) {
                    slopes.push(geos[i][j - 1].chanSlope);
                }
                break;
            case 3:     // northwest
                if (i !== 0) {
                    slopes.push(geos[i - 1][j].chanSlope);
                }
                if (i !== rowLim && j !== 0) {
                    slopes.push(geos[i + 1][j - 1].chanSlope);
                }
                if (i !== rowLim) {
                    slopes.push(geos[i + 1][j].chanSlope);
                }
                break;
            case 4:     // north
                if (i !== rowLim) {
                    slopes.push(geos[i + 1][j].chanSlope);
                }
                break;
            case 5:     // northeast
                if (i !== rowLim) {
                    slopes.push(geos[i + 1][j].chanSlope);
                }
                if (j !== colLim) {
                    slopes.push(geos[i][j + 1].chanSlope);
                }
                if (i !== rowLim && j !== colLim) {
                    slopes.push(geos[i + 1][j + 1].chanSlope);
                }
                break;
            case 6:     // east
                if (j !== colLim) {
                    slopes.push(geos[i][j + 1].chanSlope);
                }
                break;
            case 7:     // southeast
                if (i !== rowLim) {
                    slopes.push(geos[i + 1][j].chanSlope);
                }
                if (j !== colLim) {
                    slopes.push(geos[i][j + 1].chanSlope);
                }
                if (i !== 0 && j !== colLim) {
                    slopes.push(geos[i - 1][j + 1].chanSlope);
                }
                break;
        }

        slopes.push(geos[i][j].chanSlope);

        return slopes;
    },

    /**
     * See if the current direction from the cell already has a stream.
     */
    checkStreamBounds: function ( n, bounds ) {
        return ((bounds & MAZE.SOUTH_BIT) === 0 && n === 0 ) ||
               ((bounds & MAZE.WEST_BIT) === 0 && n === 2 ) ||
               ((bounds & MAZE.NORTH_BIT) === 0 && n === 4 ) ||
               ((bounds & MAZE.EAST_BIT) === 0 && n === 6 );
    },

    /**
     *  Compute the interpolated elevation of each of the 8 points around the periphery of
     *  the cell.  Some, e.g. if there is a stream entering or exiting, will already be computed
     *  so they won't be -1 and can be skipped
     */
    computeElevBounds: function ( bounds, i, j ) {
        var offset =
            [
                {i: -1, j:  0},   // south
                {i: -1, j: -1},
                {i:  0, j: -1},   // west
                {i:  1, j: -1},
                {i:  1, j:  0},   // north
                {i:  1, j:  1},
                {i:  0, j:  1},   // east
                {i: -1, j:  1}
            ];

        var it, jt;
        var tRowLim = this.terrain.length;
        var tColLim = this.terrain[0].length;
        var base = this.basin.geos[i][j].chanElev;

        for (var n = 0; n < 8; n++) {
            it = i * 2 + offset[n].i + 1;
            jt = j * 2 + offset[n].j + 1;

            // if the current point is a stream, then obviously it's not an interfluve
            var bStream = this.checkStreamBounds( n, bounds );

            if (it >= 0 && it < tRowLim && jt >= 0 && jt < tColLim && !bStream) {

                var slopes = this.addChannelSlopes( n, i, j );

                this.terrain[it][jt].y = Math.max(this.terrain[it][jt].y, this.interfluveHeight(slopes, base));

            }
        }
    },

    /**
     * Simple function to calc the height of the interfluve from surrounding
     * calculated stream heights.
     */
    interfluveHeight: function ( slopes, base  ) {
        var h = 0;

        //while (slopes.length > 0) {
        //    h = Math.max(h, slopes.pop());
        //}

        //while (slopes.length > 0) {
        //    h = Math.min(h, slopes.pop());
        //}

        var n = slopes.length;
        while (slopes.length > 0) {
            h += slopes.pop();
        }

        var index = Math.floor(base / this.deltaBase);

        return h / n * this.surfaceCover[index].fluveScale * (0.75 + (Math.random()/2))  + base;
    },

    /**
     * Compute the index into the surface cover array to get the rgb value
     */
    getSurfColor: function (  i, j ) {

        var terrainHt = this.terrain[i][j].y;
        var index = Math.floor(terrainHt / this.deltaSC);

        return new THREE.Color( this.surfaceCover[index].rgb );
    },

    /**
     * This creates the new vertices and associated faces.
     * @param i
     * @param j
     * @param offV
     * @param indexF
     */
    computeQuadFaces: function ( i, j, offV, indexF ) {

        var vC = this.plane.vertices.length;
        var face;

        for ( var n=0; n<4; n++ )
            this.plane.vertices.push(this.terrain[i + offV[n].i][j + offV[n].j]);

        face = new THREE.Face3(vC + indexF[0].a, vC + indexF[0].b, vC + indexF[0].c);
        var ia = i + offV[indexF[0].a].i;
        var ja = j + offV[indexF[0].a].j;
        face.vertexColors[0] = this.getSurfColor(ia,ja);
        var ib = i + offV[indexF[0].b].i;
        var jb = j + offV[indexF[0].b].j;
        face.vertexColors[1] = this.getSurfColor(ib, jb);
        var ic = i + offV[indexF[0].c].i;
        var jc = j + offV[indexF[0].c].j;
        face.vertexColors[2] = this.getSurfColor(ic, jc);
        this.plane.faces.push(face);

        face = new THREE.Face3(vC + indexF[1].a, vC + indexF[1].b, vC + indexF[1].c);
        ia = i + offV[indexF[1].a].i;
        ja = j + offV[indexF[1].a].j;
        face.vertexColors[0] = this.getSurfColor(ia, ja);
        ib = i + offV[indexF[1].b].i;
        jb = j + offV[indexF[1].b].j;
        face.vertexColors[1] = this.getSurfColor(ib, jb);
        ic = i + offV[indexF[1].c].i;
        jc = j + offV[indexF[1].c].j;
        face.vertexColors[2] = this.getSurfColor(ic, jc);
        this.plane.faces.push(face);
    },

    /**
     *  Create the 8 triangles that comprise each quad-patch
     */
    createQuadPatch: function ( i, j ) {

        // first pair of triangles
        var offV1 = [
            { i:0, j:0 },
            { i:0, j:1 },
            { i:1, j:1 },
            { i:1, j:0 }
        ];

        var indexF1 = [
            { a:0, b:1, c:2 },
            { a:0, b:2, c:3 }
        ];

        this.computeQuadFaces( i, j, offV1, indexF1);

        // second pair of triangles
        var offV2 = [
            { i:0, j:1 },
            { i:0, j:2 },
            { i:1, j:2 },
            { i:1, j:1 }
        ];

        var indexF2 = [
            { a:0, b:1, c:3 },
            { a:1, b:2, c:3 }
        ];

        this.computeQuadFaces( i, j, offV2, indexF2);

        // third pair of triangles
        var offV3 = [
            { i:1, j:1 },
            { i:1, j:2 },
            { i:2, j:2 },
            { i:2, j:1 }
        ];

        var indexF3 = [
            { a:0, b:1, c:2 },
            { a:0, b:2, c:3 }
        ];

        this.computeQuadFaces( i, j, offV3, indexF3);

        // fourth pair of triangles
        var offV4 = [
            { i:1, j:0 },
            { i:1, j:1 },
            { i:2, j:1 },
            { i:2, j:0 }
        ];

        var indexF4 = [
            { a:0, b:1, c:3 },
            { a:1, b:2, c:3 }
        ];

        this.computeQuadFaces( i, j, offV4, indexF4);

    },

    /**
     *
     */
    createSouthSide: function ( material ) {

        var shapeS = new THREE.Shape();
        var lim = this.limits;

        shapeS.moveTo(lim.minZ - lim.nCS, 0);
        shapeS.lineTo(lim.maxZ - lim.nCS, 0);
        shapeS.lineTo(lim.maxZ - lim.nCS, lim.maxYZ);

        for ( var i=lim.maxRow; i>=0; i-- ) {
            var x = this.terrain[0][i].z;
            var y = this.terrain[0][i].y;
            shapeS.lineTo(x - lim.nCS, y);
        }

        var shapeSMesh = new THREE.Mesh(new THREE.ShapeGeometry(shapeS), material);
        gfxScene.add(shapeSMesh);
        shapeSMesh.rotateY( -Math.PI / 2 );
        shapeSMesh.position.set(-lim.nCS, 0, 0);
    },

    createWestSide: function ( material ) {
        var shapeW = new THREE.Shape();
        var lim = this.limits;

        shapeW.moveTo(lim.minX - lim.nCS, 0);
        shapeW.lineTo(lim.maxX - lim.nCS, 0);
        shapeW.lineTo(lim.maxX - lim.nCS, lim.maxYX);

        for ( var i=lim.maxRow; i>=0; i-- ) {
            var x = this.terrain[i][0].x;
            var y = this.terrain[i][0].y;
            shapeW.lineTo(x - lim.nCS, y);
        }

        var shapeWMesh = new THREE.Mesh(new THREE.ShapeGeometry(shapeW), material);
        gfxScene.add(shapeWMesh);
        shapeWMesh.position.set(0, 0, -lim.nCS);
    },

    createNorthSide: function ( material ) {
        var shapeN = new THREE.Shape();
        var lim = this.limits;

        shapeN.moveTo(lim.minZ - lim.nCS, 0);
        shapeN.lineTo(lim.maxZ - lim.nCS, 0);
        shapeN.lineTo(lim.maxZ - lim.nCS, lim.maxYXZ);

        for ( var i=lim.maxRow; i>=0; i-- ) {
            var x = this.terrain[lim.maxRow][i].z;
            var y = this.terrain[lim.maxRow][i].y;
            shapeN.lineTo(x - lim.nCS, y);
        }

        var shapeNMesh = new THREE.Mesh(new THREE.ShapeGeometry(shapeN), material);
        gfxScene.add(shapeNMesh);
        shapeNMesh.rotateY( -Math.PI / 2 );
        shapeNMesh.position.set(lim.nCS, 0, 0);
    },

    createEastSide: function ( material ) {
        var shapeE = new THREE.Shape();
        var lim = this.limits;

        shapeE.moveTo(lim.minX - lim.nCS, 0);
        shapeE.lineTo(lim.maxX - lim.nCS, 0);
        shapeE.lineTo(lim.maxX - lim.nCS, lim.maxYXZ);

        for ( var i=lim.maxRow; i>=0; i-- ) {
            var x = this.terrain[i][lim.maxRow].x;
            var y = this.terrain[i][lim.maxRow].y;
            shapeE.lineTo(x - lim.nCS, y);
        }

        var shapeEMesh = new THREE.Mesh(new THREE.ShapeGeometry(shapeE), material);
        gfxScene.add(shapeEMesh);
        shapeEMesh.position.set( 0, 0, lim.nCS );
    },

    createBottom: function ( material ) {
        var shapeB = new THREE.Shape();
        var lim = this.limits;

        shapeB.moveTo(lim.minX - lim.nCS, lim.minZ - lim.nCS);
        shapeB.lineTo(lim.maxX - lim.nCS, lim.minZ - lim.nCS);
        shapeB.lineTo(lim.maxX - lim.nCS, lim.maxZ - lim.nCS);
        shapeB.lineTo(lim.minX - lim.nCS, lim.maxZ - lim.nCS);
        shapeB.lineTo(lim.minX - lim.nCS, lim.minZ - lim.nCS);

        var shapeBMesh = new THREE.Mesh(new THREE.ShapeGeometry(shapeB), material);
        gfxScene.add(shapeBMesh);
        shapeBMesh.rotateX( -Math.PI / 2 );
    },

    /**
     * Render the "non-visible" sides of the basin
     */
    renderSides: function() {

        var material = new THREE.MeshBasicMaterial({color: 0x333333, side:THREE.DoubleSide});

        this.createSouthSide( material );
        this.createWestSide( material );
        this.createNorthSide( material );
        this.createEastSide( material );
        this.createBottom( material );
    },

    /**
     * Use the basin's rat to retrace the stream net and render all the streams
     */
    renderStreams: function () {
        this.basin.rat.initSolveObj(0x80, false, this.renderStream);

        this.basin.rat.findSolution(-1, -1);

        this.streamNet.position.set( -this.nCells * this.scale3D, 0, -this.nCells * this.scale3D);
        gfxScene.add(this.streamNet);
    },

    /**
     * Render each stream section as we are called
     */
    renderStream: function (label, rat, i, j, nexi, nexj, pathlen, bsac) {

        var streamWidth = [0, 0.01, 0.015, 0.02];
        var cell = this3D.basin.geos[i][j];
        var curPt = this3D.terrain[i * 2 + 1][j * 2 + 1];
        var nexPt;

        // have to handle the final cell specially as there is no "next" cell
        if ( nexi >= 0 && nexj >= 0 )
            nexPt = this3D.terrain[nexi * 2 + 1][nexj * 2 + 1];
        else
            nexPt = new THREE.Vector3(curPt.x, curPt.y, -curPt.z);

        var order = cell.order - this3D.limits.minOrder;
        if (order > 0 ) {

            var stream = this3D.cylinderUtil.createCylinder(
                curPt,
                nexPt,
                streamWidth[order],
                8,
                this3D.streamMat);

            this3D.streamNet.add(stream);
        }
    },

    /*
    dumpTerrain: function () {

        for (var i = 0; i < this.nCells * 2 + 1; i++) {

            console.log(i.toFixed(0) + " : " + this.terrain[i][0].y.toFixed(3) + " " + this.terrain[i][1].y.toFixed(3) + " " +
                this.terrain[i][2].y.toFixed(3) + " " + this.terrain[i][3].y.toFixed(3) + " " + this.terrain[i][4].y.toFixed(3) + " " +
                this.terrain[i][5].y.toFixed(3) + " " + this.terrain[i][6].y.toFixed(3) + " " + this.terrain[i][7].y.toFixed(3) + " " +
                this.terrain[i][8].y.toFixed(3));
        }

    },

    dumpCells: function () {

        for (var i = 0; i < this.nCells; i++) {
            for (var j = 0; j < this.nCells; j++) {
                var cell = this.basin.geos[i][j];
                console.log("i,j: " + i.toFixed(0) + "," + j.toFixed(0) + " area: " + cell.area.toFixed(0) + " order: " + cell.order.toFixed(0) +
                    " chanLen: " + cell.chanLen.toFixed(3) + " chanElev: " +
                    cell.chanElev.toFixed(3) + " chanSlope: " + cell.chanSlope.toFixed(3) + " exit: " + cell.exit.toFixed(0));
            }
        }
    }
    */
};