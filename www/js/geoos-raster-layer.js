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

        this.formulaType = "localJS";
        this.decimals = 2;
        this.unit = "s/u";
        this.dLat = 0.25;
        this.dLng = 0.25;
        this.formula = 
`function z(args) {
    return Math.cos(20.0 * Math.PI * args.lat / 360.0) 
         * Math.sin(20.0 * Math.PI * args.lng / 360.0);
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
        l.formulaType = this.formulaType;
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
        layer.formulaType = s.formulaType;
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

    sleep(ms) {
        return new Promise(resolve => setTimeout(_ => resolve(), ms));
    }

    resolveFormula() {
        // {foundBox:{lng0, lat0, lng1, lat1}, foundTime:{msUTC, formatted}, min, max, ncols, nrows, metadata:{}, rows:[nrows], searchBox, searchTime}
        if (this.resolving) {
            return {
                promise: new Promise(async (resolve, reject) => {
                    while(this.resolving) {
                        await this.sleep(20);
                    }
                    if (this.dataError) reject(this.dataError);
                    else resolve(this.ret);
                }),
                controller:{abort:() => console.log("Formula Abort")}
            }
        }
        this.ret = null;
        this.resolving = true;
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
            let foundBox = {dLat:dLat, dLng:dLng, lat0:box.s, lat1:box.n, lng0:box.w, lng1:box.e, nrows, ncols};
            this.dataError = null;
            this.metadatas = {};
            if (!this.formulaType || this.formulaType == "localJS") {
                return this.resolveLocalJS(foundBox);
            } else if (this.formulaType == "serverJSPoint") {
                return this.resolveServerJSPoint(foundBox);
            } else {
                throw "Formula tipo " + this.formulaType + " no implementado";
            }            
        } catch (error) {
            console.error(error);
        }
    }

    resolveLocalJS(foundBox) {
        let min, max, rows=[];            
        let proms = [], controllers = [], sourcesData = {}
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
                    let {promise, controller} = s.geoServer.client.grid(s.dataSet.code, s.variable.code, time, foundBox.lat1, foundBox.lng0, foundBox.lat0, foundBox.lng1, 0, s.level, foundBox.dLat, foundBox.dLng);
                    proms.push(promise);
                    controllers.push(controller);
                }
                Promise.all(proms)
                    .catch(err => {
                        console.error(err);
                        this.dataError = err.toString();
                        this.resolving = false;
                        reject(err);
                    })
                    .then(datas => {
                        if (!datas) {
                            this.dataError = "No Data";
                            this.resolving = false;
                            reject("No Data - 2");
                            return;
                        }
                        this.dataError = null;
                        let args = {};
                        let i=0;
                        for (let s of this.sources) {
                            let sData = datas[i];
                            let metadata = {foundTime:sData.foundTime};
                            if (sData.metadata && sData.metadata.modelExecution) {
                                metadata.modelExecution = sData.metadata.modelExecution;
                            }
                            this.metadatas[s.code] = metadata;
                            if (sData.nrows != foundBox.nrows || sData.ncols != foundBox.ncols) {
                                console.error("Estructura de respuesta inválida");
                                console.error("  Esperado: (" + foundBox.nrows + ", " + foundBox.ncols + ")");
                                console.error("  Recibido: (" + sData.nrows + ", " + sData.ncols + ")");
                                this.dataError = "Datos Incompatibles";
                                this.resolving = false;
                                reject("Datos incompatibles");
                                return;
                            }
                            sourcesData[s.code] = sData;
                            window["min_" + s.code] = sData.min;
                            args["min_" + s.code] = sData.min;
                            window["max_" + s.code] = sData.max;
                            args["max_" + s.code] = sData.max;
                            i++;                                
                        }
                        window["rgbEncode"] = function(r, g, b) {
                            r = parseInt(256 * r); g = parseInt(256 * g); b = parseInt(256 * b);
                            r = Math.min(r, 255); g = Math.min(g, 255); b = Math.min(b, 255);
                            return 65536 * r + 256 * g + b;
                        }
                        args["rgbEncode"] = window["rgbEncode"];
                        window["rgbaEncode"] = function(r, g, b, a) {
                            r = parseInt(256 * r); g = parseInt(256 * g); b = parseInt(256 * b); a = parseInt(100 * a); 
                            r = Math.min(r, 255); g = Math.min(g, 255); b = Math.min(b, 255); a = Math.min(a, 99);
                            let v = 65536 * 256 * r + 65536 * g + 256 * b + a;
                            return v;
                        }
                        window["rgbaEncode"]
                        // Construir matriz de resultados
                        let z = eval(this.formula + "\n(z)");
                        let minDataLng, maxDataLng, minDataLat, maxDataLat;
                        for (let r=0; r<foundBox.nrows; r++) {
                            let row = [];
                            for (let c=0; c<foundBox.ncols; c++) {
                                let lat = foundBox.lat0 + r * foundBox.dLat;
                                let lng = foundBox.lng0 + c * foundBox.dLng;
                                // Llenar variables globales
                                window["lat"] = lat;
                                args.lat = lat;
                                window["lng"] = lng;
                                args.lng = lng;
                                for (let s of this.sources) {
                                    let sRows = sourcesData[s.code].rows;
                                    let ndv = undefined;
                                    if (sourcesData[s.code].metadata) ndv = sourcesData[s.code].metadata.noDataValue;
                                    let v = sRows[r][c];
                                    if (v == ndv) v = null;
                                    window[s.code] = v;
                                    args[s.code] = v;
                                }
                                let v;
                                try {
                                    v = z(args);
                                } catch(error) {
                                    this.dataError = "Error en Fórmula:" + error.toString();
                                    this.resolving = false;
                                    reject(this.dataError);
                                    return;
                                }
                                if (v !== null && v !== undefined) {
                                    min = min === undefined || v < min?v:min;
                                    max = max === undefined || v > max?v:max;
                                    minDataLng = minDataLng === undefined || lng < minDataLng?lng:minDataLng;
                                    maxDataLng = maxDataLng === undefined || lng > maxDataLng?lng:maxDataLng;
                                    minDataLat = minDataLat === undefined || lat < minDataLat?lat:minDataLat;
                                    maxDataLat = maxDataLat === undefined || lat > maxDataLat?lat:maxDataLat;
                                }
                                row.push(v);
                            }
                            rows.push(row);
                        }
                        this.ret = {
                            min, max, foundBox, rows, nrows:foundBox.nrows, ncols:foundBox.ncols, dataBox:{
                                w: minDataLng, n: maxDataLat, e: maxDataLng, s: minDataLat
                            }
                        }
                        this.resolving = false;
                        resolve(this.ret);
                    })
            }),
            controller:{
                abort:() => {
                    console.log("Formula Abort");
                    for (let c of controllers) c.abort();
                }
            }
        }
    }

    resolveServerJSPoint(foundBox) {
        // Preparar sources para servidor
        let sources = [];                
        for (let s of this.sources) {
            sources.push({
                code:s.code, variable:s.variable.code, dataSet:s.dataSet.code, time:s.time, level:s.level, 
                geoServer:s.geoServer.url
            })
        }

        // Seleccionar geoserver
        let geoServer;
        if (!this.sources.length) geoServer = window.geoos.geoServers[0];
        else geoServer = this.sources[0].geoServer;

        let {promise, controller} = geoServer.client.formula(this.formulaType, this.formula, sources, window.geoos.time, foundBox.lat1, foundBox.lng0, foundBox.lat0, foundBox.lng1, foundBox.dLat, foundBox.dLng, foundBox.nrows, foundBox.ncols);
        return {
            promise:new Promise((resolve, reject) => {
                promise.then(ret => {
                    this.metadatas = ret.metadatas;
                    this.ret = ret;
                    resolve(ret);
                }).catch(error => {
                    console.error("Formula Error", error);
                    this.dataError = error.toString();
                    reject(error);
                }).finally(_ => this.resolving = false);
            }),
            controller:{
                abort:() => {
                    console.log("formula controller aborted");
                    controller.abort();
                }
            }
        }
    }

    resolveIsolines(_autoIncrement, _increment, _fixedLevels) {
        let {promise, controller} = this.resolveFormula();
        let newProm = new Promise((resolve, reject) => {
            promise.then(ret => {
                if (!ret) {
                    reject("No Data");
                    return;
                }
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
                // Verificar que hay datos diferentes a nulo
                if (ret.dataBox.n === undefined || ret.dataBox.n == ret.dataBox.s) {
                    reject("No Data Box"); return;
                }
                if (ret.dataBox.w === undefined || ret.dataBox.w == ret.dataBox.e) {
                    reject("No Data Box"); return;
                }

                // Crear coleccione de features como puntos desde la grilla retornada 
                let featureCollection = [];
                for (let r=0; r < ret.nrows; r++) {
                    let lat = ret.foundBox.lat0 + r * ret.foundBox.dLat;
                    for (let c=0; c<ret.ncols; c++) {
                        let lng = ret.foundBox.lng0 + c * ret.foundBox.dLng;
                        if (lng >= ret.dataBox.w && lng <= ret.dataBox.e && lat >= ret.dataBox.s && lat <= ret.dataBox.n) {
                            featureCollection.push({
                                type: "Feature", 
                                geometry: {type:"Point", coordinates: [lng, lat]                                                },
                                properties: {z:ret.rows[r][c]}
                            })
                        }
                    }
                }
                let geoJson = {type:"FeatureCollection", name:"grid", features: featureCollection}

                // Workaround: Cuando hay un solo nivel, no retorna nada. Se repite el primero
                levels.splice(0,0,levels[0]);
                let lines = turf.isolines(geoJson, levels, {zProperty:"z"});
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
                    min, max, increment,
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