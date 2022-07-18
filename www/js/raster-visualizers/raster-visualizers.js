class RasterVisualizer {
    static registerVisualizerClass(code, visualizerClass) {
        if (!RasterVisualizer.visualizers) RasterVisualizer.visualizers = {}
        RasterVisualizer.visualizers[code] = visualizerClass;
    }
    static createVisualizersForLayer(layer) {
        let ret = [];
        Object.keys(RasterVisualizer.visualizers).forEach(code => {
            let vc = RasterVisualizer.visualizers[code];
            if (vc.applyToLayer(layer)) ret.push(new vc(layer))
        })
        ret.sort((v1, v2) => (v1.name > v2.name?1:-1));
        return ret;
    }

    constructor(layer) {
        this.layer = layer;
        this.active = layer.config.variable && layer.config.variable.options && layer.config.variable.options.initialVisualizers && layer.config.variable.options.initialVisualizers[this.code];
        this.working = false;
    }
    get type() {return "visualizer"}
    get code() {return "abstract"}
    get name() {return "Abstract Raster Visualizer"}

    async refresh() {throw "Abstract refresh in visualizer:" + this.code}

    serialize() {
        let v = {code: this.code, active:this.active}
        for (let key in this.config) v[key] = this.config[key];
        return v;
    }
    applyConfig(config) {
        this.config = config;
        this.active = config.active;
        // delete config.active;
        this.updateColorScale();
    }

    startWorking() {
        this.working = true;
        this.layer.startWorking();
    }
    finishWorking(dataTime, error, modelTime) {
        this.lastDataTime = dataTime?dataTime:null;
        this.lastModelTime = modelTime?modelTime:null;
        this.lastError = error?error:null;
        this.working = false;
        this.layer.finishWorking();
    }

    async activate() {
        this.active = true;
        if (this.layer.active && this.layer.group.active) await this.create();
        // Dispara evento para refrescar panel de escalas
        window.geoos.events.trigger("layer", "rename", this.layer);
    }
    async deactivate() {
        await this.destroy();
        this.active = false;
        // Dispara evento para refrescar panel de escalas
        window.geoos.events.trigger("layer", "rename", this.layer);
    }        
    async toggleActive() {
        if (this.active) await this.deactivate();
        else await this.activate();
    }

    async create() {console.warn("Abstract create in visualizer")}
    async destroy() {console.warn("Abstract destroy in visualizer")}
    getColorScale() {return this.config.colorScale}
    updateColorScale() {}
}