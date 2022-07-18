class GEOOSStationsLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
        this.id = config.id?config.id:"stations";
        this.points = [];
        this.watchers = [];
        this.watcherResults = {}
        this.colorScale = null;
    }

    serialize() {
        let l = super.serialize();
        l.type = "stations";
        l.stations = this.points.map(p => (p.id));
        l.watchers = this.watchers.reduce((list, w) => [...list, w.serialize()], [])
        return l;
    }
    static deserialize(s, config) {
        let layer = new GEOOSStationsLayer(config);
        layer.id = s.id;
        for (let code of s.stations) {
            try {
                layer.addStation(code, true);
            } catch(error) {
                console.error("No se puede agregar estacion ", code, error);
            }
        }
        layer.watchers = s.watchers?s.watchers.reduce((list, w) => [...list, GEOOSQuery.deserialize(w)], []):[];
        layer.watchers.forEach(w => {
            w.layer = layer;
            layer.watcherResults[w.id] = {aborter:null, results:null}
        });
        return layer;
    }

    get minZDimension() {return "rie.estacion"}    

    addStation(code, silent) {
        if (this.containsStation(code)) return;
        let e = window.geoos.estaciones.estaciones[code];
        if (!e) throw "No se encontró la estación " + code;
        let point = {
            id:e.code, station:e, lat:e.lat, lng:e.lng, watching:[], 
            options:{
                style:{radius:8, stroke:"black", strokeWidth:1, fill:"red"}
            }
        }
        this.points.push(point);
        if (!silent) this.refresh();        
    }
    addStations(list) {
        list.forEach(s => this.addStation(s, true));
        this.refresh();
    }
    removeStation(code, silent) {
        let idx = this.points.findIndex(p => (p.id == code));
        if (idx < 0) throw "No se encontró la estación " + code;
        this.points.splice(idx, 1);
        if (!silent) this.refresh();
        //console.log("en station layer", this.points);
    } 
    removeStations(list) {
        list.forEach(s => this.removeStation(s, true));
        this.refresh();
    }
    containsStation(code) {return this.points.findIndex(p => (p.id == code)) >= 0}
    hasStations() {return this.points.length?true:false}
    getStations() {
        return this.points.map(p => (p.station));
    }

    async create() {
        this.objectSelectedListener = selection => {
            //if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }
        this.objectUnselectedListener = selection => {
            //if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }
        this.timeChangeListener = _ => {
            this.refresh();
        }

        window.geoos.events.on("map", "objectSelected", this.objectSelectedListener);
        window.geoos.events.on("map", "objectUnselected", this.objectUnselectedListener);
        window.geoos.events.on("portal", "timeChange", this.timeChangeListener);

        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        this.konvaLeafletLayer = new KonvaLeafletLayer(window.geoos.map, null, null, {pane:this.pane.id});
        this.konvaLeafletLayer.addTo(window.geoos.map);
        
        this.konvaLeafletLayer.addVisualizer("points", new PointsVisualizer({
            zIndex:1,
            interactions:window.geoos.interactions,
            getPoints: _ => (this.points),
            getColorWatch: point => {
                if (!this.watchColorResults || !this.watchColorResults[point.id]) return null;
                return this.colorScale.getColor(this.watchColorResults[point.id])
            },
            onmouseover: point => {
                let station = point.station;
                if (station.code == this.hoveredCode) return;
                this.hoveredCode = station.code;
                let name = station.name, lat = station.lat, lng = station.lng;
                if (name !== undefined && lat !== undefined && lng !== undefined) {
                    this.konvaLeafletLayer.getVisualizer("legends").setContextLegend(lat, lng, name);                    
                } else {
                    this.konvaLeafletLayer.getVisualizer("legends").unsetContextLegend();
                }
                window.geoos.mapPanel.mapContainer.view.style.cursor = "crosshair";
            },
            onmouseout: point => {
                this.hoveredCode = null;
                this.konvaLeafletLayer.getVisualizer("legends").unsetContextLegend();
                window.geoos.mapPanel.mapContainer.view.style.removeProperty("cursor");
            },
            onclick:point => window.geoos.selectObject({
                type:"station", code:point.station.code, name:point.station.name, layer:this, minZDimension:"rie.estacion",
                lat:point.station.lat, lng:point.station.lng
            }),
        }));    
        this.konvaLeafletLayer.addVisualizer("legends", new LegendsVisualizer({
            zIndex:2,
            getFlagPoints:_ => {
                // point: {lat, lng, watching:[{label:string, color:string}, ...]}
                let pointsMap = this.points.reduce((map, p) => {
                    map[p.id] = p;
                    return map;
                }, {})
                let pointLegends = {};
                for (let w of this.watchers.filter(w => w.legend)) {
                    let r = this.watcherResults[w.id];
                    let results = r.results;
                    if (results) {
                        for (let v of results) {
                            let point = pointsMap[v._id];
                            if (point) {
                                let leg = pointLegends[point.id]
                                if (!leg) {
                                    leg = {id:point.id, lat:point.lat, lng:point.lng, watching:[]};
                                    pointLegends[point.id] = leg;
                                }
                                leg.watching.push({
                                    label:w.name + ":" + window.geoos.formatNumber(v.resultado, w.decimals, w.unit),
                                    color:"white"
                                });                                
                            }
                        }                        
                    }
                }
                let list = Object.keys(pointLegends).map(id => pointLegends[id]);
                return list;
            }
        }));    
        this.refreshWatchers();
    }
    async destroy() {  
        window.geoos.events.remove(this.objectSelectedListener);
        window.geoos.events.remove(this.objectUnselectedListener);
        window.geoos.events.remove(this.timeChangeListener);
        if (!this.konvaLeafletLayer) return;
        this.konvaLeafletLayer.removeVisualizer("legends");
        this.konvaLeafletLayer.removeVisualizer("points");
        this.konvaLeafletLayer.removeFrom(window.geoos.map);
        window.geoos.mapPanel.destroyPanelFromLayer(this);
        this.konvaLeafletLayer = null;
    }

    async refresh() {   
        this.refreshWatchers();
        if (!this.konvaLeafletLayer) return;
        await this.konvaLeafletLayer.getVisualizer("points").update();
        if (this.konvaLeafletLayer.getVisualizer("legends")) await this.konvaLeafletLayer.getVisualizer("legends").update();
        
    }

    repaint() {
        if (!this.konvaLeafletLayer) return;
        this.konvaLeafletLayer.getVisualizer("points").update();
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
        panels.push(
            {code:"stations-name", name:"Estaciones", path:"./layers/watchers/Stations"}
        )
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
            if (r.aborter) {
                r.aborter.abort();
                r.aborter = null;
            }
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
            this.resolveMinZWatcher(watcher, r)
                .then(_ => {
                    this.repaint();
                    window.geoos.events.trigger("watcher", "results", watcher);
                }).catch(err => console.error(err));
        } else if (watcher.type == "raster") {
            this.resolveRasterWatcher(watcher, r)
                .then(_ => {
                    this.repaint();
                    window.geoos.events.trigger("watcher", "results", watcher);
                }).catch(err => console.error(err));
        } else throw "Invalid watcher type " + watcher.type;
    }

    resolveMinZWatcher(w, r) {
        // Separar por servidor zrepo de cada estación y paralelizar las consultas.
        // luego unir los resultados
        let zRepoServers = {};
        for (let p of this.points) {
            let zRepoServer = p.station.server;
            zRepoServers[zRepoServer.url] = zRepoServer;
        }
        let promises = [];
        this.startWorking();
        for (let url in zRepoServers) {
            let server = zRepoServers[url];
            let serverWatcher = GEOOSQuery.cloneQuery(w);
            serverWatcher.zRepoServer = server;
            let {promise, controller} = serverWatcher.query({format:"dim-serie"});
            promises.push(promise);
        }
        r.aborter = "working";
        return new Promise((resolve, reject) => {
            Promise.all(promises)
                .then(resArray => {
                    console.log("resArray", resArray);
                    r.aborter = null;
                    this.finishWorking();
                    r.results = resArray.reduce((array, res) => {
                        array = array.concat(res);
                        return array;
                    }, [])
                    console.log("results", r.results);
                    if (w.color) this.precalculateColor();
                    resolve();
                }).catch(err => {
                    r.aborter = null;
                    this.finishWorking();
                    reject(err);
                })
        })
    }

    async resolveRasterWatcher(w, r) {
        this.startWorking();
        if (r.queryCount === undefined) r.queryCount = 0;
        r.queryCount++;
        let thisQuery = r.queryCount;
        let i=0, results = []; 
        while (i < this.points.length && thisQuery == r.queryCount) {
            w.progress = 100 * i / this.points.length;
            window.geoos.events.trigger("watcher", "progress", w);
            let o = this.points[i];
            let v;
            try {
                let {promise, controller} = await w.query({format:"valueAtPoint", lat:o.lat, lng:o.lng});
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
            if (this.points.findIndex(p => (p.id == r.dim.code)) >= 0) {
                if (minMax.min === undefined || r.resultado < minMax.min) minMax.min = r.resultado;
                if (minMax.max === undefined || r.resultado > minMax.max) minMax.max = r.resultado; 
            }
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

    regenerateIds() {}
}