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

    serialize() {
        return {
            id:this.id, 
            name:this.name,
            config:this.config, 
            active:this.active, 
            expanded:this.expanded, 
            layers:this.layers.reduce((list, l) => {list.push(l.serialize()); return list}, [])
        }
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
        }, [])    
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
        layer.group = this; 
        this.layers.push(layer)
        if (this.active) await layer.create();
        this.adjustOrder();
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
        } else if (layerConfig.type == "vector") {
            return this.layers.find(l => (l instanceof GEOOSVectorLayer && l.file.name == layerConfig.file.name))?true:false;
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
        } else if (layerConfig.type == "vector") {
            let config = {
                name: layerConfig.name,
                file: layerConfig.file,
                geoServer: layerConfig.geoServer,
                dataSet: layerConfig.dataSet
            }
            return new GEOOSVectorLayer(config);
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
        } else if (s.type == "vector") {
            return GEOOSVectorLayer.deserialize(s, config);
        }
        throw "Layer type '" + layerConfig.type + "' not yet handled"
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
        }
    }
    async deactivate() {
        if (window.geoos.selectedObject && window.geoos.selectedObject.layer.id == this.id) await window.geoos.unselectObject();
        await this.destroy();
        this.active = false;
        this.group.adjustOrder();
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
}

class GEOOSRasterLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
        this.visualizers = RasterVisualizer.createVisualizersForLayer(this);
        if (this.variable.levels && this.variable.levels.length) {
            this._level = this.variable.options.defaultLevel;
            if (this._level === undefined) this._level = 0;
        }
    }

    get variable() {return this.config.variable}
    get geoServer() {return this.config.geoServer}
    get dataSet() {return this.config.dataSet}
    get level() {return this._level}
    set level(l) {this._level = l; this.refresh()}

    serialize() {
        let l = super.serialize();
        l.type = "raster";        
        l.variable = this.variable.code;
        l.geoServer = this.geoServer.code;
        l.dataSet = this.dataSet.code;
        if (this._level !== undefined) l.level = this._level;
        l.visualizers = this.visualizers.reduce((list, v) => {list.push(v.serialize()); return list}, [])
        return l;
    }
    static deserialize(s, config) {
        config.geoServer = window.geoos.getGeoServer(s.geoServer);
        if (!config.geoServer) throw "GeoServer '" + s.geoServer + "' is not available";
        config.dataSet = config.geoServer.dataSets.find(ds => ds.code == s.dataSet);
        if (!config.dataSet) throw "DataSet '" + s.dataSet + "' is no available in GeoServer '" + s.geoServer + "'";
        config.variable = config.dataSet.variables.find(v => v.code == s.variable);
        if (!config.variable) throw "Variable '" + s.variable + "' is no available in DataSet '" + s.dataSet + "' in GeoServer '" + s.geoServer + "'";
        let layer = new GEOOSRasterLayer(config);
        layer.id = s.id;
        if (s.level !== undefined) layer._level = s.level;
        layer.visualizers.forEach(v => {
            let vConfig = s.visualizers.find(vis => vis.code == v.code);
            if (vConfig) v.applyConfig(vConfig)
        });
        return layer;
    }

    getVisualizer(code) {return this.visualizers.find(v => (v.code == code))}
    getItems() {return this.visualizers}

    formatValue(v) {
        if (v === undefined || v === null) return "";
        return this.geoServer.client.formatValue(this.dataSet.code, this.variable.code, v, false);
    }

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

    async refresh() {
        if (!this.group.active || !this.active) return;
        let promises = [];
        this.visualizers.forEach(v => {
            if (v.active) promises.push(v.refresh())
        });
        await (Promise.all(promises))
    }
}

class GEOOSVectorLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
    }

    get file() {return this.config.file}
    get geoServer() {return this.config.geoServer}
    get dataSet() {return this.config.dataSet}
    
    serialize() {
        let l = super.serialize();
        l.type = "vector";
        l.file = this.file.name;
        l.geoServer = this.geoServer.code;
        l.dataSet = this.dataSet.code;
        return l;
    }
    static deserialize(s, config) {
        config.geoServer = window.geoos.getGeoServer(s.geoServer);
        if (!config.geoServer) throw "GeoServer '" + s.geoServer + "' is not available";
        config.dataSet = config.geoServer.dataSets.find(ds => ds.code == s.dataSet);
        if (!config.dataSet) throw "DataSet '" + s.dataSet + "' is no available in GeoServer '" + s.geoServer + "'";
        config.file = config.dataSet.files.find(f => f.name == s.file);
        if (!config.file) throw "File '" + s.file + "' is no available in DataSet '" + s.dataSet + "' in GeoServer '" + s.geoServer + "'";
        let layer = new GEOOSVectorLayer(config);
        layer.id = s.id;
        return layer;
    }

    async create() {
        this.objectSelectedListener = selection => {
            if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }
        this.objectUnselectedListener = selection => {
            if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }

        window.geoos.events.on("map", "objectSelected", this.objectSelectedListener);
        window.geoos.events.on("map", "objectUnselected", this.objectUnselectedListener);

        // Styles
        let getFeatureStyle = f => ({stroke:"black", strokeWidth:1});
        if (this.file.options && this.file.options.getFeatureStyle) {
            try {
                getFeatureStyle = eval(this.file.options.getFeatureStyle);
                if (getFeatureStyle instanceof Object) {
                    this.fixedStyle = getFeatureStyle;
                    getFeatureStyle = f => (this.fixedStyle)
                } else if (!(getFeatureStyle instanceof Function)) {
                    console.error("Invalid 'getFeatureStyle' option for file '" + this.file.name + "'. Must be a javascript object or function");
                    getFeatureStyle = null;
                }
             } catch(err) {
                console.error("Error parsing 'getFeatureStyle' for file '" + this.file.name + "'");
                console.warn(this.file.options.getFeatureStyle);
                console.error(err);
            }
        }
        let getSelectedFeatureStyle = f => ({stroke:"blue", strokeWidth:1.2, fill:"rgba(50, 50, 250, 0.4)"});
        if (this.file.options && this.file.options.getSelectedFeatureStyle) {
            try {
                getSelectedFeatureStyle = eval(this.file.options.getSelectedFeatureStyle);
                if (getSelectedFeatureStyle instanceof Object) {
                    this.fixedSelectedStyle = getSelectedFeatureStyle;
                    getSelectedFeatureStyle = f => (this.fixedSelectedStyle)
                } else if (!(getSelectedFeatureStyle instanceof Function)) {
                    console.error("Invalid 'getSelectedFeatureStyle' option for file '" + this.file.name + "'. Must be a javascript object or function");
                    getSelectedFeatureStyle = null;
                }
             } catch(err) {
                console.error("Error parsing 'getSelectedFeatureStyle' for file '" + this.file.name + "'");
                console.warn(this.file.options.getSelectedFeatureStyle);
                console.error(err);
            }
        }
        let getHoverFeatureStyle = f => ({stroke:"black", strokeWidth:1.2, fill:"rgba(50, 50, 250, 0.2)"});
        if (this.file.options && this.file.options.getHoverFeatureStyle) {
            try {
                getHoverFeatureStyle = eval(this.file.options.getHoverFeatureStyle);
                if (getHoverFeatureStyle instanceof Object) {
                    this.fixedHoverStyle = getHoverFeatureStyle;
                    getHoverFeatureStyle = f => (this.fixedHoverStyle)
                } else if (!(getHoverFeatureStyle instanceof Function)) {
                    console.error("Invalid 'getSelectedFeatureStyle' option for file '" + this.file.name + "'. Must be a javascript object or function");
                    getHoverFeatureStyle = null;
                }
             } catch(err) {
                console.error("Error parsing 'getSelectedFeatureStyle' for file '" + this.file.name + "'");
                console.warn(this.file.options.getSelectedFeatureStyle);
                console.error(err);
            }
        }
        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        this.hoveredId = null;
        this.konvaLeafletLayer = new KonvaLeafletLayer(window.geoos.map, null, null, {pane:this.pane.id});
        this.konvaLeafletLayer.addTo(window.geoos.map);
        this.konvaLeafletLayer.addVisualizer("geoJsonTiles", new VectorTilesVisualizer({
            zIndex:1,
            getTile: (z, x, y) => {
                let time;
                if (this.dataSet.temporality != "none") time = window.geoos.time;
                return this.geoServer.client.fileGeoJsonTile(this.dataSet.code, this.file.name, time, z, x, y);
            },
            getFeatureStyle: f => {                
                if (window.geoos.selectedObject && window.geoos.selectedObject.layer.id == this.id && window.geoos.selectedObject.objectId == f.tags.id) {
                    return getSelectedFeatureStyle(f)
                }
                if (f.tags.id == this.hoveredId) return getHoverFeatureStyle(f)
                else return getFeatureStyle(f)
            },
            onmouseover: f => {
                if (f.tags.id == this.hoveredId) return;
                this.hoveredId = f.tags.id;
                let name = f.tags.name, lat = f.tags.centroidLat, lng = f.tags.centroidLng;
                if (lat === undefined || lng === undefined) {
                    lat = f.tags.centerLat, lng = f.tags.centerLng;
                }
                if (name !== undefined && lat !== undefined && lng !== undefined) {
                    this.konvaLeafletLayer.getVisualizer("geoJsonTiles").setContextLegend(lat, lng, name);                    
                } else {
                    this.konvaLeafletLayer.getVisualizer("geoJsonTiles").unsetContextLegend();
                }
                this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
            },
            onmouseout: f => {
                this.hoveredId = null;
                this.konvaLeafletLayer.getVisualizer("geoJsonTiles").unsetContextLegend();
                this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
            },
            onclick:f => window.geoos.selectObject(this, f.tags.id)
        }));
        
    }
    async destroy() {  
        window.geoos.events.remove(this.objectSelectedListener);
        window.geoos.events.remove(this.objectUnselectedListener);      
        if (!this.konvaLeafletLayer) return;
        this.konvaLeafletLayer.removeVisualizer("geoJsonTiles");
        this.konvaLeafletLayer.removeFrom(window.geoos.map);
        window.geoos.mapPanel.destroyPanelFromLayer(this);
        this.konvaLeafletLayer = null;
    }

    async refresh() {
        if (this.metadataAborter) this.metadataAborter.abort();
        this.metadata = null;
        this.metadataAborter = null;
        this.konvaLeafletLayer.getVisualizer("geoJsonTiles").reset();
    }

    reorder() {
        window.geoos.mapPanel.adjustPanelZIndex(this);
    }

}