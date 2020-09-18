class IsobandsRasterVisualizer extends RasterVisualizer {
    static applyToLayer(layer) {
        return layer.variable.queries.includes("isobands");
    }

    constructor(layer, config) {
        super(layer);
        this.config = config;
        this.query = new RasterQuery(this.layer.geoServer, this.layer.dataSet, this.layer.variable, "isobands");
        this.aborter = null;
        this.colorScale = window.geoos.scalesFactory.createScale(window.geoos.scalesFactory.scaleDefs[0], {auto:true})
    }
    get code() {return "isobands"}
    get name() {return "Isobandas"}

    async create() {
        this.visualizer = this.layer.konvaLeafletLayer.addVisualizer(this.code, new GeoJsonVisualizer({
            zIndex:1,
            onBeforeUpdate: _ => {this.startQuery(); return false},
            polygonStyle:f => {
                let value = (f.properties.minValue + f.properties.maxValue) / 2;                
                return {fill:this.colorScale.getColor(value), opacity:1}
            }
        }));
        this.startQuery();
    }
    async destroy() {
        if (this.aborter) {
            this.aborter.abort();
            this.aborter = null;
        }
        this.layer.konvaLeafletLayer.removeVisualizer(this.code);
        this.visualizer = null;
    }
    startQuery() {
        if (this.aborter) {
            this.aborter.abort();
            this.finishWorking();
        }
        this.startWorking();
        let {promise, controller} = this.query.query({});
        this.aborter = controller;
        let visualizer = this.layer.konvaLeafletLayer.getVisualizer(this.code)
        promise
            .then(ret => {
                this.aborter = null;
                this.finishWorking();
                this.colorScale.setRange(ret.min, ret.max);
                visualizer.setGeoJson(ret.geoJson);
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
}

RasterVisualizer.registerVisualizerClass("isobands", IsobandsRasterVisualizer);