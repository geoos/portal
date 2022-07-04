class GEOOSRasterLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
        this.visualizers = RasterVisualizer.createVisualizersForLayer(this);
        if (this.variable.levels && this.variable.levels.length) {
            this._level = this.variable.options.defaultLevel;
            if (this._level === undefined) this._level = 0;
        } 
    }

    get variable() {return this.config.variable}
    get geoServer() {return this.config.geoServer}
    get dataSet() {return this.config.dataSet}
    get level() {return this._level}
    set level(l) {this._level = l; this.refresh()}

    serialize() {
        let l = super.serialize();
        l.type = "raster";        
        l.variable = this.variable.code;
        l.geoServer = this.geoServer.code;
        l.dataSet = this.dataSet.code;
        if (this._level !== undefined) l.level = this._level;
        l.visualizers = this.visualizers.reduce((list, v) => {list.push(v.serialize()); return list}, [])
        return l;
    }
    static deserialize(s, config) {
        config.geoServer = window.geoos.getGeoServer(s.geoServer);
        if (!config.geoServer) throw "GeoServer '" + s.geoServer + "' is not available";
        config.dataSet = config.geoServer.dataSets.find(ds => ds.code == s.dataSet);
        if (!config.dataSet) throw "DataSet '" + s.dataSet + "' is no available in GeoServer '" + s.geoServer + "'";
        config.variable = config.dataSet.variables.find(v => v.code == s.variable);
        if (!config.variable) throw "Variable '" + s.variable + "' is no available in DataSet '" + s.dataSet + "' in GeoServer '" + s.geoServer + "'";
        let layer = new GEOOSRasterLayer(config);
        layer.id = s.id;
        if (s.level !== undefined) layer._level = s.level;
        layer.visualizers.forEach(v => {
            let vConfig = s.visualizers.find(vis => vis.code == v.code);
            if (vConfig) v.applyConfig(vConfig)
        });
        return layer;
    }

    getVisualizer(code) {return this.visualizers.find(v => (v.code == code))}
    getItems() {return this.visualizers}

    formatValue(v) {
        if (v === undefined || v === null) return "";
        return this.geoServer.client.formatValue(this.dataSet.code, this.variable.code, v, false);
    }

    async create() {
        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        this.konvaLeafletLayer = new KonvaLeafletLayer(window.geoos.map, null, null, {pane:this.pane.id});
        this.konvaLeafletLayer.addTo(window.geoos.map);
        for (let v of this.visualizers) {
            if (v.active) await v.create();
        }
    }
    async destroy() {
        if (!this.konvaLeafletLayer) return;
        for (let v of this.visualizers) {
            if (v.active) await v.destroy();
        }
        this.konvaLeafletLayer.removeFrom(window.geoos.map);
        window.geoos.mapPanel.destroyPanelFromLayer(this);
        this.konvaLeafletLayer = null;
    }
    reorder() {
        window.geoos.mapPanel.adjustPanelZIndex(this);
    }

    async refresh() {
        if (!this.group.active || !this.active) return;
        let promises = [];
        this.visualizers.forEach(v => {
            if (v.active) promises.push(v.refresh())
        });
        await (Promise.all(promises))
    }

    getDataState() {
        // Resumir estado de datos de los visualizadores activos
        if (this.isWorking) return "Consultando ...";
        //let n = this.visualizers.reduce((sum, v) => (v.active?sum+1:sum), 0);
        // Obtener los tiempos de los datos de cada visualizador activo. 
        let {tiempos, errores, modelos} = this.visualizers.reduce((listas, v) => {
            if (v.active) {
                listas.tiempos.push(v.lastDataTime);
                listas.errores.push(v.lastError);
                listas.modelos.push(v.lastModelTime);
            }
            return listas;
        }, {tiempos:[], errores:[], modelos:[]});
        let stErrores = null;
        for (let error of errores) {
            if (error) {
                if (error.toLowerCase() == "no data") error = "No hay Datos";
                if (!stErrores) stErrores = error;
                else {
                    if (stErrores.indexOf(error) < 0) stErrores += ", " + error;
                }
            }
        }
        if (stErrores) return stErrores;

        let stEstado = null;
        for (let tiempo of tiempos) {
            if (tiempo > 0) {
                let fmt = moment.tz(tiempo, window.timeZone).format("YYYY-MM-DD HH:mm");
                if (!stEstado) stEstado = "Válido para " + fmt;
                else {
                    if (stEstado.indexOf(fmt) < 0) stEstado += ", " + fmt;
                }
            }
        }
        let stModelo = null;
        for (let tiempoModelo of modelos) {
            if (tiempoModelo) {                
                if (!stModelo) stModelo = "Inicio (UTC): " + tiempoModelo;
                else {
                    if (stModelo.indexOf(tiempoModelo) < 0) stModelo += ", " + tiempoModelo;
                }
            }
        }
        if (stModelo) {
            if (stEstado) return stModelo + "<br>" + stEstado;
            return stModelo;
        } else if (stEstado) {
            return stEstado
        } else {
            return "Sin Información";
        }
    }
}

class GEOOSRasterFormulaLayer extends GEOOSLayer {
    constructor(config) {
        super(config);       
        this.visualizers = RasterVisualizer.createVisualizersForLayer(this);

        this.decimals = 2;
        this.unit = "s/u";
        this.dLat = 0.25;
        this.dLng = 0.25;
        this.formula = 
`function z() {
    return Math.cos(20.0 * Math.PI * lat / 360.0) 
         * Math.sin(20.0 * Math.PI * lng / 360.0);
}`;

    }

    serialize() {
        let l = super.serialize();
        l.type = "rasterFormula";
        l.sources = [];
        for (let s of this.sources) {
            l.sources.push({
                code: s.code, name: s.name,
                geoServer: s.geoServer.code, 
                dataSet: s.dataSet.code,
                variable: s.variable.code,
                level: s.level, time: s.time
            })
        }
        l.visualizers = this.visualizers.reduce((list, v) => {list.push(v.serialize()); return list}, [])
        l.formula = this.formula;
        l.decimals = this.decimals;
        l.unit = this.unit;
        l.dLat = this.dLat;
        l.dLng = this.dLng;

        return l;
    }
    static deserialize(s, config) {
        let sources = [];
        for (let source of s.sources) {
            let geoServer = window.geoos.getGeoServer(source.geoServer); 
            let dataSet = geoServer.dataSets.find(ds => ds.code == source.dataSet);
            let variable = dataSet.variables.find(v => v.code == source.variable);
            sources.push({
                code:source.code, name:source.name,
                geoServer, dataSet,
                variable,
                level: source.level, time:source.time
            })
        }
        let layer = new GEOOSRasterFormulaLayer(config);
        layer.config.sources = sources;        
        layer.id = s.id;
        layer.formula = s.formula;
        layer.decimals = s.decimals;
        layer.unit = s.unit;
        layer.dLat = s.dLat;
        layer.dLng = s.dLng;
        layer.visualizers.forEach(v => {
            let vConfig = s.visualizers.find(vis => vis.code == v.code);
            if (vConfig) v.applyConfig(vConfig)
        });
        return layer;
    }


    get sources() {
        if (!this.config.sources) this.config.sources = [];
        return this.config.sources;
    }
    async create() {
        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        this.konvaLeafletLayer = new KonvaLeafletLayer(window.geoos.map, null, null, {pane:this.pane.id});
        this.konvaLeafletLayer.addTo(window.geoos.map);
        for (let v of this.visualizers) {
            if (v.active) await v.create();
        }
    }
    async destroy() {
        if (!this.konvaLeafletLayer) return;
        for (let v of this.visualizers) {
            if (v.active) await v.destroy();
        }
        this.konvaLeafletLayer.removeFrom(window.geoos.map);
        window.geoos.mapPanel.destroyPanelFromLayer(this);
        this.konvaLeafletLayer = null;
    }
    reorder() {
        window.geoos.mapPanel.adjustPanelZIndex(this);
    }

    getVisualizer(code) {return this.visualizers.find(v => (v.code == code))}
    getItems() {return this.visualizers}

    formatValue(v) {
        if (v === undefined) return "";
        let decimals = this.decimals;
        let pow = Math.pow(10, decimals);
        return Math.floor(v * pow) / pow + "";
    }

    async refresh() {
        if (!this.group.active || !this.active) return;
        let promises = [];
        this.visualizers.forEach(v => {
            if (v.active) promises.push(v.refresh())
        });
        await (Promise.all(promises))
    }

    getPropertyPanels() {
        let panels = super.getPropertyPanels();
        panels.push({
            code:"formula-config", name:"Configurar Capa de Fórmula", path:"./layers/formula/FormulaConfig"
        })
        panels.push({
            code:"formula-sources", name:"Variables de Entrada a la Fórmula", path:"./layers/formula/Sources"
        })
        panels.push({
            code:"formula-formula", name:"Fórmula", path:"./layers/formula/Formula"
        })
        panels.push({
            code:"formula-results", name:"Resultados", path:"./layers/formula/FormulaResults"
        })
        return panels;
    }

    resolveFormula(asGeojson = false) {
        // {foundBox:{lng0, lat0, lng1, lat1}, foundTime:{msUTC, formatted}, min, max, ncols, nrows, metadata:{}, rows:[nrows], searchBox, searchTime}
        try {
            let bounds = window.geoos.bounds;
            let box = {};
            let dLat = this.dLat, dLng = this.dLng;
            let nrows, ncols;
            let retry = false;
            do {
                if (bounds.w / dLng != parseInt(bounds.w / dLng)) {
                    box.w = parseInt(bounds.w / dLng) * dLng;
                } else {
                    box.w = bounds.w;
                }
                if (bounds.e / dLng != parseInt(bounds.e / dLng)) {
                    box.e = (1.0 + parseInt(bounds.e / dLng)) * dLng;
                } else {
                    box.e = bounds.e;
                }
                if (bounds.n / dLat != parseInt(bounds.n / dLat)) {
                    box.n = parseInt(bounds.n / dLat) * dLat;
                } else {
                    box.n = bounds.n;
                }
                if (bounds.s / dLat != parseInt(bounds.s / dLat)) {
                    box.s = (1.0 + parseInt(bounds.s / dLat)) * dLat;
                } else {
                    box.s = bounds.s;
                }
                ncols = parseInt((box.e - box.w) / dLng);
                nrows = parseInt((box.n - box.s) / dLat);
                retry = false;
                if (ncols > 200) {dLng *= 2; retry = true;}
                if (nrows > 200) {dLat *= 2; retry = true;}
            } while(retry);
            let min, max, rows=[], featureCollection=[];
            
            let foundBox = {dLat:dLat, dLng:dLng, lat0:box.s, lat1:box.n, lng0:box.w, lng1:box.e};
            let proms = [], controllers = [], sourcesData = {}
            this.dataError = null;
            this.metadatas = {};
            return {
                promise:new Promise((resolve, reject) => {
                    // Sources
                    for (let s of this.sources) {
                        let time = window.geoos.time;
                        if (s.time.type == "map") {
                            const offsets = {"minutes":1000 * 60, "hours":1000 * 60 * 60, "days":1000 * 60 * 60 * 24}
                            time += s.time.offset * offsets[s.time.unit];
                        } else {
                            time = s.time.ms;
                        }
                        let {promise, controller} = s.geoServer.client.grid(s.dataSet.code, s.variable.code, time, box.n, box.w, box.s, box.e, 0, s.level, dLat, dLng);
                        proms.push(promise);
                        controllers.push(controller);
                    }
                    Promise.all(proms)
                        .catch(err => {
                            console.error(err);
                            this.dataError = err.toString();
                            reject(err);
                        })
                        .then(datas => {
                            let i=0;
                            for (let s of this.sources) {
                                let sData = datas[i];
                                let metadata = {foundTime:sData.foundTime};
                                if (sData.metadata && sData.metadata.modelExecution) {
                                    metadata.modelExecution = sData.metadata.modelExecution;
                                }
                                this.metadatas[s.code] = metadata;
                                if (sData.nrows != nrows || sData.ncols != ncols) {
                                    console.error("Estructura de respuesta inválida");
                                    console.error("  Esperado: (" + nrows + ", " + ncols + ")");
                                    console.error("  Recibido: (" + sData.nrows + ", " + sData.ncols + ")");
                                    reject("Datos incompatibles");
                                    return;
                                }
                                sourcesData[s.code] = sData;
                                window["min_" + s.code] = sData.min;
                                window["max_" + s.code] = sData.max;
                                i++;                                
                            }
                            // Construir matriz o geoJson de resultados
                            let z = eval(this.formula + "\n(z)");
                            for (let r=0; r<nrows; r++) {
                                let row = [];
                                for (let c=0; c<ncols; c++) {
                                    let lat = box.s + r * dLat;
                                    let lng = box.w + c * dLng;
                                    // Llenar variables globales
                                    window["lat"] = lat;
                                    window["lng"] = lng;
                                    for (let s of this.sources) {
                                        let sRows = sourcesData[s.code].rows;
                                        window[s.code] = sRows[r][c];
                                    }
                                    let v = z();
                                    if (v !== null && v !== undefined) {
                                        min = min === undefined || v < min?v:min;
                                        max = max === undefined || v > max?v:max;
                                    }
                                    if (asGeojson) {
                                        if (v !== null && v !== undefined) {
                                            featureCollection.push({
                                                type: "Feature", 
                                                geometry: {
                                                    type:"Point",
                                                    coordinates: [lng, lat]                                                
                                                },
                                                properties: {z:v}
                                            })
                                        }
                                    } else {
                                        row.push(v);
                                    }
                                }
                                rows.push(row);
                            }
                            if (asGeojson) {
                                resolve({
                                    min, max, foundBox, nrows, ncols, geoJson:{
                                        type:"FeatureCollection", name:"grid", features: featureCollection
                                    }
                                });
                            } else {
                                resolve({
                                    min, max, foundBox, rows, nrows, ncols
                                });
                            }
                            
                        })
                }),
                controller:{
                    abort:() => {console.
                        log("Formula Abort")
                        for (let c of controllers) c.abort();
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    resolveIsolines(_autoIncrement, _increment, _fixedLevels) {
        let {promise, controller} = this.resolveFormula(true);
        let newProm = new Promise((resolve, reject) => {
            promise.then(ret => {
                let min = ret.min, max = ret.max;
                if (min === undefined || max === undefined || min == max) {
                    reject("No Data");
                    return;
                }
                let increment, levels=[];
                if (_fixedLevels) {
                    let stLevels = _fixedLevels.split(" ");
                    for (let stLevel of stLevels) {
                        levels.push(parseFloat(stLevel));
                    }
                } else {
                    if (_autoIncrement) {
                        increment = Math.pow(10, parseInt(Math.log10(max - min) - 1));
                        let minLimit = 5;
                        let maxLimit = 20;
                        while (parseInt((max - min) / increment) < minLimit) increment /= 2;
                        while (parseInt((max - min) / increment) > maxLimit) increment *= 2;
                    } else {
                        increment = _increment;
                    }
                    let l =  min;
                    if (parseInt(l / increment) != l / increment) {
                        l = (parseInt(l / increment) + 1) * increment;
                    }
                    while (l <= max) {
                        levels.push(l);
                        l += increment;
                    }
                }
                let lines = turf.isolines(ret.geoJson, levels, {zProperty:"z"});
                let markers = [];
                lines.features.forEach(f => {
                    if (f.geometry.type == "LineString") {
                        let n = f.geometry.coordinates.length;
                        let med = parseInt((n - 0.1) / 2);
                        let p0 = f.geometry.coordinates[med], p1 = f.geometry.coordinates[med+1];
                        let lng = (p0[0] + p1[0]) / 2;
                        let lat = (p0[1] + p1[1]) / 2;
                        markers.push({lat:lat, lng:lng, value:f.properties.z});
                    } else if (f.geometry.type == "MultiLineString") {
                        f.geometry.coordinates.forEach(ml => {
                            let n = ml.length;
                            let med = parseInt((n - 0.1) / 2);
                            let p0 = ml[med], p1 = ml[med+1];
                            let lng = (p0[0] + p1[0]) / 2;
                            let lat = (p0[1] + p1[1]) / 2;
                            markers.push({lat:lat, lng:lng, value:f.properties.z});
                        })                        
                    }                
                });
                let isolines = {
                    min, max,
                    geoJson:lines, 
                    markers
                }
                resolve(isolines);
            }).catch(error => {
                reject(error);
            })
        })
        

        return {promise: newProm, controller}
    }
}