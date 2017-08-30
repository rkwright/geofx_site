/**
 *  Various functions to read a TIFF file, dump the header to an HTML table, etc.
 *
 *  @author rkwright, August 2017
 *
 */

var TIFFX = { revision: '01' };

/**
 * Constructor for the TIFFReader "class"
 *
 * @param fileName
 * @param tiffReady
 * @constructor
 */
TIFFX.TIFFReader = function ( fileName, tiffReady ) {

    this.fileName = fileName;
    this.tiffReady = tiffReady;
    this.tiff = undefined;
    this.ifd = undefined;
    this.imageCount = 0;
    this.image = undefined;
    this.geoKeys = undefined;

    trThis = this;

    this.openTIFF( fileName, this.readTIFF );
};


TIFFX.TIFFReader.prototype = {

    openTIFF: function ( fileName, callback ) {

        var xhr = new XMLHttpRequest();
        xhr.open('GET', fileName , true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function(e) {
            var tiff = GeoTIFF.parse(this.response);

            trThis.tiff = tiff;

            callback( tiff );
        };

        xhr.send();
    },

    /**
     * Read various aspects of the TIFF file
     * @param tiff
     */
    readTIFF: function ( tiff ) {

        trThis.tiff = tiff;

        trThis.imageCount = tiff.getImageCount();

        trThis.image = tiff.getImage();

        trThis.ifd = trThis.image.getFileDirectory();

        trThis.geoKeys = trThis.image.getGeoKeys();

        // tell the caller the TIFF is now loaded
        trThis.tiffReady();
    },

    readRasterData: function ( image ) {
        var width  = image.getWidth();
        var height = image.getHeight();
        var rasterData;

        for ( var i=0; i<height; i++ ) {
            var rasterWindow = [0, i, width-1, i+1]; // left, top, right, bottom
            rasterData = image.readRasters({ window: rasterWindow });
            //console.log("i: " + i.toFixed(0) + " len: " + rasterData[0].length);
        }
    },

    dumpIFD: function ( div ) {

        var geoTable = "<table>\n";
        geoTable    += "<tr>\n";
        geoTable    += "<th style='text-align:right;'>Name</th>\n";
        geoTable    += "<th style='text-align:left;'>Value</th>\n";
        geoTable    += "</tr>\n";

        for (var propertyName in this.ifd) {
            if (this.ifd.hasOwnProperty(propertyName)) {

                var value = this.ifd[propertyName];
                //console.log("prop: " + propertyName + " value: " + value);

                if (propertyName.indexOf("GDAL_METADATA") !== -1) {
                    geoTable += this.newRow( propertyName, "", "#EEEEEE" );
                    geoTable += this.parseGDAL( value );
                }
                else
                    geoTable += this.newRow(propertyName, value, "white");
            }
        }

        geoTable += "</table>";

        console.log(geoTable);
        div.innerHTML = geoTable;

        // weird hack.  See https://stackoverflow.com/questions/27503696/\
        // when-creating-a-table-inside-a-div-text-undefined-shows-up-for-no-reason
        div.childNodes[0].nodeValue = null;
    },

    parseGDAL: function( gdal, geoTable ) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(gdal,"text/xml");
        var nodes = xmlDoc.documentElement.childNodes;
        var value, name;
        var rows;
        var i = 0;

        if (nodes[0].nodeName === "parsererror")
            i++;

        while ( i < nodes.length ) {
            var n = nodes[i];
            if (n.nodeType === Node.ELEMENT_NODE) {
                name  = n.getAttribute("name");
                value = n.childNodes[0].nodeValue;
                rows += this.newRow( name, value, "#EEEEEE");
            }

            i++;
        }

        return rows;
    },

    newRow: function ( name, value, bgColor ) {

        var row = "<tr>\n";
        row += "<td style='text-align:right; background-color: " + bgColor + ";  '>" + name + "</td>\n";
        row += "<td style='text-align:left; background-color: " + bgColor + "; '>" + value + "</td>\n";
        row += "</tr>\n";

        return row;
    }
};