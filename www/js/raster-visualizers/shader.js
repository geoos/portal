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
        let {promise, controller} = this.query.query({margin:1, level:this.layer.level});
        this.aborter = controller;
        let visualizer = this.layer.konvaLeafletLayer.getVisualizer(this.code)
        promise
            .then(ret => {
                this.aborter = null;
                this.finishWorking(ret.foundTime?ret.foundTime.msUTC:null);
                this.colorScale.setRange(ret.min, ret.max);
                window.geoos.events.trigger("visualizer", "results", this);
                visualizer.setGridData(ret.foundBox, ret.rows, ret.nrows, ret.ncols);
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
        return [{
            code:"color-scale", name:"Escala de Colores", path:"./ColorScaleProperties"
        }]
    }

    getColorScale() {return this.colorScale}
}

RasterVisualizer.registerVisualizerClass("shader", ShaderRasterVisualizer);