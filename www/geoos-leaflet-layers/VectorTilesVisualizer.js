class VectorTilesVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
        this.extent = 4096;
        this.tiles = {};
        this.lastZoom = -1;
    }
    
    abort() {
        for (let key in this.tiles) {
            let t = this.tiles[key];
            if (t.status == "pending") {
                if (t.aborter) t.aborter.abort();
                t.status = "deleted";
            }
        }
        this.tiles = {};
    }
    destroy() {
        this.abort();
        this.tiles = null;
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
        if (!nPendings) this.konvaLayer.draw();
    } 

    reset() {
        this.abort();
        this.update();
    }
    update() {
        super.update()
        this.konvaLayer.destroyChildren();
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

        this.konvaLayer.draw();
    }

    toX(x) {return x - this.originInWorld.x}
    toY(y) {return y - this.originInWorld.y}

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
            let style = defaultStyles[type];
            if (this.options.getFeatureStyle) {
                style = this.options.getFeatureStyle(feature) || style;
            }
            feature.geometry.forEach(geom => {
                if (type == 1) {
                    style.x = this.toX(tile.x0 + p[0] * tile.tileWidth / this.extent);
                    style.y = this.toY(tile.y0 + p[1] * tile.tileHeight / this.extent);
                    let circle = new Konva.Circle(style)
                    group.add(circle);
                    empty = false;
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
                    }
                }
            })
        });
        if (!empty) this.konvaLayer.add(group);
    }    
}