class ShaderRasterVisualizer extends RasterVisualizer {
    static applyToLayer(layer) {
        return layer.variable.queries.includes("grid");
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
        this.query = new RasterQuery(this.layer.geoServer, this.layer.dataSet, this.layer.variable, "grid");
        this.aborter = null;
        this.createColorScale();
    }
    get code() {return "shader"}
    get name() {return "Shader"}
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
        this.visualizer = this.layer.konvaLeafletLayer.addVisualizer(this.code, new ShaderVisualizer({
            zIndex:2,
            onBeforeUpdate: _ => {this.startQuery(); return false},
            pointColor:value => {
                let color = this.colorScale.getColor(value)
                return color;
            }
        }));
        this.startQuery();
    }
    async destroy() {
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
                this.aborter = null;
                this.finishWorking();
                this.colorScale.setRange(ret.min, ret.max);
                window.geoos.events.trigger("visualizer", "results", this);
                visualizer.setGridData(ret.foundBox, ret.rows, ret.nrows, ret.ncols);
            })
            .catch(err => {
                this.aborter = null;
                if (err != "aborted" && err.toString().indexOf("abort") < 0) {
                    console.error(err);
                    this.finishWorking();
                }
                visualizer.setGeoJson(null);
            })
    }

    getPropertyPanels() {
        return [{
            code:"color-scale", name:"Escala de Colores", path:"./ColorScaleProperties"
        }]
    }
}

RasterVisualizer.registerVisualizerClass("shader", ShaderRasterVisualizer);