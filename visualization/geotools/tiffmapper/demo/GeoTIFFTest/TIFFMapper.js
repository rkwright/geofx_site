/**
 *  Various functions to map a TIFF file from the source reader.
 *
 *  @author rkwright, August 2017
 *
 */

/**
 * Constructor for the TIFFMapper "class"
 *
 * @param scene
 * @param reader
 * @constructor
 */
TIFFX.TIFFMapper = function ( scene, reader ) {

    this.scene  = scene;
    this.reader = reader;
    this.globeGeom = undefined;
    this.globeMat  = undefined;
    this.globeWire = undefined;
    this.globeMesh = undefined;

    this.createGlobe();
};

TIFFX.TIFFMapper.prototype = {

    createGlobe: function () {

        var image = this.reader.image;
        var height = image.getHeight();
        var width = image.getWidth();

        this.globeGeom = new THREE.Geometry();

        this.createVertices( image, height, width );
        console.log("Created vertices");

        this.createFaces( height, width );
        console.log("Created faces");

        this.createMaterial();
        console.log("Created material");

        this.globeMesh = new THREE.Mesh( this.globeGeom, this.globeMat );

        this.scene.add( this.globeMesh );
        console.log("Created mesh");
    },

    /**
     * Create all the vertices by reading the TIFF row by by row, transforming to
     * Cartesian (xyz) coords and then creating the Vertex3 and pushing it to the geom
     *
     * @param image
     * @param height
     * @param width
     */
    createVertices: function( image, height, width ) {

        var EARTH_DIAMETER = 12796.0;  // km
        var deltaLat = 180.0 / (height-1) * Math.PI / 180.0;
        var deltaLon = 360.0 / (width-1) * Math.PI / 180.0;
        var x,y,z;
        var rasterData;
        var SCALE_FACTOR = 2;
        var EXAGGERATION = 100;
        var max=0, min=0;
        var k = 0;

        var lat = 90 * Math.PI / 180.0;
        var vec;
        for (var i=0; i < height; i++ ) {
            var rasterWindow = [0, i, width - 0, i+1];    // left, top, right, bottom
            rasterData = image.readRasters({window: rasterWindow});

            var lon = 0;
            for ( var j=0; j<rasterData[0].length; j++ ) {

                // instead of using the last *real* value, use the first again so it meshes
                if ( j === 0 )
                    k = rasterData[0].length-1;
                else
                    k = j;

                var radius = SCALE_FACTOR *
                    (rasterData[0][k] / 1000.0 * EXAGGERATION + EARTH_DIAMETER) / EARTH_DIAMETER;

                // this trasform from https://stackoverflow.com/questions/28365948/javascript-\
                // latitude-longitude-to-xyz-position-on-earth-threejs
                var phi   = Math.PI/2 - lat;
                var theta = Math.PI + lon;

                x = -(radius * Math.sin(phi) * Math.cos(theta));
                z = (radius * Math.sin(phi) * Math.sin(theta));
                y = (radius * Math.cos(phi));

                this.globeGeom.vertices.push(new THREE.Vector3(x, y, z));

                max = Math.max(max, rasterData[0][j]);
                min = Math.min(min, rasterData[0][j]);

                lon += deltaLon;
            }

            lat -= deltaLat;
        }

        //console.log("max: " + max.toFixed(1) + "  min: " + min.toFixed(1));
    },

    /**
     * Create all the faces of the globe by striding through the vertices.
     *
     * @param height
     * @param width
     */
    createFaces: function ( height, width ) {

        for (var i = 0; i < height - 1; i++ ) {
            var i0 = width * i;
            var i1 = width * (i + 1);

            // note that they y-coord (i.e. the 'v' of uv) must start at 1 and descend
            var i0v = 1 - i / height;
            var i1v = 1 - (i+1) / height;

            for (var j = 0; j < width - 1; j++) {
                var v0 = i0 + j;
                var v1 = i0 + j+1;
                var v2 = i1 + j+1;
                var v3 = i1 + j;

                // note that the faces MUST be in CCW winding order!
                this.globeGeom.faces.push(new THREE.Face3(v0, v2, v1));
                this.globeGeom.faces.push(new THREE.Face3(v0, v3, v2));

                var j0u = j /width;
                var j1u = (j+1) / width;

                var v0uv = new THREE.Vector2( j0u, i0v );
                var v1uv = new THREE.Vector2( j1u, i0v );
                var v2uv = new THREE.Vector2( j1u, i1v );
                var v3uv = new THREE.Vector2( j0u, i1v );

                this.globeGeom.faceVertexUvs[0].push([v0uv, v2uv, v1uv]);
                this.globeGeom.faceVertexUvs[0].push([v0uv, v3uv, v2uv]);
            }
        }

        this.globeGeom.computeFaceNormals();
        this.globeGeom.computeVertexNormals();

    },

    /**
     * Load the specified image and set it as the texture for the current map
     */
    createMaterial: function () {

        var textureLoader = new THREE.TextureLoader();
        this.globeMat = new THREE.MeshPhongMaterial({color: '#ffffff'});
        var pThis = this;
        textureLoader.load("../data/8081-earthmap8k.jpg", function (texture) {
            pThis.globeMat.map = texture;
            pThis.globeMat.needsUpdate = true;
        });
    }
};