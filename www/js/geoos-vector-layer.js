class GEOOSVectorLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
        this.watchers = [];
        this.watcherResults = {}
        this.colorScale = null;
        if (config.file && config.file.options && config.file.options.analysisConfig) this.analysisConfig = config.file.options.analysisConfig;
    }

    get file() {return this.config.file}
    get minZDimension() {return this.file && this.file.options?this.file.options.minZDimension:null}
    get geoServer() {return this.config.geoServer}
    get dataSet() {return this.config.dataSet}

    get options() {
        return this.config.file.options;
    }
    
    serialize() {
        let l = super.serialize();
        l.type = "vector";
        l.file = this.file.name;
        l.geoServer = this.geoServer.code;
        l.dataSet = this.dataSet.code;
        l.watchers = this.watchers.reduce((list, w) => [...list, w.serialize()], [])
        l.analysisConfig = this.analysisConfig;
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
        layer.watchers = s.watchers?s.watchers.reduce((list, w) => [...list, GEOOSQuery.deserialize(w)], []):[];
        layer.watchers.forEach(w => {
            w.layer = layer;
            layer.watcherResults[w.id] = {aborter:null, results:null}
        });
        return layer;
    }

    async create() {
        try {
            await this.loadMetadata();
        } catch(error) {
        }

        this.objectSelectedListener = selection => {
            if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }
        this.objectReplacedListener = selection => {
            if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }
        this.objectUnselectedListener = selection => {
            if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }
        this.timeChangeListener = _ => {
            this.refresh();
        }

        window.geoos.events.on("map", "objectSelected", this.objectSelectedListener);
        window.geoos.events.on("map", "selectedObjectReplaced", this.objectReplacedListener);
        window.geoos.events.on("map", "objectUnselected", this.objectUnselectedListener);
        window.geoos.events.on("portal", "timeChange", this.timeChangeListener);

        // Use Tiles
        if (this.file.options && this.file.options.dontTile) this.useTiles = false;
        else this.useTiles = true;
        // Styles
        let getFeatureStyle = f => ({stroke:"black", strokeWidth:2, radius:10, fill: "orange"});
        if (this.file.options && this.file.options.getFeatureStyle) {
            try {
                getFeatureStyle = eval(this.file.options.getFeatureStyle);
                if (getFeatureStyle instanceof Object && !(getFeatureStyle instanceof Function)) {
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
        let getSelectedFeatureStyle = f => ({stroke:"blue", strokeWidth:1.2, fill:"rgba(50, 50, 250, 0.4)", radius:5});
        if (this.file.options && this.file.options.getSelectedFeatureStyle) {
            try {
                getSelectedFeatureStyle = eval(this.file.options.getSelectedFeatureStyle);
                if (getSelectedFeatureStyle instanceof Object && !(getSelectedFeatureStyle instanceof Function)) {
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
        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        this.hoveredId = null;
        this.konvaLeafletLayer = new KonvaLeafletLayer(window.geoos.map, null, null, {pane:this.pane.id});
        this.konvaLeafletLayer.addTo(window.geoos.map);
        this.konvaLeafletLayer.addVisualizer("geoJsonTiles", new VectorTilesVisualizer({
            zIndex:1,
            interactions:window.geoos.interactions,
            useTiles: this.useTiles,
            getTile: (z, x, y) => {
                if (!this.metadata) return [];
                let time;
                if (this.dataSet.temporality != "none") time = window.geoos.time;
                this.startWorking();
                return this.geoServer.client.fileGeoJsonTile(this.dataSet.code, this.file.name, time, z, x, y, _ => this.finishWorking());
            },
            getGeoJson: _ => {
                let time;
                if (this.dataSet.temporality != "none") time = window.geoos.time;
                this.startWorking();
                return this.geoServer.client.fileGeoJson(this.dataSet.code, this.file.name, time, _ => this.finishWorking());
            },
            getFeatureStyle: f => {    
                let fId = f.tags?f.tags.id:f.properties.id;   
                if (window.geoos.selectedObject && window.geoos.selectedObject.layer.id == this.id && window.geoos.selectedObject.code == fId) {
                    return getSelectedFeatureStyle(f)
                }
                if (this.getColorWatcher()) {
                    let s = getFeatureStyle(f);
                    if (this.watchColorResults) {                        
                        let v = this.watchColorResults[fId];
                        s.fill = this.getColorScale().getColor(v);
                    }
                    return s;
                }
                return getFeatureStyle(f)
            },
            onmouseover: f => {
                let fId = f.tags?f.tags.id:f.properties.id;
                if (fId == this.hoveredId) return;
                this.hoveredId = fId;
                let o = this.metadataMap[this.hoveredId];
                let name, lat, lng;
                if (o) {
                    name = o.name; 
                    if (o.centroid) {
                        lat = o.centroid.lat, lng = o.centroid.lng;
                    } else if(f.geometry) {
                        lat = f.geometry.coordinates[1];
                        lng = f.geometry.coordinates[0];
                    }
                } else {
                    name = f.tags.name; lat = f.tags.centroidLat; lng = f.tags.centroidLng;
                    name = f.tags?f.tags.name:f.properties.name;
                    lat = f.tags?f.tags.centroidLat || f.tags.centerLat:null;
                    if (!lat && f.geometry) lat = f.geometry.coordinates[1];
                    lng = f.tags?f.tags.centroidLng || f.tags.centerLng:null;
                    if (!lng && f.geometry) lat = f.geometry.coordinates[0];                    
                }
                if (name !== undefined && lat !== undefined && lng !== undefined) {
                    this.konvaLeafletLayer.getVisualizer("legends").setContextLegend(lat, lng, name);
                } else {
                    this.konvaLeafletLayer.getVisualizer("legends").unsetContextLegend();
                }
            },
            onmouseout: f => {                
                this.hoveredId = null;
                this.konvaLeafletLayer.getVisualizer("legends").unsetContextLegend();
                //this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
            },
            onclick:f => {
                let fId = f.tags?f.tags.id:f.properties.id;
                let lat = f.tags?f.tags.centroidLat || f.tags.centerLat:null;
                if (!lat && f.geometry) lat = f.geometry.coordinates[1];
                let lng = f.tags?f.tags.centroidLng || f.tags.centerLng:null;
                if (!lng && f.geometry) lat = f.geometry.coordinates[0];
                let name = f.tags?f.tags.name:f.properties.name;
                window.geoos.selectObject({                
                    type:"vector-object", code:fId, name, layer:this, minZDimension:this.minZDimension,
                    lat, lng
                })
            }
        }));

        this.konvaLeafletLayer.addVisualizer("legends", new LegendsVisualizer({
            getLegendObjects:_ => {
                // // o: {lat, lng, legends:[{valor, decimales, unidad}, ...]}
                let objectLegends = {};
                for (let w of this.watchers.filter(w => w.legend)) {
                    let r = this.watcherResults[w.id];
                    let results = r.results;
                    if (results) {
                        for (let v of results) {
                            let o = this.metadataMap[v._id];
                            if (o) {
                                let leg = objectLegends[o.id]
                                if (!leg) {
                                    if (o.centroid) {
                                        leg = {id:o.id, lat:o.centroid.lat, lng:o.centroid.lng, legends:[]};
                                    } else if(o.center) {
                                        leg = {id:o.id, lat:o.center.lat, lng:o.center.lng, legends:[]};
                                    }
                                    objectLegends[o.id] = leg;
                                }
                                leg.legends.push({
                                    name:w.name, valor:v.resultado, decimales:w.decimals, unidad:w.unit
                                });                                
                            }
                        }                        
                    }
                }
                let list = Object.keys(objectLegends).map(id => objectLegends[id]);
                return list;
            }
        }));
        this.refreshWatchers();
    }
    async destroy() {  
        window.geoos.events.remove(this.objectSelectedListener);
        window.geoos.events.remove(this.objectReplacedListener);
        window.geoos.events.remove(this.objectUnselectedListener);
        window.geoos.events.remove(this.timeChangeListener);
        if (!this.konvaLeafletLayer) return;
        this.konvaLeafletLayer.removeVisualizer("legends");
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
        try {
            this.metadata = await promise;
        } catch(error) {
            this.metadata = null;
        }
        this.metadataAborter = null;
        if (this.metadata) {
            this.metadataMap = this.metadata.objects.reduce((map, o) => {
                map[o.id] = o;
                return map;
            }, {})
        } else {
            this.metadataMap = {}
        }
    }

    getDataState() {
        if (!this.dataSet || this.dataSet.temporality == "none") return "";
        if (!this.metadata) return "Sin Datos";
        let ft = this.metadata.foundTime;
        if (!ft) return "S/I";
        let fmt = moment.tz(ft.msUTC, window.timeZone).format("YYYY-MM-DD HH:mm");
        return "Válido para " + fmt;
    }
    
    async refresh() {
        if (!this.metadata || this.dataSet.temporality != "none") {
            await this.loadMetadata();
        }
        this.konvaLeafletLayer.getVisualizer("geoJsonTiles").reset();
        this.konvaLeafletLayer.getVisualizer("legends").update();
        this.refreshWatchers();
    }

    repaint() {
        this.konvaLeafletLayer.getVisualizer("geoJsonTiles").update();
        this.konvaLeafletLayer.getVisualizer("legends").update();
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
        let pending = this.metadata.objects.reduce((list, o, index) => (list.length < 500?[...list, {queryCount:r.queryCount, index, working:false}]:list), []);
        await (new Promise((resolve, reject) => {
            let i=0, results = []; 
            while (i<10) {
                this.resolveNextRasterWatcher(pending, w, r, results, resolve, reject);
                i++;
            }
        }))
    }

    async resolveNextRasterWatcher(pending, w, r, results, resolve, reject) {
        let n = pending.reduce((sum, p) => (sum + (p.working?1:0)), 0);
        if (!pending.length) {
            this.finishWorking();
            w.progress = 100;
            window.geoos.events.trigger("watcher", "progress", w);
            r.results = results;
            if (w.color) {
                this.precalculateColor();
            }
            resolve();
            return;
        }
        let idx = pending.findIndex(o => !o.working);
        if (idx < 0) return;
        let p = pending[idx];
        p.working = true;
        w.progress = 100 * p.index / Math.min(this.metadata.objects.length, 500);
        window.geoos.events.trigger("watcher", "progress", w);
        let o = this.metadata.objects[p.index];
        let v;
        try {
            let {promise, controller} = await w.query({format:"valueAtPoint", lat:o.centroid.lat, lng:o.centroid.lng});
            let res = await promise;
            if (res) v = res.value;
        } catch(error) {
            console.error(error);
        }
        results.push({_id:o.id, resultado:v, dim:{code:o.id, name:o.name}})
        pending.splice(pending.findIndex(p2 => p2.index == p.index), 1);
        this.resolveNextRasterWatcher(pending, w, r, results, resolve, reject);
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
}