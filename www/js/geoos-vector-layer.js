class GEOOSVectorLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
        this.watchers = [];
        this.watcherResults = {}
        this.colorScale = null;
    }

    get file() {return this.config.file}
    get minZDimension() {return this.file && this.file.options?this.file.options.minZDimension:null}
    get geoServer() {return this.config.geoServer}
    get dataSet() {return this.config.dataSet}
    
    serialize() {
        let l = super.serialize();
        l.type = "vector";
        l.file = this.file.name;
        l.geoServer = this.geoServer.code;
        l.dataSet = this.dataSet.code;
        return l;
    }
    static deserialize(s, config) {
        config.geoServer = window.geoos.getGeoServer(s.geoServer);
        if (!config.geoServer) throw "GeoServer '" + s.geoServer + "' is not available";
        config.dataSet = config.geoServer.dataSets.find(ds => ds.code == s.dataSet);
        if (!config.dataSet) throw "DataSet '" + s.dataSet + "' is no available in GeoServer '" + s.geoServer + "'";
        config.file = config.dataSet.files.find(f => f.name == s.file);
        if (!config.file) throw "File '" + s.file + "' is no available in DataSet '" + s.dataSet + "' in GeoServer '" + s.geoServer + "'";
        let layer = new GEOOSVectorLayer(config);
        layer.id = s.id;
        return layer;
    }

    async create() {
        await this.loadMetadata();

        this.objectSelectedListener = selection => {
            if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }
        this.objectUnselectedListener = selection => {
            if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }
        this.timeChangeListener = _ => {
            this.refresh();
        }

        window.geoos.events.on("map", "objectSelected", this.objectSelectedListener);
        window.geoos.events.on("map", "objectUnselected", this.objectUnselectedListener);
        window.geoos.events.on("portal", "timeChange", this.timeChangeListener);

        // Styles
        let getFeatureStyle = f => ({stroke:"black", strokeWidth:1});
        if (this.file.options && this.file.options.getFeatureStyle) {
            try {
                getFeatureStyle = eval(this.file.options.getFeatureStyle);
                if (getFeatureStyle instanceof Object) {
                    this.fixedStyle = getFeatureStyle;
                    getFeatureStyle = f => (this.fixedStyle)
                } else if (!(getFeatureStyle instanceof Function)) {
                    console.error("Invalid 'getFeatureStyle' option for file '" + this.file.name + "'. Must be a javascript object or function");
                    getFeatureStyle = null;
                }
             } catch(err) {
                console.error("Error parsing 'getFeatureStyle' for file '" + this.file.name + "'");
                console.warn(this.file.options.getFeatureStyle);
                console.error(err);
            }
        }
        let getSelectedFeatureStyle = f => ({stroke:"blue", strokeWidth:1.2, fill:"rgba(50, 50, 250, 0.4)"});
        if (this.file.options && this.file.options.getSelectedFeatureStyle) {
            try {
                getSelectedFeatureStyle = eval(this.file.options.getSelectedFeatureStyle);
                if (getSelectedFeatureStyle instanceof Object) {
                    this.fixedSelectedStyle = getSelectedFeatureStyle;
                    getSelectedFeatureStyle = f => (this.fixedSelectedStyle)
                } else if (!(getSelectedFeatureStyle instanceof Function)) {
                    console.error("Invalid 'getSelectedFeatureStyle' option for file '" + this.file.name + "'. Must be a javascript object or function");
                    getSelectedFeatureStyle = null;
                }
             } catch(err) {
                console.error("Error parsing 'getSelectedFeatureStyle' for file '" + this.file.name + "'");
                console.warn(this.file.options.getSelectedFeatureStyle);
                console.error(err);
            }
        }
        let getHoverFeatureStyle = f => ({stroke:"black", strokeWidth:1.2, fill:"rgba(50, 50, 250, 0.2)"});
        if (this.file.options && this.file.options.getHoverFeatureStyle) {
            try {
                getHoverFeatureStyle = eval(this.file.options.getHoverFeatureStyle);
                if (getHoverFeatureStyle instanceof Object) {
                    this.fixedHoverStyle = getHoverFeatureStyle;
                    getHoverFeatureStyle = f => (this.fixedHoverStyle)
                } else if (!(getHoverFeatureStyle instanceof Function)) {
                    console.error("Invalid 'getSelectedFeatureStyle' option for file '" + this.file.name + "'. Must be a javascript object or function");
                    getHoverFeatureStyle = null;
                }
             } catch(err) {
                console.error("Error parsing 'getSelectedFeatureStyle' for file '" + this.file.name + "'");
                console.warn(this.file.options.getSelectedFeatureStyle);
                console.error(err);
            }
        }

        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        this.hoveredId = null;
        this.konvaLeafletLayer = new KonvaLeafletLayer(window.geoos.map, null, null, {pane:this.pane.id});
        this.konvaLeafletLayer.addTo(window.geoos.map);
        this.konvaLeafletLayer.addVisualizer("geoJsonTiles", new VectorTilesVisualizer({
            zIndex:1,
            interactions:window.geoos.interactions,
            getTile: (z, x, y) => {
                let time;
                if (this.dataSet.temporality != "none") time = window.geoos.time;
                this.startWorking();
                return this.geoServer.client.fileGeoJsonTile(this.dataSet.code, this.file.name, time, z, x, y, _ => this.finishWorking());
            },
            getFeatureStyle: f => {                
                if (window.geoos.selectedObject && window.geoos.selectedObject.layer.id == this.id && window.geoos.selectedObject.objectId == f.tags.id) {
                    return getSelectedFeatureStyle(f)
                }
                if (f.tags.id == this.hoveredId) return getHoverFeatureStyle(f)
                else if (this.getColorWatcher()) {
                    let s = getFeatureStyle(f);
                    if (this.watchColorResults) {                        
                        let v = this.watchColorResults[f.tags.id];
                        s.fill = this.getColorScale().getColor(v);
                    }
                    return s;
                } else return getFeatureStyle(f)
            },
            onmouseover: f => {
                if (f.tags.id == this.hoveredId) return;
                this.hoveredId = f.tags.id;
                let name = f.tags.name, lat = f.tags.centroidLat, lng = f.tags.centroidLng;
                if (lat === undefined || lng === undefined) {
                    lat = f.tags.centerLat, lng = f.tags.centerLng;
                }
                if (name !== undefined && lat !== undefined && lng !== undefined) {
                    this.konvaLeafletLayer.getVisualizer("geoJsonTiles").setContextLegend(lat, lng, name);                    
                } else {
                    this.konvaLeafletLayer.getVisualizer("geoJsonTiles").unsetContextLegend();
                }
                this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
            },
            onmouseout: f => {
                this.hoveredId = null;
                this.konvaLeafletLayer.getVisualizer("geoJsonTiles").unsetContextLegend();
                this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
            },
            onclick:f => window.geoos.selectObject(this, f.tags.id),
            getExtraElements:_ => (this.paintLegends())
        }));
        
    }
    async destroy() {  
        window.geoos.events.remove(this.objectSelectedListener);
        window.geoos.events.remove(this.objectUnselectedListener);
        window.geoos.events.remove(this.timeChangeListener);
        if (!this.konvaLeafletLayer) return;
        this.konvaLeafletLayer.removeVisualizer("geoJsonTiles");
        this.konvaLeafletLayer.removeFrom(window.geoos.map);
        window.geoos.mapPanel.destroyPanelFromLayer(this);
        this.konvaLeafletLayer = null;
    }

    async loadMetadata() {
        if (this.metadataAborter) this.metadataAborter.abort();
        let time;
        if (this.dataSet.temporality != "none") time = window.geoos.time;
        this.startWorking();
        let {promise, controller} = this.geoServer.client.fileMetadata(this.dataSet.code, this.file.name, time, _ => this.finishWorking());
        this.metadataAborter = controller;
        this.metadata = await promise;
        this.metadataAborter = null;
        this.metadataMap = this.metadata.objects.reduce((map, o) => {
            map[o.id] = o;
            return map;
        }, {})
    }
    async refresh() {
        if (!this.metadata || this.dataSet.temporality != "none") {
            await this.loadMetadata();
        }
        this.konvaLeafletLayer.getVisualizer("geoJsonTiles").reset();
        this.refreshWatchers();
    }

    repaint() {
        this.konvaLeafletLayer.getVisualizer("geoJsonTiles").update();
    }

    reorder() {
        window.geoos.mapPanel.adjustPanelZIndex(this);
    }

    getPropertyPanels() {
        let panels = super.getPropertyPanels().concat({
            code:"layer-watchers", name:"Observar Variables", path:"./layers/watchers/Watchers"
        })
        if (this.watchers.reduce((n, w) => (w.color?(n+1):n), 0) > 0) {
            panels.push({
                code:"color-scale", name:"Escala de Colores", path:"./layers/watchers/WatchersColorScale"
            })
        }
        return panels;
    }

    getWatcher(id) {
        return this.watchers.find(w => (w.id == id));
    }
    addWatchers(watchers) {
        for (let w of watchers) {
            w.layer = this;
            w.legend = true;            
            this.watchers.push(w);
            this.watcherResults[w.id] = {aborter:null, results:null}
            this.refreshWatcher(w.id)
        }
        if (this.watchers.length == watchers.length) this.watchers[0].color=true;
    }
    deleteWatcher(id) {
        let idx = this.watchers.findIndex(w => (w.id == id));
        if (idx >= 0) this.watchers.splice(idx);
        delete this.watcherResults[id];
    }    
    cancelWatcher(id) {
        let r = this.watcherResults[id];
        if (!r) throw "Invalid Watcher:" + id;
        let w = this.getWatcher(id);
        if (!w) throw "Watcher not found:" + id;
        if (w.type == "minz") {
            if (r.aborter) r.aborter.abort();
        } else if (w.type == "raster") {
            if (r.queryCount) r.queryCount++;
        } else throw "Invalid watcher type " + w.type;
        r.results = null;
    }
    refreshWatchers() {
        for (let w of this.watchers) this.refreshWatcher(w.id);
        this.repaint();
    }
    refreshWatcher(id) {
        this.cancelWatcher(id);
        let r = this.watcherResults[id];
        if (!r) throw "Invalid Watcher:" + id;
        let watcher = this.getWatcher(id);
        if (watcher.type == "minz") {
            let {promise, controller} = watcher.query({format:"dim-serie"});
            this.startWorking();
            r.aborter = controller;
            promise.then(res => {
                this.finishWorking();
                r.results = res;                
                if (watcher.color) this.precalculateColor();
                this.repaint();
                window.geoos.events.trigger("watcher", "results", watcher);
            }).catch(error => {
                this.finishWorking();
                if (error != "aborted") {
                    console.error(error);
                }
            });
        } else if (watcher.type == "raster") {
            this.resolveRasterWatcher(watcher, r)
                .then(_ => {
                    this.repaint();
                    window.geoos.events.trigger("watcher", "results", watcher);
                }).catch(err => console.error(err));
        } else throw "Invalid watcher type " + watcher.type;
    }

    async resolveRasterWatcher(w, r) {
        this.startWorking();
        if (r.queryCount === undefined) r.queryCount = 0;
        r.queryCount++;
        let thisQuery = r.queryCount;
        let i=0, results = []; 
        while (i < this.metadata.objects.length && thisQuery == r.queryCount) {
            w.progress = 100 * i / this.metadata.objects.length;
            window.geoos.events.trigger("watcher", "progress", w);
            let o = this.metadata.objects[i];
            let v;
            try {
                let {promise, controller} = await w.query({format:"valueAtPoint", lat:o.centroid.lat, lng:o.centroid.lng});
                let res = await promise;
                if (res) v = res.value;
            } catch(error) {
                console.error(error);
            }
            results.push({_id:o.id, resultado:v, dim:{code:o.id, name:o.name}})
            i++;
        }
        w.progress = 100;
        window.geoos.events.trigger("watcher", "progress", w);
        this.finishWorking();
        if (thisQuery != r.queryCount) {
            console.warn("raster query canceled");
            return;
        };
        r.results = results;
        if (w.color) {
            this.precalculateColor();
        }
    }

    precalculateColor() {
        this.watchColorResults = null;
        let w = this.getColorWatcher();
        if (!w) return;        
        let r = this.watcherResults[w.id];
        if (!r.results || !r.results.length) return;
        let {min, max} = r.results.reduce((minMax, r) => {
            if (minMax.min === undefined || r.resultado < minMax.min) minMax.min = r.resultado;
            if (minMax.max === undefined || r.resultado > minMax.max) minMax.max = r.resultado; 
            return minMax;
        }, {min:undefined, max:undefined})
        this.getColorScale().setRange(min, max);
        this.getColorScale().unit = w.unit;
        this.watchColorResults = r.results.reduce((map, r) => {
            map[r.dim.code] = r.resultado;
            return map;
        }, {})
    }

    getColorWatcher() {
        return this.watchers.find(w => (w.color));
    }

    getColorScale() {
        return this.colorScale || this.createDefaultColorScale();
    }
    createDefaultColorScale() {
        let cw = this.getColorWatcher();
        if (cw) return this.createColorScale(cw.colorScale);
        return this.createColorScale({name:"SAGA - 16", clipOutOfRange:false, auto:true, unit:"?"})
    }
    createColorScale(colorScaleConfig) {
        let scaleDef = window.geoos.scalesFactory.byName(colorScaleConfig.name);
        if (!scaleDef) throw "Can't find color scale '" + colorScaleConfig.name + "'";
        this.colorScale = window.geoos.scalesFactory.createScale(scaleDef, colorScaleConfig)
        if (this.getColorWatcher()) this.colorScale.unit = this.getColorWatcher().unit;
        return this.colorScale;
    }
    updateColorScale(name) {
        let scaleDef = window.geoos.scalesFactory.byName(name);
        if (!scaleDef) throw "Can't find color scale '" + colorScaleConfig.name + "'";
        this.colorScale = window.geoos.scalesFactory.createScale(scaleDef, this.colorScale.config);
        if (this.getColorWatcher()) this.colorScale.unit = this.getColorWatcher().unit;
        this.repaint();
    }

    paintLegends() {
        let elements = [];
        let leyendasPorObjeto = {}
        this.watchers.filter(w => w.legend).forEach(w => {
            let r = this.watcherResults[w.id];
            if (r && r.results) {
                r.results.forEach(r => {
                    let leyendas = leyendasPorObjeto[r.dim.code];
                    if (!leyendas) {
                        leyendas = {objeto:r.dim, leyendas:[]};
                        leyendasPorObjeto[r.dim.code] = leyendas;
                    }
                    let v = r.resultado;
                    leyendas.leyendas.push({label:r.dim.name, decimales:w.decimals, unidad:w.unit, valor:(v !== null && v !== undefined)?v:"S/D"}); 
                })
            }
        });

        let centrosLeyenda = [], visualizer = this.konvaLeafletLayer.getVisualizer("geoJsonTiles");
        Object.keys(leyendasPorObjeto).forEach(id => {
            let o = this.metadataMap[id];
            if (o) {
                let point = visualizer.toCanvas({lat:o.centroid.lat, lng:o.centroid.lng});
                let x = point.x, y = point.y, path, hPos = "izquierda", vPos = "arriba";
                let dx = 100, dy = 60;
                if (hPos == "centro") {
                    if (vPos == "arriba") {
                        path = [x, y, x, y - dy];
                        y -= dy;
                    } else if (vPos == "abajo") {
                        path = [x, y, x, y + dy];
                        y += dy;
                    }
                } else if (hPos == "izquierda") {
                    if (vPos == "centro") {
                        path = [x, y, x - dx, y];
                        x -= dx;
                    } else if (vPos == "arriba") {
                        path = [x, y, x - dx/2, y, x - dx, y - dy];
                        x -= dx; y -= dy;
                    } else if (vPos == "abajo") {
                        path = [x, y, x - dx/2, y, x - dx, y + dy];
                        x -= dx; y += dy;
                    }
                } else if (hPos == "derecha") {
                    if (vPos == "centro") {
                        path = [x, y, x + dx, y];
                        x += dx;
                    } else if (vPos == "arriba") {
                        path = [x, y, x + dx/2, y, x + dx, y - dy];
                        x += dx; y -= dy;
                    } else if (vPos == "abajo") {
                        path = [x, y, x + dx/2, y, x + dx, y + dy];
                        x += dx; y += dy;
                    }
                }
                elements.push(new Konva.Line({
                    points:path,
                    stroke:"white", strokeWidth:5,
                    lineCap: 'round', lineJoin: 'round',
                    dash: [10, 7, 0.001, 7]
                }));
                elements.push(new Konva.Line({
                    points:path,
                    stroke:"black", strokeWidth:3,
                    lineCap: 'round', lineJoin: 'round',
                    dash: [10, 7, 0.001, 7]
                }));
                centrosLeyenda.push({x:x, y:y});
            }
        });
        Object.keys(leyendasPorObjeto).forEach((id, i) => {
            let leyendas = leyendasPorObjeto[id];
            let x = centrosLeyenda[i].x, y = centrosLeyenda[i].y;;
            let width, height = 0;
            let kTexts = leyendas.leyendas.reduce((lista, l) => {
                //let txt = l.label + ": ";
                let txt = "";
                if (!isNaN(l.valor)) {
                    txt += window.geoos.formatNumber(l.valor, l.decimales, l.unidad);
                } else {
                    txt += l.valor + " [" + l.unidad + "]";
                }
                let kText = new Konva.Text({
                    x:x, y:y,
                    text:txt,
                    fontSize:12,
                    fontFamily:"Calibri",
                    fill:"#000000",
                    opacity:1
                });
                let txtWidth = kText.width();
                let txtHeight = kText.height();
                height += txtHeight;
                if (width === undefined || txtWidth > width) width = txtWidth;
                lista.push(kText);
                return lista;
            }, []);
            let roundedRect = new Konva.Rect({
                x:x - width / 2 - 5, y:y - height / 2 - 6, width:width + 10, height:height + 8,
                fill: 'rgba(255,255,255,255)',
                stroke: '#000000',
                strokeWidth: 1,
                shadowColor: 'black',
                shadowBlur: 10,
                shadowOffset: { x: 4, y: 4 },
                shadowOpacity: 0.5,
                cornerRadius:3,
                opacity:1
            });
            elements.push(roundedRect);
            let yText = y - height / 2 - 1;
            kTexts.forEach(kText => {
                kText.absolutePosition({x:x - width / 2, y:yText});
                yText += height / kTexts.length;
                elements.push(kText);
            });
        });                
        return elements;
    }
}