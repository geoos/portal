class VectorTilesVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
        this.extent = 4096;
        this.tiles = {};
        this.lastZoom = -1;
    }

    get interactions() {return this.options.interactions}
    get useTiles() {return this.options.useTiles}
    
    abort() {
        for (let key in this.tiles) {
            let t = this.tiles[key];
            if (t.status == "pending") {
                if (t.aborter) t.aborter.abort();
                t.status = "deleted";
            }
        }
        if (this.currentAborter) {
            this.currentAborter.abort();
            this.currentAborter = null;
        }
        this.tiles = {};        
    }
    destroy() {
        this.abort();
        this.tiles = null;
        if (this.interactions) {
            this.interactions.clearShapes(this.uniqueId);
            this.interactions.redraw();
        }
        super.destroy();
    }

    loadTile(z, x, y, x0, y0, tileWidth, tileHeight) {
        let t = this.tiles[x + "-" + y];
        if (!t || t.status == "deleted") {
            if (this.options.getTile) {
                let {promise, aborter} = this.options.getTile(this.lastZoom, x, y);
                if (!promise) {
                    return {status:"empty", z, x, y, x0, y0, tileWidth, tileHeight}
                }
                t = {aborter, status:"pending", z, x, y, x0, y0, tileWidth, tileHeight}
                promise.then(ret => {
                    t.features = ret;
                    delete t.aborter;
                    t.status = "ready"
                    if (t.z == this.lastZoom) {
                        this.addFeatures(t);
                        this.checkLastTile()
                    }
                }).catch(err => {
                    if (err != "aborted") {
                        console.trace(err);
                        console.error(err);
                    }
                })
            } else {
                t = {status:"empty"}
            }
            this.tiles[x + "-" + y] = t;
        } 
        return t;
    }

    checkLastTile() {
        let nPendings = Object.keys(this.tiles).reduce((n, tileKey) => (this.tiles[tileKey].status == "pending"?n + 1:n), 0)
        if (!nPendings) {
            this.konvaLayer.draw();
            if (this.interactions) this.interactions.redraw();
        }
    } 

    loadGeoJson() {
        this.currentAborter = null;
        this.geojson = null;
        let {promise, aborter} = this.options.getGeoJson();
        promise.then(geojson => {
            this.geoJson = geojson;
            this.currentAborter = null;
            this.addGeoJsonFeatures();
        })
    }

    reset() {
        this.abort();
        this.update();
    }
    update() {
        super.update()
        this.konvaLayer.destroyChildren();
        if (this.interactions) this.interactions.clearShapes(this.uniqueId);
        if (this.useTiles) {
            let zoom = this.map.getZoom();
            if (this.lastZoom != zoom) this.abort();
            this.lastZoom = zoom;

            let worldBounds = this.map.getPixelWorldBounds();        
            let mapBounds = this.map.getPixelBounds();
            this.originInWorld = {x:mapBounds.min.x, y:mapBounds.min.y}
            let nTiles = Math.pow(2, zoom);
            let tileWidth =  worldBounds.max.x / nTiles,
                tileHeight = worldBounds.max.y / nTiles;
            let x0 = Math.floor(mapBounds.min.x / tileWidth),
                x1 = Math.floor(mapBounds.max.x / tileWidth);
            x0 = Math.max(0, x0); x0 = Math.min(nTiles - 1, x0);
            x1 = Math.max(0, x1); x1 = Math.min(nTiles - 1, x1);
            let y0 = Math.floor(mapBounds.min.y / tileHeight),
                y1 = Math.floor(mapBounds.max.y / tileHeight);
            y0 = Math.max(0, y0); y0 = Math.min(nTiles - 1, y0);
            y1 = Math.max(0, y1); y1 = Math.min(nTiles - 1, y1);

            for (let y=y0; y <= y1; y++) {
                for (let x=x0; x <= x1; x++) {
                    let xOrigin = tileWidth * x;
                    let yOrigin = tileHeight * y;

                    let t = this.loadTile(zoom, x, y, xOrigin, yOrigin, tileWidth, tileHeight);
                    if (t.status == "ready") {
                        this.addFeatures(t);
                    }
                }
            }
        } else {
            this.loadGeoJson();
        }
        if (this.contextLegend) this.drawContextLegend();
        if (this.options.getExtraElements) {
            let elements = this.options.getExtraElements();
            if (elements) elements.forEach(e => this.konvaLayer.add(e));
        }
        this.konvaLayer.draw();
        if (this.interactions) this.interactions.redraw();
    }

    toX(x) {return x - this.originInWorld.x}
    toY(y) {return y - this.originInWorld.y}

    setContextLegend(lat, lng, label) {
        this.contextLegend = {lat, lng, label}
    }
    unsetContextLegend() {
        this.contextLegend = null;
    }

    addFeatures(tile) {
        let group = new Konva.Group({
            clip:{x:this.toX(tile.x0), y:this.toY(tile.y0), width:tile.tileWidth, height:tile.tileHeight}
        })
        let empty = true;
        tile.features.forEach(feature => {
            const type = feature.type, types = ["", "point", "line", "polygon"];
            const defaultStyles = [{}, {
                fill:"red", stroke:"black", strokeWidth:1, radius: 9
            }, {
                stroke:"red", strokeWidth:2
            }, {
                stroke:"red", strokeWidth:2
            }]
            const defaultSelectedStyles = [{}, {
                fill:"blue", stroke:"red", strokeWidth:1.2, radius: 9
            }, {
                stroke:"red", strokeWidth:3
            }, {
                stroke:"red", strokeWidth:3
            }]
            let style = defaultStyles[type];
            if (this.options.getFeatureStyle) {
                style = this.options.getFeatureStyle(feature) || style;
            }
            let selectedStyle = defaultSelectedStyles[type];
            if (this.options.getSelectedFeatureStyle) {
                selectedStyle = this.options.getSelectedFeatureStyle(feature) || selectedStyle;
            }
            style.listening = false;
            feature.geometry.forEach(geom => {
                let object = null;
                if (type == 1) {
                    let p = geom;
                    style.x = this.toX(tile.x0 + p[0] * tile.tileWidth / this.extent);
                    style.y = this.toY(tile.y0 + p[1] * tile.tileHeight / this.extent);
                    let circle = new Konva.Circle(style)                    
                    group.add(circle);
                    empty = false;
                    object = circle;
                } else {                    
                    let points = geom.reduce((list, p) => {
                        let x = this.toX(tile.x0 + p[0] * tile.tileWidth / this.extent);
                        let y = this.toY(tile.y0 + p[1] * tile.tileHeight / this.extent);
                        list.push(x, y);
                        return list;
                    }, [])
                    style.points = points;
                    style.closed = (type == 3);
                    if (points.length) {
                        let polyOrLine = new Konva.Line(style)
                        group.add(polyOrLine);
                        empty = false;
                        object = polyOrLine;
                    }
                }
                if (this.interactions) {
                    let interObject = object.clone();
                    interObject.setListening(true);
                    this.interactions.addObservableShape(this.uniqueId, interObject);
                    if (this.options.onmouseover) {
                        interObject.on("mouseover", e => this.options.onmouseover(feature))
                    }
                    if (this.options.onmouseout) {
                        interObject.on("mouseout", e => this.options.onmouseout(feature))
                    }
                    if (this.options.onclick) {
                        interObject.on("click", e => this.options.onclick(feature))
                    }
                }
            })
        });
        if (!empty) this.konvaLayer.add(group);
    }    

    addGeoJsonFeatures() {
        const types = ["point", "line", "polygon"];
        const defaultStyles = [{
            fill:"red", stroke:"black", strokeWidth:1, radius: 20
        }, {
            stroke:"red", strokeWidth:2
        }, {
            stroke:"red", strokeWidth:2
        }]
        const defaultSelectedStyles = [{
            fill:"blue", stroke:"red", strokeWidth:1.2, radius: 9
        }, {
            stroke:"red", strokeWidth:3
        }, {
            stroke:"red", strokeWidth:3
        }];
        this.geoJson.geoJson.features.forEach(feature => {
            let geom = feature.geometry;
            let type = types.indexOf(geom.type.toLowerCase());
            let style = defaultStyles[type];
            if (this.options.getFeatureStyle) {
                style = this.options.getFeatureStyle(feature) || style;
            }
            let selectedStyle = defaultSelectedStyles[type];
            if (this.options.getSelectedFeatureStyle) {
                selectedStyle = this.options.getSelectedFeatureStyle(feature) || selectedStyle;
            }
            style.listening = false;
            if (style.visible != false) {
                let object = null, empty = true;
                if (geom.type == "Point") {
                    let p = this.toCanvas({lng:geom.coordinates[0], lat:geom.coordinates[1]});
                    style.x = p.x;
                    style.y = p.y;
                    let circle = new Konva.Circle(style)                    
                    this.konvaLayer.add(circle);
                    //console.log(style);
                    empty = false;
                    object = circle;
                }
                if (this.interactions && !empty) {
                    let interObject = object.clone();
                    interObject.setListening(true);
                    this.interactions.addObservableShape(this.uniqueId, interObject);
                    if (this.options.onmouseover) {
                        interObject.on("mouseover", e => this.options.onmouseover(feature))
                    }
                    if (this.options.onmouseout) {
                        interObject.on("mouseout", e => this.options.onmouseout(feature))
                    }
                    if (this.options.onclick) {
                        interObject.on("click", e => this.options.onclick(feature))
                    }
                }   
            }         
        });
        this.konvaLayer.draw();       
        if (this.interactions) this.interactions.redraw(); 
    }

    drawContextLegend() {
        let l1_x = 60, l1_y = 30, l2_x = 70;
        let p0 = this.toCanvas({lat:this.contextLegend.lat, lng:this.contextLegend.lng})
        let pc = this.toCanvas(window.geoos.center);
        let p1 = {x:p0.x < pc.x?p0.x + l1_x:p0.x - l1_x, y:p0.y < pc.y?p0.y + l1_y:p0.y - l1_y};
        let p2 = {x:p0.x < pc.x?p1.x + l2_x:p1.x - l2_x, y:p1.y};
        let line = new Konva.Line({
            points:[p0.x, p0.y, p1.x, p1.y, p2.x, p2.y],
            stroke:"blue", strokeWidth:1.5, 
            dash: [10, 3, 3, 3],
            lineCap: 'round'
        })
        this.konvaLayer.add(line);
        let marker = new Konva.Circle({
            x:p0.x, y:p0.y, radius:5, fill:"black"
        });
        this.konvaLayer.add(marker);

        let kText = new Konva.Text({
            x:0, y:0,
            text:this.contextLegend.label,
            fontSize:14,
            fontFamily:"Calibri",
            fill:"white"
        });
        let txtWidth = kText.width();
        let txtHeight = kText.height();

        let roundedRect = new Konva.Rect({
            x:p0.x < pc.x?p2.x:p2.x  - txtWidth - 10, width:txtWidth + 10,
            y:p2.y - txtHeight / 2 - 6, height:txtHeight + 12,
            fill: 'rgb(68, 68, 67)',
            stroke: 'white',
            strokeWidth: 1,
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffset: { x: 4, y: 4 },
            shadowOpacity: 0.5,
            cornerRadius:3,
            opacity:0.9
        });
        this.konvaLayer.add(roundedRect);

        kText.absolutePosition({
            x:roundedRect.x() + 5, y:roundedRect.y() + 6
        })
        this.konvaLayer.add(kText);
    }

    redraw() {
        if (this.redrawTimer) clearTimeout(this.redrawTimer);
        this.redrawTimer = setTimeout(_ => {
            this.redrawTimer = null;
            this.update();
        }, 50);
    }
}