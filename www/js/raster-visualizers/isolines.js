class IsolinesRasterVisualizer extends RasterVisualizer {
    static applyToLayer(layer) {
        return layer.variable.queries.includes("isolines");
    }

    constructor(layer, config) {
        super(layer);
        this.config = config;
        this.query = new RasterQuery(this.layer.geoServer, this.layer.dataSet, this.layer.variable, "isolines");
        this.aborter = null;
    }
    get code() {return "isolines"}
    get name() {return "Isolineas"}

    async create() {
        this.visualizer = this.layer.konvaLeafletLayer.addVisualizer(this.code, new GeoJsonVisualizer({
            zIndex:3,
            onBeforeUpdate: _ => {this.startQuery(); return false},
            lineStyle:{stroke:"black", strokeWidth:1.2, hitStrokeWidth:0, perfectDrawEnabled:false, listenning:false, tension:0.2},
            markerLabel:m => (m.value)
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
                visualizer.setGeoJson(ret.geoJson, ret.markers.length < 1000?ret.markers:null);
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

RasterVisualizer.registerVisualizerClass("isolines", IsolinesRasterVisualizer);