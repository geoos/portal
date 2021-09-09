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
        let {tiempos, errores} = this.visualizers.reduce((listas, v) => {
            if (v.active) {
                listas.tiempos.push(v.lastDataTime);
                listas.errores.push(v.lastError);
            }
            return listas;
        }, {tiempos:[], errores:[]});
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
                if (!stEstado) stEstado = "Datos para " + fmt;
                else {
                    if (stEstado.indexOf(fmt) < 0) stEstado += ", " + fmt;
                }
            }
        }
        return stEstado || "Sin Información";
        return "No implementado";
    }
}