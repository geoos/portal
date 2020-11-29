class GEOOSUserObjectsLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
        this.id = "user-objects";
        this.objects = [];
    }

    serialize() {
        let l = super.serialize();
        l.type = "user-objects";
        l.objects = this.objects.maps(o => o.serialize())
        return l;
    }
    static deserialize(s, config) {
        let layer = new GEOOSStationsLayer(config);
        layer.id = s.id;
        layer.objects = s.objects.map(o => GEOOSUserObject.deserialize(o, layer));
        return layer;
    }

    get minZDimension() {return null}

    getUserObjects() {return this.objects}
    addUserObject(o, silent) {        
        this.objects.push(o);
        o.layer = this;
        if (!silent) this.refresh();        
    }
    removeUserObject(id, silent) {
        let idx = this.objects.findIndex(o => (o.id == id));
        if (idx < 0) throw "No se encontró el objeto " + id;
        this.objects.splice(idx, 1);
        if (!silent) this.refresh();
    } 

    async create() {
        this.objectSelectedListener = selection => {
            //if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }
        this.objectUnselectedListener = selection => {
            //if (selection.layer.id == this.id) this.konvaLeafletLayer.getVisualizer("geoJsonTiles").redraw();
        }
        this.timeChangeListener = _ => {
            this.refresh();
        }
        this.watchersChangeListener = _ => this.konvaLeafletLayer.getVisualizer("legends").update()

        window.geoos.events.on("map", "objectSelected", this.objectSelectedListener);
        window.geoos.events.on("map", "objectUnselected", this.objectUnselectedListener);
        window.geoos.events.on("portal", "timeChange", this.timeChangeListener);
        window.geoos.events.on("watcher", "watcherDeleted", this.watchersChangeListener);
        window.geoos.events.on("watcher", "results", this.watchersChangeListener);
        

        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        this.konvaLeafletLayer = new KonvaLeafletLayer(window.geoos.map, null, null, {pane:this.pane.id});
        this.konvaLeafletLayer.addTo(window.geoos.map);
        
        this.konvaLeafletLayer.addVisualizer("user-objects", new UserObjectsVisualizer({
            zIndex:1,
            interactions:window.geoos.interactions,
            getObjects: _ => (this.objects),
            onmouseover: object => {
                let name = object.name, lat = object.lat, lng = object.lng;
                if (name !== undefined && lat !== undefined && lng !== undefined) {
                    this.konvaLeafletLayer.getVisualizer("legends").setContextLegend(lat, lng, name);                    
                } else {
                    this.konvaLeafletLayer.getVisualizer("legends").unsetContextLegend();
                }
                window.geoos.mapPanel.mapContainer.view.style.cursor = "crosshair";
            },
            onmouseout: object => {
                this.konvaLeafletLayer.getVisualizer("legends").unsetContextLegend();
                window.geoos.mapPanel.mapContainer.view.style.removeProperty("cursor");
            },
            onclick:object => window.geoos.selectObject({
                type:"user-object", code:object.id, name:object.name, layer:this, minZDimension:null,
                lat:object.lat, lng:object.lng
            }),
            onmove:object => {
                window.geoos.mapPanel.ignoreNextClick = true;
                this.repaint();
                object.refreshWatchers();
                window.geoos.events.trigger("userObject", "moved", object.id);
            }
        }));    
        this.konvaLeafletLayer.addVisualizer("legends", new LegendsVisualizer({
            zIndex:2,
            getFlagPoints:_ => {
                // point: {lat, lng, watching:[{label:string, color:string}, ...]}
                let points = [];
                for (let uo of this.objects) {
                    if (uo.watchers && uo.watchers.length) {
                        let watching = [];
                        for (let w of uo.watchers) {
                            let r = uo.watcherResults[w.id];
                            if (!r.aborter && r.results && r.results.length) {
                                let v = r.results[0];
                                watching.push({
                                    label:w.name + ":" + window.geoos.formatNumber(v.resultado, w.decimals, w.unit),
                                    color:"white"
                                });   
                            }
                        }
                        if (watching.length) {
                            let center = uo.getCenter();
                            points.push({lat:center.lat, lng:center.lng, watching:watching})
                        }
                    }
                }
                return points;            
            }            
        }));   
    }
    async destroy() {  
        window.geoos.events.remove(this.objectSelectedListener);
        window.geoos.events.remove(this.objectUnselectedListener);
        window.geoos.events.remove(this.timeChangeListener);
        window.geoos.events.remove(this.watchersChangeListener);
        if (!this.konvaLeafletLayer) return;
        this.konvaLeafletLayer.removeVisualizer("legends");
        this.konvaLeafletLayer.removeVisualizer("user-objects");
        this.konvaLeafletLayer.removeFrom(window.geoos.map);
        window.geoos.mapPanel.destroyPanelFromLayer(this);
        this.konvaLeafletLayer = null;
    }

    async refresh() {        
        this.repaint();
        this.objects.forEach(o => o.refreshWatchers());
    }

    repaint() {
        if (!this.konvaLeafletLayer) return;
        this.konvaLeafletLayer.getVisualizer("user-objects").update();
        this.konvaLeafletLayer.getVisualizer("legends").unsetContextLegend();
        this.konvaLeafletLayer.getVisualizer("legends").update();
    }

    reorder() {
        window.geoos.mapPanel.adjustPanelZIndex(this);
    }

    getItems() {
        return this.objects.map(o => ({
            type:"user-object",
            code:o.id,
            icon:"img/icons/" + o.type + ".svg",
            name:o.name
        }))
    }

    getPropertyPanels() {
        let panels = super.getPropertyPanels();
        return panels;
    }
}

class GEOOSUserObject {
    constructor(type, id, name) {
        if (!id) id = type + "_" + parseInt(Math.random() * 9999999999);
        if (!name) {
            let idx = 1, baseName = type.substr(0,1).toUpperCase() + type.substr(1);            
            while (window.geoos.getUserObjects().find(o => (o.name == (baseName + " " + idx)))) idx++; 
            name = baseName + " " + idx;            
        }
        this.type = type; this.id = id; this.name = name;
        this.watchers = []
        this.watcherResults = {}
        this.analysisConfig = {analyzerCode:"time-serie", "time-serie":{
            code:"time-serie", watcher1:{type:"raster", id:"default", format:"time-serie", geoServer:"geoos-main", dataSet:"noaa-gfs4", variable:"TMP_2"}}
        }
    }

    getKonvaElements(visualizer) {
        return {elements:[], interactionElements:[]};        
    }
    getPropertyPanels() {
        return [{
            code:"user-object-properties", name:"Propiedades del Objeto", path:"./userObjects/UserObjectProperties"
        }, {
            code:"user-object-watchers", name:"Observar Variables", path:"./userObjects/UOWatchers"
        }]
    }
    getCenter() {throw "getCenter not overritten for object"}

    getWatcher(id) {
        return this.watchers.find(w => (w.id == id));
    }
    addWatchers(watchers) {
        for (let w of watchers) {
            w.layer = this.layer;
            w.userObject = this;
            this.watchers.push(w);
            this.watcherResults[w.id] = {aborter:null, results:null}
            this.refreshWatcher(w.id)
        }
    }
    deleteWatcher(id) {
        let idx = this.watchers.findIndex(w => (w.id == id));
        if (idx >= 0) this.watchers.splice(idx);
        delete this.watcherResults[id];
        window.geoos.events.trigger("watcher", "watcherDeleted", id);
    }    
    cancelWatcher(id) {
        let r = this.watcherResults[id];
        if (!r) throw "Invalid Watcher:" + id;
        let w = this.getWatcher(id);
        if (!w) throw "Watcher not found:" + id;
        if (r.aborter) {
            r.aborter.abort();
            r.aborter = null;
        }
        r.results = null;
    }
    refreshWatchers() {
        for (let w of this.watchers) this.refreshWatcher(w.id);
    }
    refreshWatcher(id) {
        this.cancelWatcher(id);
        let r = this.watcherResults[id];
        if (!r) throw "Invalid Watcher:" + id;
        let watcher = this.getWatcher(id);
        this.resolveRasterWatcher(watcher, r)
            .then(_ => {
                window.geoos.events.trigger("watcher", "results", watcher);
            }).catch(err => console.error(err));
    }
    async resolveRasterWatcher(w, r) {
        this.layer.startWorking();
        r.results = null;
        let center = this.getCenter();
        let v;
        try {
            let {promise, controller} = await w.query({format:"valueAtPoint", lat:center.lat, lng:center.lng});
            r.aborter = controller;
            let res = await promise;
            if (res) v = res.value;
            r.aborter = null;
        } catch(error) {            
            console.error(error);
            this.layer.finishWorking();
            return;
        }
        this.layer.finishWorking();
        r.results = [{_id:this.id, resultado:v}];
    }
}

class GEOOSUserObjectPoint extends GEOOSUserObject {
    constructor(id, name, lat, lng) {
        super("point", id, name);
        this.lat = lat; this.lng = lng;
    }
    getKonvaElements(visualizer) {
        let {elements, interactionElements} = super.getKonvaElements();
        let p = visualizer.toCanvas({lat:this.lat, lng:this.lng});
        let opts = {radius:8, fill:"green", stroke:"black", strokeWidth:1};
        opts.x = p.x; opts.y = p.y;
        let element =  new Konva.Circle(opts);
        elements.push(element);

        if (visualizer.interactions) {
            opts.draggable = true;
            opts.listening = true;
            delete opts.fill;
            let interElement = new Konva.Circle(opts);
            interactionElements.push(interElement);            
        }

        return {elements, interactionElements}
    }

    getCenter() {return {lat:this.lat, lng:this.lng}}
}