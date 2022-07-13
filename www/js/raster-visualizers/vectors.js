class VectorsRasterVisualizer extends RasterVisualizer {
    static applyToLayer(layer) {
        return layer.variable && layer.variable.queries.includes("vectorsGrid");
    }

    constructor(layer, config) {
        super(layer);
        config = config || {};
        if (!config.colorScale) {
            if (layer.variable.options.colorScale) config.colorScale = JSON.parse(JSON.stringify(layer.variable.options.colorScale));
            else config.colorScale = {
                name:"Open Weather - Wind", auto:true, clipOutOfRange:false
            }            
        }
        config.colorScale.unit = layer.variable.unit;
        this.config = config;
        this.query = new RasterQuery(this.layer.geoServer, this.layer.dataSet, this.layer.variable, "vectors");
        this.aborter = null;
        this.createColorScale();
    }
    get code() {return "vectors"}
    get name() {return "Vectores"}
    get colorScaleConfig() {return this.config.colorScale}

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
        this.visualizer = this.layer.konvaLeafletLayer.addVisualizer(this.code, new VectorsVisualizer({
            zIndex:4,
            onBeforeUpdate: _ => {this.startQuery(); return false},
            vectorColor:value => {
                return this.colorScale.getColor(value)
            }
        }));
        this.timeChangeListener = _ => {
            if (this.layer.config.dataSet.temporality != "none") this.startQuery()
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
    startQuery() {
        if (this.aborter) {
            this.aborter.abort();
            this.finishWorking();
        }
        this.startWorking();
        let {promise, controller} = this.query.query({margin:1});
        this.aborter = controller;
        let visualizer = this.layer.konvaLeafletLayer.getVisualizer(this.code)
        promise
            .then(ret => {
                let modelTime = ret.metadata && ret.metadata.modelExecution?ret.metadata.modelExecution.formatted:null;
                this.aborter = null;
                this.finishWorking(ret.foundTime?ret.foundTime.msUTC:null, null, modelTime);
                this.colorScale.setRange(ret.min, ret.max);
                window.geoos.events.trigger("visualizer", "results", this);
                visualizer.setVectorData(ret.foundBox, ret.rowsU, ret.rowsV, ret.nrows, ret.ncols);
            })
            .catch(err => {
                this.aborter = null;
                if (err != "aborted" && err.toString().indexOf("abort") < 0) {
                    console.error(err);
                    this.finishWorking(null, err.toString());
                }
                visualizer.setVectorData(null, null, null, null, null);
            })
    }

    getPropertyPanels() {
        return [{
            code:"color-scale", name:"Escala de Colores", path:"./ColorScaleProperties"
        }]
    }

    getColorScale() {return this.colorScale}
}

RasterVisualizer.registerVisualizerClass("vectors", VectorsRasterVisualizer);