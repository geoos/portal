class GeoJsonVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
        this.geoJSON = null;
        this.markers = null;
    }
    setGeoJson(geoJSON, markers) {
        this.geoJSON = geoJSON;
        this.markers = markers;
        this.update();
    }
    update() {
        this.konvaLayer.destroyChildren();
        if (this.geoJSON) {
            this.geoJSON.features.forEach(f => {
                this.addGeoElements(f, f.geometry).forEach(e => this.konvaLayer.add(e))
            });
        }
        if (this.markers) {
            this.markers.forEach(m => {
                let opts;
                if (this.options.markerStyle) {
                    if (typeof this.options.markerStyle == "function") {
                        opts = this.options.markerStyle(m);
                    } else {
                        opts = this.options.markerStyle;
                    }
                }
                //opts = opts || {fontSize: 14, fontFamily: 'Calibri', fontStyle:"bold", fill: 'black', stroke:"white", strokeWidth:2}
                //opts = opts || {fontSize: 17, fontFamily: 'Calibri', fontStyle:"bold", fill:"black", stroke:"white", strokeWidth:1.2}
                opts = opts || {fontSize: 17, fontFamily: 'sans-serif', fontStyle:"bold", fill:"black", stroke:"white", strokeWidth:1.0}
                let txt;
                if (this.options.markerLabel) {
                    if (typeof this.options.markerLabel == "function") {
                        txt = this.options.markerLabel(m);
                    } else {
                        txt = this.options.markerLabel;
                    }
                }
                txt = txt || "No label";
                let p = this.toCanvas({lat:m.lat, lng:m.lng});
                opts.text = txt;
                opts.x = p.x; opts.y = p.y;
                let lbl = new Konva.Text(opts);
                lbl.offsetX(lbl.width() / 2);
                lbl.offsetY(lbl.height() / 2);
                this.konvaLayer.add(lbl);
            })
        }
        this.konvaLayer.draw()
        super.update();
    }

    addGeoElements(f, geometry) {
        if (geometry.type == "Polygon" || geometry.type == "MultiPolygon") {
            return this.getPolygons(f, geometry);
        } else if (geometry.type == "LineString" || geometry.type == "MultiLineString") {
            return this.getLines(f, geometry);
        } else if (geometry.type == "GeometryCollection") {
            let elements = []
            geometry.geometries.forEach((g, i) => {
                // TODO: improve performance
                let clone = JSON.parse(JSON.stringify(f));
                clone.properties.id = clone.properties.id + "-" + (i+1);
                clone.geometry = g;
                elements = elements.contact(this.addGeoElements(clone, g));
            });
            return elements;
        } else if (geometry.type == "Point") {
            return this.getPoint(f, geometry);
        } else {
            console.warn("Tipo de geometría '" + geometry.type + "' no soportado aún", f)
        }
    }

    addPolygonCoordinates(coordinates, polygons) {
        if (!coordinates.length) {
            console.error("Empty Array in Polygon coordinates");
            return;
        }
        if (!Array.isArray(coordinates[0])) {
            console.error("First element of Polygon Coordinates is not an Array");
            return;
        }
        // Is polygon if elements are arrays of two elements each one
        let isPolygon = (coordinates[0].length == 2 && !isNaN(coordinates[0][0]))
        if (isPolygon) {
            if (coordinates.length >= 4) {
                let pol = [];
                coordinates.forEach(c => {
                    let lat = c[1], lng = c[0];
                    pol.push({lat:lat, lng:lng})
                });
                polygons.push(pol);
            } else {
                console.warn("Polygon discarded. Less than four coordinates");
            }
        } else {
            coordinates.forEach(c => this.addPolygonCoordinates(c, polygons));
        }
    }
    getPolygons(f, geometry) {
        let polygons = [];
        this.addPolygonCoordinates(geometry.coordinates, polygons);
        this.elements = [];
        for (let i=0; i<polygons.length; i++) {
            let pol = polygons[i];
            let points = pol.reduce((list, mapPoint) => {
                let p = this.toCanvas({lat:mapPoint.lat, lng:mapPoint.lng});
                list.push(p.x, p.y);
                return list;
            },[]);

            let opts;
            if (this.options.polygonStyle) {
                if (typeof this.options.polygonStyle == "function") {
                    opts = this.options.polygonStyle(f, geometry);
                } else {
                    opts = this.options.polygonStyle;
                }
            }
            opts = opts || {stroke:"black", strokeWidth:1}
            opts.closed = true;
            opts.points = points;

            let poly = new Konva.Line(opts);
            this.elements.push(poly)
        }
        return this.elements;
    }

    addLineCoordinates(coordinates, lines) {
        if (!coordinates.length) {
            //console.error("Empty coordinates array");
            return;
        }
        if (!Array.isArray(coordinates[0])) {
            console.error("Coordinates first element is not an array");
            return;
        }
        // is line if elements are arrays of size 2
        let isLine = (coordinates[0].length == 2 && !isNaN(coordinates[0][0]))
        if (isLine) {
            if (coordinates.length >= 2) {
                let line = [];
                coordinates.forEach(c => {
                    let lat = c[1], lng = c[0];
                    line.push({lat:lat, lng:lng})
                });
                lines.push(line);
            } else {
                console.warn("Line discarded: Less than 2 coordinates");
            }
        } else {
            coordinates.forEach(c => this.addLineCoordinates(c, lines));
        }
    }
    getLines(f, geometry) {
        let lines = [];
        this.addLineCoordinates(geometry.coordinates, lines);
        this.elements = [];
        for (let i=0; i<lines.length; i++) {
            let line = lines[i];            
            let points = line.reduce((list, mapPoint) => {
                let p = this.toCanvas({lat:mapPoint.lat, lng:mapPoint.lng});
                list.push(p.x, p.y);
                return list;
            },[]);

            let opts;
            if (this.options.lineStyle) {
                if (typeof this.options.lineStyle == "function") {
                    opts = this.options.lineStyle(f, geometry);
                } else {
                    opts = this.options.lineStyle;
                }
            }
            opts = opts || {stroke:"black", strokeWidth:1}
            opts.closed = false;
            opts.points = points;
            
            this.elements.push(new Konva.Line(opts));
        }
        return this.elements;
    }
    getPoint(f, geometry) {
        let opts;
        if (this.options.pointStyle) {
            if (typeof this.options.pointStyle == "function") {
                opts = this.options.pointStyle(f, geometry);
            } else {
                opts = this.options.pointStyle;
            }
        }
        opts = opts || {radius:9, fill:"red", stroke:"black", strokeWidth:1}
        let p = this.toCanvas({lat:geometry.coordinates[1], lng:geometry.coordinates[0]});
        optx.x = p.x; opts.y = p.y;
        return [new Konva.Circle(opts)]
    }
}