class IsolinesRasterVisualizer extends RasterVisualizer {
    static applyToLayer(layer) {
        if (layer instanceof GEOOSRasterFormulaLayer) return true;
        return layer.variable && layer.variable.queries.includes("isolines");
    }

    constructor(layer, config) {
        super(layer);        
        config = config || {};
        if (config.autoIncrement === undefined) config.autoIncrement = true;
        if (config.lineWidth === undefined) config.lineWidth = 1;
        if (config.lineColor === undefined) config.lineColor = "#000000"        
        this.config = config;
        if (layer instanceof GEOOSRasterFormulaLayer) {
            this.isFormula = true;
        } else {
            this.query = new RasterQuery(this.layer.geoServer, this.layer.dataSet, this.layer.variable, "isolines");
        }
        this.aborter = null;
    }
    get code() {return "isolines"}
    get name() {return "Isolineas"}
    get autoIncrement() {return this.config.autoIncrement?true:false}
    set autoIncrement(a) {this.config.autoIncrement = a; this.startQuery()}
    get increment() {return this.config.increment}
    set increment(i) {this.config.increment = i; this.startQuery()}
    get lineWidth() {return this.config.lineWidth}
    set lineWidth(w) {this.config.lineWidth = w; this.update()}
    get lineColor() {return this.config.lineColor}
    set lineColor(c) {this.config.lineColor = c; this.update()}
    get fixedLevels() {return this.config.fixedLevels?this.config.fixedLevels:""}
    set fixedLevels(l) {this.config.fixedLevels = l; this.startQuery()}

    async create() {
        this.visualizer = this.layer.konvaLeafletLayer.addVisualizer(this.code, new GeoJsonVisualizer({
            zIndex:3,
            onBeforeUpdate: _ => {this.startQuery(); return false},
            lineStyle:f => ({stroke:this.lineColor, strokeWidth:this.lineWidth, hitStrokeWidth:0, perfectDrawEnabled:false, listenning:false, tension:0.2}),
            markerLabel:m => "" + (m.value)
        }));
        this.timeChangeListener = _ => {
            if (this.isFormula) {
                this.refresh();
                return;
            }
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
        let promise_1, controller_1;
        if (this.query) {
            let {promise, controller} = this.query.query({increment:this.autoIncrement?undefined:this.increment, fixedLevels:this.fixedLevels ,level:this.layer.level});
            promise_1 = promise;
            controller_1 = controller;
        } else {
            let {promise, controller} = this.layer.resolveIsolines(this.autoIncrement, this.increment, this.fixedLevels);
            promise_1 = promise;
            controller_1 = controller;
        }
        this.aborter = controller_1;
        let visualizer = this.layer.konvaLeafletLayer.getVisualizer(this.code)
        promise_1
            .then(ret => {
                let modelTime = ret.metadata && ret.metadata.modelExecution?ret.metadata.modelExecution.formatted:null;
                this.aborter = null;
                this.finishWorking(ret.foundTime?ret.foundTime.msUTC:null, null, modelTime);
                if (this.autoIncrement) this.config.increment = ret.increment;
                window.geoos.events.trigger("visualizer", "results", this);
                visualizer.setGeoJson(ret.geoJson, ret.markers.length < 1000?ret.markers:null);
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
            code:"isolines-properties", name:"Configurar Isolineas", path:"./layers/visualizers/IsolinesProperties"
        }, {
            code:"fixed-levels-properties", name:"Extraer Niveles Fijos", path:"./layers/visualizers/FixedLevelsProperties"
        }]
    }
}

RasterVisualizer.registerVisualizerClass("isolines", IsolinesRasterVisualizer);