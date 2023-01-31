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
        this.tools = [];
        this.active = false;
        this.expanded = true;
    }

    serialize() {
        let s = {
            id:this.id, 
            name:this.name,
            config:this.config, 
            active:this.active, 
            expanded:this.expanded, 
            layers:this.layers.reduce((list, l) => ([...list, l.serialize()]) , []),
            tools:this.tools.reduce((list, tool) => ([...list, tool.serialize()]), []),
            selectedToolId:this.selectedToolId,
            timeStep:window.geoos.timePanel && window.geoos.timePanel.getTimeStep()
        }
        return s;
    } 
    static deserialize(s) {
        let g = new GEOOSGroup({name: s.name});
        g.id = s.id;
        g.active = false;
        g.expanded = s.expanded;
        g.layers = s.layers.reduce((list, layer) => {
            let l = GEOOSLayer.deserialize(layer);
            l.group = g;
            list.push(l);
            return list;
        }, []);
        g.tools = s.tools.reduce((list, tool) => {
            let t = GEOOSTool.deserialize(tool);
            list.push(t);
            return list;
        }, []);
        if (s.selectedToolId) g.selectedToolId = s.selectedToolId;        
        g.savedTimeStep = s.timeStep;

        return g;
    }


    get name() {return this.config.name}
    set name(n) {this.config.name = n}
    

    async activate() {
        this.active = true
        for (let layer of this.layers) {
            if (layer.active) await layer.create();
        }
        this.adjustOrder();
    }
    async deactivate() {
        for (let layer of this.layers) {
            await layer.destroy();
        }
        this.active = false
    }

    async addLayer(layer) {
        if (layer instanceof GEOOSStationsLayer) {
            // Mezclar estaciones
            let sl = this.getStationsLayer();
            if (!sl) sl = this.createStationsLayer();
            for (let p of layer.points) {
                sl.addStation(p.id, true);
            }
            setTimeout(_ => sl.refresh(), 200);
        } else {
            layer.group = this; 
            this.layers.splice(0,0, layer)
            if (this.active) await layer.create();
            this.adjustOrder();
        }
    }
    async removeLayer(id, dontCheckTools) {
        let layer = this.getLayer(id);
        if (this.active) await layer.destroy();
        this.layers.splice(layer.index, 1);
        this.adjustOrder();
        if (!dontCheckTools) await window.geoos.checkToolsValidity();
    }
    async removeAllLayers(dontCheckTools){
        let layers = this.layers;
        for (let layer of layers){
            if (this.active) await layer.destroy();
        }
        //if (this.active) await layer.destroy();
        this.layers = [];
        if (!dontCheckTools) await window.geoos.checkToolsValidity();
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

    getStationsLayer() {
        return this.layers.find(l => (l.id == "stations"));
    }
    /*
    getStationsLayer(code) {
        return this.layers.find(l => (l.id == code));
    }
    */

    createStationsLayer() {
        let l = new GEOOSStationsLayer({name:"Estaciones", opacity:100});
        // this.addLayer(l)
        l.group = this; 
        this.layers.splice(0,0, l)
        if (this.active) l.create();
        this.adjustOrder();
        return l;
    }
    removeStationsLayer() {
        this.removeLayer("stations");
    }
    /*
    removeStationsLayer(code) {
        this.removeLayer(code);
    }
    */
    getUserObjectsLayer() {
        return this.layers.find(l => (l.id == "user-objects"));
    }
    createUserObjectsLayer() {
        let l = new GEOOSUserObjectsLayer({name:"Objetos de Usuario", opacity:100});
        this.addLayer(l)
        return l;
    }
    removeUserObjectsLayer() {
        this.removeLayer("user-objects");
    }

    containsLayer(layerConfig) {
        if (layerConfig.type == "raster") {
            return this.layers.find(l => (l instanceof GEOOSRasterLayer && l.variable.code == layerConfig.variable.code))?true:false;
        } else if (layerConfig.type == "vector") {
            return this.layers.find(l => (l instanceof GEOOSVectorLayer && l.file.name == layerConfig.file.name))?true:false;
        } else if (layerConfig.type == "tiles") {
            return this.layers.find(l => (l instanceof GEOOSTilesLayer && l.map.name == layerConfig.map.name))?true:false;
        } else if (layerConfig.type == "stations") {
            return this.getStationsLayer()?true:false;
        } else if (layerConfig.type == "rasterFormula") {
            return false;
        } else if (layerConfig.type == "minz") {
            return false;
        } else if (layerConfig.type == "multimedia") {
            return this.layers.find(l => (l instanceof GEOOSMultimediaLayer && l.config.code == layerConfig.code))?true:false;
        } else if (layerConfig.type == "monstations") {
            return this.layers.find(l => (l instanceof GEOOSMonStationsLayer && l.config.code == layerConfig.code))?true:false;
        } else throw "layer type '" + layerConfig.type + "' not handled yet in 'containsLayer'"
    }

    getPropertyPanels() {
        return [{
            code:"group-properties", name:"Propiedades del Grupo", path:"./groups/GroupProperties"
        }]
    }

    regenerateIds() {
        this.id = generateId();
        for (let layer of this.layers) {
            layer.regenerateIds();
        }
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
        } else if (layerConfig.type == "vector") {
            let config = {
                name: layerConfig.name,
                file: layerConfig.file,
                geoServer: layerConfig.geoServer,
                dataSet: layerConfig.dataSet
            }
            return new GEOOSVectorLayer(config);
        } else if (layerConfig.type == "tiles") {
            let config = {
                name: layerConfig.name,
                map: layerConfig.map,
                geoServer: layerConfig.geoServer,
                dataSet: layerConfig.dataSet
            }
            return new GEOOSTilesLayer(config);
        } else if (layerConfig.type == "multimedia") {
            let config = {
                code: layerConfig.code,
                name: layerConfig.name,
                tolerancia: layerConfig.tolerancia?(JSON.parse(JSON.stringify(layerConfig.tolerancia))):null
            }
            return new GEOOSMultimediaLayer(config);
        } else if (layerConfig.type == "rasterFormula") {
            let config = {
                name: layerConfig.name
            }
            return new GEOOSRasterFormulaLayer(config);
        } else if (layerConfig.type == "stations") {
            let config = {
                name: layerConfig.name,
                opacity:100                
            }
            return new GEOOSStationsLayer(config)
        } else if (layerConfig.type == "monstations") {
            layerConfig.opacity = 100;
            return new GEOOSMonStationsLayer(layerConfig)
        }
        throw "Layer type '" + layerConfig.type + "' not yet handled"
    }
    constructor(config) {
        this.id = generateId();
        config.opacity = config.opacity === undefined?80:config.opacity;
        this.config = config;
        this.active = true;
        this.expanded = true;
        this.nWorking = 0;
    }
    get name() {return this.config.name}
    set name(n) {this.config.name = n}
    get index() {return this.group.getIndexOfLayer(this)}
    get isWorking() {return this.nWorking > 0}
    get opacity() {return this.config.opacity}
    set opacity(o) {
        this.config.opacity = o;
        window.geoos.mapPanel.adjustOpacity(this);
    }
    get options() {throw "options property not overriten for layer " + this.name}

    serialize() {
        return {
            id:this.id,
            name:this.name,
            opacity:this.opacity,
            expanded:this.expanded,
            active: this.active        
        }
    }
    static deserialize(s) {
        let config = {name:s.name, opacity:s.opacity, expanded:s.expanded, active:s.active}
        if (s.type == "raster") {            
            return GEOOSRasterLayer.deserialize(s, config);
        } else if (s.type == "rasterFormula") {
            return GEOOSRasterFormulaLayer.deserialize(s, config);
        } else if (s.type == "vector") {
            return GEOOSVectorLayer.deserialize(s, config);
        } else if (s.type == "tiles") {
            return GEOOSTilesLayer.deserialize(s, config);
        } else if (s.type == "stations") {
            return GEOOSStationsLayer.deserialize(s, config);
        } else if (s.type == "multimedia") {
            return GEOOSMultimediaLayer.deserialize(s, config);
        } else if (s.type == "user-objects") {
            return GEOOSUserObjectsLayer.deserialize(s, config);
        }
        throw "Layer type '" + s.type + "' not yet handled"
    }

    async create() {console.warn("Abstract create for layer")}
    async destroy() {console.warn("Abstract destroy for layer")}
    reorder() {console.warn("Abstract reorder for layer")}

    getItems() {return null}
    async activate() {
        this.active = true;
        if (this.group.active) {
            await this.create();
            this.group.adjustOrder();
            window.geoos.events.trigger("layer", "activationChanged", this);
        }
    }
    async deactivate() {
        if (window.geoos.selectedObject && window.geoos.selectedObject.layer.id == this.id) await window.geoos.unselectObject();
        await this.destroy();
        this.active = false;
        this.group.adjustOrder();
        window.geoos.events.trigger("layer", "activationChanged", this);
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

    formatValue(v) {
        if (v === undefined || v === null) return "";
        return v.toLocaleString();
    }

    getDataState() {return ""}

    regenerateIds() {this.id = generateId()}
}