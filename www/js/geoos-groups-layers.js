function generateId(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    length = length || 20;
    let st = "";
    while (st.length < length) {
        st += chars[parseInt(Math.random() * chars.length)];
    }
    return st;
}

class GEOOSGroup {
    constructor(config) {
        this.id = generateId();
        this.config = config;
        this.layers = [];
        this.active = false;
        this.expanded = true;
    }

    get name() {return this.config.name}
    set name(n) {this.config.name = n}

    async activate() {
        this.active = true
        for (let layer of this.layers) {
            if (layer.active) await layer.create();
        }
    }
    async deactivate() {
        for (let layer of this.layers) {
            await layer.destroy();
        }
        this.active = false
    }

    async addLayer(layer) {
        layer.group = this; 
        this.layers.push(layer)
        if (this.active) await layer.create();
    }
    async removeLayer(id) {
        let layer = this.getLayer(id);
        if (this.active) await layer.destroy();
        this.layers.splice(layer.index, 1);
        this.adjustOrder();
    }
    async insertLayerAfter(layer, after) {
        layer.group = this; 
        let idx = after.index;
        this.layers.splice(idx + 1, 0, layer);
        if (this.active) await layer.create();
        this.adjustOrder();
    }
    async insertLayerAt0(layer) {
        layer.group = this; 
        this.layers.splice(0, 0, layer);
        if (this.active) await layer.create();
        this.adjustOrder();
    }
    adjustOrder() {
        if (!this.active) return;
        for (let layer of this.layers) {
            if(layer.active) layer.reorder();
        }
    }
    getLayer(id) {return this.layers.find(l => (l.id == id))}
    getIndexOfLayer(layer) {return this.layers.findIndex(l => (l.id == layer.id))}

    containsLayer(layerConfig) {
        if (layerConfig.type == "raster") {
            return this.layers.find(l => (l instanceof GEOOSRasterLayer && l.variable.code == layerConfig.variable.code))?true:false;
        } else throw "layer type '" + layerConfig.type + "' not handled yet in 'containsLayer'"
    }

    getPropertyPanels() {
        return [{
            code:"group-properties", name:"Propiedades del Grupo", path:"./groups/GroupProperties"
        }]
    }
}

class GEOOSLayer {
    static create(layerConfig) {
        if (layerConfig.type == "raster") {
            let config = {
                name: layerConfig.variable.name,
                variable: layerConfig.variable,
                geoServer: layerConfig.geoServer,
                dataSet: layerConfig.dataSet
            }
            return new GEOOSRasterLayer(config);
        }
        throw "Layer type '" + layerConfig.type + "' not yet handled"
    }
    constructor(config) {
        this.id = generateId();
        this.config = config;
        this.active = true;
        this.expanded = true;
        this.nWorking = 0;
    }
    get name() {return this.config.name}
    set name(n) {this.config.name = n}
    get index() {return this.group.getIndexOfLayer(this)}
    get isWorking() {return this.nWorking > 0}

    async create() {console.warn("Abstract create for layer")}
    async destroy() {console.warn("Abstract destroy for layer")}
    reorder() {console.warn("Abstract reorder for layer")}

    getItems() {return null}
    async activate() {
        this.active = true;
        if (this.group.active) await this.create();
    }
    async deactivate() {
        await this.destroy();
        this.active = false;
    }
    async toggleActive() {
        if (this.active) await this.deactivate();
        else await this.activate();
    }

    startWorking() {
        this.nWorking++;
        if (this.nWorking == 1) {
            window.geoos.events.trigger("layer", "startWorking", this);
        }
    }
    finishWorking() {
        this.nWorking--;
        if (this.nWorking == 0) {
            window.geoos.events.trigger("layer", "finishWorking", this);
        }
    }

    getPropertyPanels() {
        return [{
            code:"layer-properties", name:"Propiedades de la Capa", path:"./layers/LayerProperties"
        }]
    }
}

class GEOOSRasterLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
        this.visualizers = RasterVisualizer.createVisualizersForLayer(this);
    }

    get variable() {return this.config.variable}
    get geoServer() {return this.config.geoServer}
    get dataSet() {return this.config.dataSet}

    getVisualizer(code) {return this.visualizers.find(v => (v.code == code))}
    getItems() {return this.visualizers}

    async create() {
        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        this.konvaLeafletLayer = new KonvaLeafletLayer(window.geoos.map, null, null, {pane:this.pane.id});
        this.konvaLeafletLayer.addTo(window.geoos.map);
        for (let v of this.visualizers) {
            if (v.active) await v.create();
        }
    }
    async destroy() {
        if (!this.konvaLeafletLayer) return;
        for (let v of this.visualizers) {
            if (v.active) await v.destroy();
        }
        this.konvaLeafletLayer.removeFrom(window.geoos.map);
        window.geoos.mapPanel.destroyPanelFromLayer(this);
        this.konvaLeafletLayer = null;
    }
    reorder() {
        window.geoos.mapPanel.adjustPanelZIndex(this);
    }

}