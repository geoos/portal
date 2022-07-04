class WindyRasterVisualizer extends RasterVisualizer {
    static applyToLayer(layer) {
        return layer.variable && layer.variable.queries.includes("vectorsGrid");
    }

    constructor(layer, config) {
        super(layer);
        config = config || {};
        this.config = config;
        if (!this.config.colorScale) {
            if (layer.variable.options.colorScale) this.config.colorScale = JSON.parse(JSON.stringify(layer.variable.options.colorScale));
            else this.config.colorScale = {
                name:"Open Weather - Wind", auto:true, clipOutOfRange:false
            }
        }
        if (!this.config.lineWidth) this.config.lineWidth = 1;
        if (!this.config.nParticles) this.config.nParticles = 1500;
        if (!this.config.speed) this.config.speed = 0.7;
        this.config.colorScale.unit = layer.variable.unit;
        this.query = new RasterQuery(this.layer.geoServer, this.layer.dataSet, this.layer.variable, "vectors");
        this.aborter = null;
        this.createColorScale();
    }
    get code() {return "windy"}
    get name() {return "Partículas"}
    get colorScaleConfig() {return this.config.colorScale}

    get nParticles() {return this.config.nParticles}
    set nParticles(n) {
        this.config.nParticles = n;
        this.redraw();
    }
    get lineWidth() {return this.config.lineWidth}
    set lineWidth(w) {
        this.config.lineWidth = w;
        this.redraw();
    }
    get speed() {return this.config.speed}
    set speed(s) {
        this.config.speed = s;
        this.redraw();
    }

    createColorScale() {
        let scaleDef = window.geoos.scalesFactory.byName(this.colorScaleConfig.name);
        if (!scaleDef) throw "Can't find color scale '" + this.colorScaleConfig.name + "'";
        this.colorScale = window.geoos.scalesFactory.createScale(scaleDef, this.colorScaleConfig)
        if (this.limits) {
            this.colorScale.setRange(this.limits.min, this.limits.max);
        }
    }

    updateColorScale() {
        this.createColorScale();
        //this.update();
        this.redraw();
    }

    async create() {
        this.visualizer = this.layer.konvaLeafletLayer.addVisualizer(this.code, new WindyVisualizer({
            zIndex:3,
            onBeforeUpdate: _ => {this.startQuery(); return false},
            getColor:value => {
                return this.colorScale.getColor(value)
            },
            getNParticles: _ => (this.nParticles),
            getLineWidth: _ => (this.lineWidth),
            getSpeed: _ => (this.speed)
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
    redraw() {
        if (!this.layer || !this.layer.group) return;
        if (this.active && this.layer.active && this.layer.group.active) {
            this.layer.konvaLeafletLayer.getVisualizer(this.code).redraw();
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
                this.limits = {min:ret.min, max:ret.max}
                this.colorScale.setRange(ret.min, ret.max);
                window.geoos.events.trigger("visualizer", "results", this);
                visualizer.setWindyData(ret.foundBox, ret.min, ret.max, ret.rowsU, ret.rowsV, ret.nrows, ret.ncols);
            })
            .catch(err => {                
                this.aborter = null;
                if (err != "aborted" && err.toString().indexOf("abort") < 0) {
                    console.error(err);
                    this.finishWorking(null, err.toString());
                }
                //visualizer.setWindyData(null, null, null, null, null, null, null);
                visualizer.stopWindy();
            })
    }

    getPropertyPanels() {
        return [{
            code:"particles", name:"Configurar Partículas", path:"main/configPanel/layers/visualizers/ParticlesProperties"
        }, {
            code:"color-scale", name:"Escala de Colores", path:"./ColorScaleProperties"
        }]
    }

    getColorScale() {return this.colorScale}
}

RasterVisualizer.registerVisualizerClass("windy", WindyRasterVisualizer);