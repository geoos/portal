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
        this.active = false;
        this.working = false;
    }
    get type() {return "visualizer"}
    get code() {return "abstract"}
    get name() {return "Abstract Raster Visualizer"}

    startWorking() {
        this.working = true;
        this.layer.startWorking();
    }
    finishWorking() {
        this.working = false;
        this.layer.finishWorking();
    }

    async activate() {
        this.active = true;
        if (this.layer.active && this.layer.group.active) await this.create();
    }
    async deactivate() {
        await this.destroy();
        this.active = false;
    }        
    async toggleActive() {
        if (this.active) await this.deactivate();
        else await this.activate();
    }

    async create() {console.warn("Abstract create in visualizer")}
    async destroy() {console.warn("Abstract destroy in visualizer")}
}