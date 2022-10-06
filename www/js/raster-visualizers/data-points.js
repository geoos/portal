class DataPointsVisualizerHelper extends RasterVisualizer {
    static applyToLayer(layer) {        
        return layer.variable && layer.variable.queries.includes("grid");
    }

    constructor(layer, config) {
        super(layer);
        config = config || {};
        this.config = config;
        this.query = new RasterQuery(this.layer.geoServer, this.layer.dataSet, this.layer.variable, "grid");
        this.aborter = null;
    }
    get code() {return "data-points"}
    get name() {return "Puntos con Datos"}

    async create() {
        this.visualizer = this.layer.konvaLeafletLayer.addVisualizer(this.code, new DataPointsVisualizer({
            zIndex:4,
            unit:this.layer.variable.unit,
            decimals: this.layer.variable.options && this.layer.variable.options.decimals !== undefined?this.layer.variable.options.decimals:2,
            interactions:window.geoos.interactions,
            onBeforeUpdate: _ => {this.startQuery(); return false}
        }));
        this.timeChangeListener = _ => {
            if (this.layer.config.dataSet.temporality != "none" && this.active) this.startQuery()
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
        if (this.active && this.layer.active && this.layer.group.active) {
            this.layer.konvaLeafletLayer.getVisualizer(this.code).update();
        }
    }
    startQuery(cb) {
        if (this.aborter) {
            this.aborter.abort();
            this.finishWorking();
        }
        this.startWorking();
        let {promise, controller} = this.query.query({margin:1, level:this.layer.level});
        this.aborter = controller;
        let visualizer = this.layer.konvaLeafletLayer.getVisualizer(this.code)
        promise
            .then(ret => {
                let modelTime = ret.metadata && ret.metadata.modelExecution?ret.metadata.modelExecution.formatted:null;
                this.aborter = null;
                window.geoos.events.trigger("visualizer", "results", this);
                visualizer.setGridData(ret.foundBox, ret.rows, ret.nrows, ret.ncols);
                this.finishWorking(ret.foundTime?ret.foundTime.msUTC:null, null, modelTime);
                if (cb) cb();
            })
            .catch(err => {
                this.aborter = null;
                if (err != "aborted" && err.toString().indexOf("abort") < 0) {
                    console.error(err);
                    this.finishWorking(null, err.toString());
                }
                visualizer.setGridData(null, null, null, null);
                if (cb) cb(err);
            })
    }

    getPropertyPanels() {
        return []
    }
}

RasterVisualizer.registerVisualizerClass("data-points", DataPointsVisualizerHelper);