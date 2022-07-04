class IsobandsRasterVisualizer extends RasterVisualizer {
    static applyToLayer(layer) {
        return layer.variable && layer.variable.queries.includes("isobands");
    }

    constructor(layer, config) {
        super(layer);
        config = config || {};
        if (config.autoIncrement === undefined) config.autoIncrement = true;
        if (!config.colorScale) {
            if (layer.variable.options.colorScale) config.colorScale = layer.variable.options.colorScale;
            else config.colorScale = {
                name:"Verde a Rojo", auto:true, clipOutOfRange:false
            }            
        }
        config.colorScale.unit = layer.variable.unit;
        this.config = config;
        this.query = new RasterQuery(this.layer.geoServer, this.layer.dataSet, this.layer.variable, "isobands");
        this.aborter = null;
        this.createColorScale();
    }
    get code() {return "isobands"}
    get name() {return "Isobandas"}
    get autoIncrement() {return this.config.autoIncrement?true:false}
    set autoIncrement(a) {this.config.autoIncrement = a; this.startQuery()}
    get increment() {return this.config.increment}
    set increment(i) {this.config.increment = i; this.startQuery()}
    get colorScaleConfig() {return this.config.colorScale}
    get fixedLevels() {return this.config.fixedLevels?this.config.fixedLevels:""}
    set fixedLevels(l) {this.config.fixedLevels = l; this.startQuery()}

    createColorScale() {
        let scaleDef = window.geoos.scalesFactory.byName(this.colorScaleConfig.name);
        if (!scaleDef) throw "Can't find color scale '" + this.colorScaleConfig.name + "'";
        this.colorScale = window.geoos.scalesFactory.createScale(scaleDef, this.colorScaleConfig)
    }

    updateColorScale() {
        this.createColorScale();
        this.update();
    }

    async create() {
        this.visualizer = this.layer.konvaLeafletLayer.addVisualizer(this.code, new GeoJsonVisualizer({
            zIndex:1,
            onBeforeUpdate: _ => {this.startQuery(); return false},
            polygonStyle:f => {
                let value = (f.properties.minValue + f.properties.maxValue) / 2;                
                return {fill:this.colorScale.getColor(value), opacity:1}
            }
        }));
        this.timeChangeListener = _ => {
            if (this.layer.config.dataSet.temporality != "none") this.refresh()
        }
        window.geoos.events.on("portal", "timeChange", this.timeChangeListener);
        this.startQuery();
    }
    async destroy() {
        window.geoos.events.remove(this.timeChangeListener);
        if (this.aborter) {
            this.aborter.abort();
            this.aborter = null;
        }
        if (this.layer.konvaLeafletLayer) this.layer.konvaLeafletLayer.removeVisualizer(this.code);
        this.visualizer = null;
    }
    update() {
        if (!this.layer || !this.layer.group) return;
        if (this.active && this.layer.active && this.layer.group.active) {
            this.layer.konvaLeafletLayer.getVisualizer(this.code).update();
        }
    }
    refresh() {
        return new Promise((resolve, reject) => {
            if (!this.active) {resolve(); return}
            this.startQuery(err => {
                if (err) reject(err);
                else resolve();
            })
        })
    }
    startQuery(cb) {
        if (this.aborter) {
            this.aborter.abort();
            this.finishWorking();
        }
        this.startWorking();
        let {promise, controller} = this.query.query({increment:this.autoIncrement?undefined:this.increment, fixedLevels:this.fixedLevels, level:this.layer.level});
        this.aborter = controller;
        let visualizer = this.layer.konvaLeafletLayer.getVisualizer(this.code)
        promise
            .then(ret => {
                let modelTime = ret.metadata && ret.metadata.modelExecution?ret.metadata.modelExecution.formatted:null;
                this.aborter = null;
                this.finishWorking(ret.foundTime?ret.foundTime.msUTC:null, null, modelTime);
                if (this.autoIncrement) this.config.increment = ret.increment;
                this.colorScale.setRange(ret.min, ret.max);
                window.geoos.events.trigger("visualizer", "results", this);
                visualizer.setGeoJson(ret.geoJson);
                if (cb) cb();
            })
            .catch(err => {
                this.aborter = null;
                if (err != "aborted" && err.toString().indexOf("abort") < 0) {
                    console.error(err);
                    this.finishWorking(null, err.toString());
                }
                visualizer.setGeoJson(null);
                if (cb) cb(err);
            })
    }

    getPropertyPanels() {
        return [{
            code:"isobands-properties", name:"Configurar Isobandas", path:"./layers/visualizers/IsobandsProperties"
        }, {
            code:"color-scale", name:"Escala de Colores", path:"./ColorScaleProperties"
        }]
    }

    getColorScale() {return this.colorScale}
}

RasterVisualizer.registerVisualizerClass("isobands", IsobandsRasterVisualizer);