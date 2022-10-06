class GEOOSUserObjectsLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
        this.id = "user-objects";
        this.objects = [];
    }

    serialize() {
        let l = super.serialize();
        l.type = "user-objects";
        l.objects = this.objects.map(o => o.serialize())
        return l;
    }
    static deserialize(s, config) {
        let layer = new GEOOSUserObjectsLayer(config);
        layer.id = s.id;
        layer.objects = s.objects.map(o => GEOOSUserObject.deserialize(o));
        layer.objects.forEach(o => o.layer = layer);
        return layer;
    }

    get minZDimension() {return null}

    getUserObjects() {
        return this.objects.reduce((list, uo) => {
            list.push(uo);
            return list.concat(uo.getChildren());
        }, [])
    }
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
            onmouseover: (object, subObjectInfo) => {
                let name = subObjectInfo.name, lat = subObjectInfo.center.lat, lng = subObjectInfo.center.lng;
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
            }
        }));    
        this.konvaLeafletLayer.addVisualizer("legends", new LegendsVisualizer({
            zIndex:2,
            getFlagPoints:_ => {
                // point: {lat, lng, watching:[{label:string, color:string}, ...]}
                let points = [];
                for (let uo of this.getUserObjects()) {
                    if (uo.watchers && uo.watchers.length) {
                        let watching = [];
                        for (let w of uo.watchers) {
                            let r = uo.watcherResults[w.id];
                            let color, label;
                            if (r.aborter) {color = "orange"; label = w.name + ": ...";}
                            else if (!r.results) {color = "orange"; label = w.name + ": S/D"}
                            else {
                                let v = r.results[0];
                                color = "white"; label = w.name + ":" + window.geoos.formatNumber(v.resultado, w.decimals, w.unit)
                            }
                            watching.push({label, color});   
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
        for (let o of this.objects) {
            await o.refresh();
        }
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
        return this.getUserObjects().map(o => ({
            type:"user-object",
            level:o.level,
            code:o.id,
            icon:"img/icons/" + o.type + ".svg",
            name:o.name
        }))
    }

    getPropertyPanels() {
        let panels = super.getPropertyPanels();
        return panels;
    }
    regenerateIds() {}

    setPainters(prePainter, postPainter) {
        this.konvaLeafletLayer.getVisualizer("user-objects").prePainter = prePainter;
        this.konvaLeafletLayer.getVisualizer("user-objects").postPainter = postPainter;
    }
}

class GEOOSUserObject {
    constructor(type, id, name, parentObject) {
        this.parentObject = parentObject;
        if (!id) id = type + "_" + parseInt(Math.random() * 9999999999);
        if (!name) {
            const baseNames = {point:"Punto", area:"Área"}
            let baseName = baseNames[type] || (type.substr(0,1).toUpperCase() + type.substr(1));
            let idx = 1; // baseName = type.substr(0,1).toUpperCase() + type.substr(1);            
            while (window.geoos.getUserObjects().find(o => (o.name == (baseName + " " + idx)))) idx++; 
            name = baseName + " " + idx;            
        }
        this.type = type; this.id = id; this.name = name;
        this.watchers = []
        this.watcherResults = {}
        this.analysisConfig = {analyzerCode:"time-serie", "time-serie":{
            code:"time-serie", watcher1:{type:"raster", id:"default", format:"time-serie", geoServer:"geoos-main", dataSet:"noaa-gfs4", variable:"TMP_2"}}
        }
        this.level = parentObject?parentObject.level+1:0;
    }
    static deserialize(s, parentObject) {
        let o;
        if (s.type == "point") o = GEOOSUserObjectPoint.deserialize(s, parentObject);
        else if (s.type == "area") o = GEOOSUserObjectArea.deserialize(s, parentObject);
        o.analysisConfig = s.analysisConfig;
        o.watchers = s.watchers.reduce((list, w) => ([...list, GEOOSQuery.deserialize(w)]), []);
        o.watcherResults = {};
        o.watchers.forEach(w => o.watcherResults[w.id] = {aborter:null, results:null})
        return o;
    }

    serialize() {
        let s = {id:this.id, type:this.type, name:this.name}
        s.watchers = this.watchers.reduce((list, w) => ([...list, w.serialize()]), []);
        s.analysisConfig = this.analysisConfig;
        return s;
    }

    get layer() {
        if (this._layer) return this._layer;
        return this.parentObject?this.parentObject.layer:null;
    }
    set layer(l) {this._layer = l}

    getChildren() {return []}
    getFinalObject(interactionObject) {return this}
    moved(userObjectsVisualizer, interactionObject, childObject) {throw "Moved not overriten"}
    positioned(lat, lng, childObject) {throw "Positioned not overriten"}
    getInteractionObjectInfo(interactionObject) {throw "getInteractionObjectInfo not overriten"}

    async refresh() {
        this.refreshWatchers();
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
            r.aborter = null;
            this.layer.finishWorking();
            return;
        }
        this.layer.finishWorking();
        r.results = [{_id:this.id, resultado:v}];
    }
}

class GEOOSUserObjectPoint extends GEOOSUserObject {
    constructor(id, name, lat, lng, parentObject) {
        super("point", id, name, parentObject);
        this.lat = lat; this.lng = lng;
    }

    static deserialize(s, parentObject) {
        return new GEOOSUserObjectPoint(s.id, s.name, s.lat, s.lng, parentObject);
    }

    getPropertyPanels() {
        return [{
            code:"point-object-properties", name:"Propiedades del Punto", path:"./userObjects/PointObjectProperties"
        }, {
            code:"user-object-watchers", name:"Observar Variables", path:"./userObjects/UOWatchers"
        }]
    }

    serialize() {
        let s = super.serialize();
        s.lat = this.lat;
        s.lng = this.lng;
        return s;
    }
    moved(userObjectsVisualizer, interObject) {
        let mapPoint = userObjectsVisualizer.toMap({x:interObject.x(), y:interObject.y()})
        this.lat = mapPoint.lat;
        this.lng = mapPoint.lng;
        if (this.parentObject) {
            this.parentObject.moved(userObjectsVisualizer, interObject, this);
        } else {
            window.geoos.events.trigger("userObject", "moved", this.id);
            this.refreshWatchers();
        }
    }
    positioned(lat, lng) {
        this.lat = lat;
        this.lng = lng;
        if (this.parentObject) {
            this.parentObject.positioned(lat, lng, this);
        } else {
            window.geoos.events.trigger("userObject", "moved", this.id);
            this.layer.refresh();
            this.refreshWatchers();
        }
    }

    getInteractionObjectInfo(interactionObject) {
        return {name:this.name, center:this.getCenter()}
    }

    getKonvaElements(visualizer) {
        let {elements, interactionElements} = super.getKonvaElements();
        let p = visualizer.toCanvas({lat:this.lat, lng:this.lng});
        let opts = {radius:8, fill:"green", stroke:"black", strokeWidth:1};
        opts.x = p.x; opts.y = p.y;
        let element =  new Konva.Circle(opts);
        elements.push(element);
        this.canvasCenter = p; // used in dragBoundFunc in area objects

        if (visualizer.interactions) {
            opts.draggable = true;
            opts.listening = true;
            opts.dragBoundFunc = this.dragBoundFunc; // from area
            delete opts.fill;
            let interElement = new Konva.Circle(opts);
            interElement.userObjectType = "point";
            interElement.zIndexToAssign = 60;
            interactionElements.push(interElement);            
        }

        return {elements, interactionElements}
    }

    getCenter() {return {lat:this.lat, lng:this.lng}}
}

class GEOOSUserObjectArea extends GEOOSUserObject {
    constructor(id, name, p1, p2) {
        super("area", id, name);
        // deserialize sends null as 3rd parameter and assigns points
        if (p1) {
            let lngW = Math.min(p1.lng, p2.lng);
            let lngE = Math.max(p1.lng, p2.lng);
            let latN = Math.max(p1.lat, p2.lat);
            let latS = Math.min(p1.lat, p2.lat);
            this.points = [
                new GEOOSUserObjectPoint(null, this.name + "-nw", latN, lngW, this),
                new GEOOSUserObjectPoint(null, this.name + "-ne", latN, lngE, this),
                new GEOOSUserObjectPoint(null, this.name + "-sw", latS, lngW, this),
                new GEOOSUserObjectPoint(null, this.name + "-se", latS, lngE, this)
            ];

            // Points dragging restrictions
            // NW
            this.points[0].dragBoundFunc = pos => {
                let maxX = this.points[1].canvasCenter.x - 10;
                let maxY = this.points[2].canvasCenter.y - 10;
                return {x:pos.x < maxX?pos.x:maxX, y:pos.y < maxY?pos.y:maxY}
            }
            // NE
            this.points[1].dragBoundFunc = pos => {
                let minX = this.points[0].canvasCenter.x + 10;
                let maxY = this.points[2].canvasCenter.y - 10;
                return {x:pos.x > minX?pos.x:minX, y:pos.y < maxY?pos.y:maxY}
            }
            // SW
            this.points[2].dragBoundFunc = pos => {
                let maxX = this.points[1].canvasCenter.x - 10;
                let minY = this.points[0].canvasCenter.y + 10;
                return {x:pos.x < maxX?pos.x:maxX, y:pos.y > minY?pos.y:minY}
            }
            // SE
            this.points[3].dragBoundFunc = pos => {
                let minX = this.points[0].canvasCenter.x + 10;
                let minY = this.points[0].canvasCenter.y + 10;
                return {x:pos.x > minX?pos.x:minX, y:pos.y > minY?pos.y:minY}
            }
        }
    }

    static deserialize(s, parentObject) {
        let area = new GEOOSUserObjectArea(s.id, s.name);
        let points = s.points.reduce((list, p) => ([...list, GEOOSUserObject.deserialize(p, area)]), []);
        area.points = points;
        return area;
    }

    get lng0() {return this.points[0].lng}
    get lng1() {return this.points[1].lng}
    get lat0() {return this.points[0].lat}
    get lat1() {return this.points[2].lat}

    set lng0(l) {this.points[0].lng = l; this.points[2].lng = l;}
    set lng1(l) {this.points[1].lng = l; this.points[3].lng = l;}
    set lat0(l) {this.points[0].lat = l; this.points[1].lat = l;}
    set lat1(l) {this.points[2].lat = l; this.points[3].lat = l;}

    getCenter() {return {lat:(this.lat0 + this.lat1) / 2, lng:(this.lng0 + this.lng1) / 2}}

    getChildren() {return this.points}

    getFinalObject(interObject) {
        if (interObject.userObjectType == "point") {
            let idx = interObject.userObjectIndex;
            return this.points[idx];
        }
        return this;
    }

    serialize() {
        let s = super.serialize();
        s.points = this.points.reduce((list, p) => ([...list, p.serialize()]), []);
        return s;
    }
    moved(userObjectsVisualizer, interObject, point) {
        if (point) {
            let idx = this.points.indexOf(point);
            let [p0, p1, p2, p3] = this.points;
            switch (idx) {
                case 0: p1.lat = p0.lat; p2.lng = p0.lng; break;
                case 1: p0.lat = p1.lat; p3.lng = p1.lng; break;
                case 2: p3.lat = p2.lat; p0.lng = p2.lng; break;
                case 3: p2.lat = p3.lat; p1.lng = p3.lng; break;
            }
        } else {
            // interObject.x(), interObject.y() son deltas en pixels
            let p0 = userObjectsVisualizer.toCanvas({lng:this.lng0, lat:this.lat0});
            let p1 = userObjectsVisualizer.toCanvas({lng:this.lng1, lat:this.lat1});
            p0.x += interObject.x(); p0.y += interObject.y();
            p1.x += interObject.x(); p1.y += interObject.y();        

            let mp0 = userObjectsVisualizer.toMap({x:p0.x, y:p0.y})
            let mp1 = userObjectsVisualizer.toMap({x:p1.x, y:p1.y})
            this.lng0 = mp0.lng; this.lat0 = mp0.lat;
            this.lng1 = mp1.lng; this.lat1 = mp1.lat;
        }
        // Trigger actions for area and points
        this.points.forEach(p => {
            window.geoos.events.trigger("userObject", "moved", p.id)
            p.refreshWatchers();
        });
        window.geoos.events.trigger("userObject", "moved", this.id);
        this.refreshWatchers();
    }

    positioned(lat, lng, point) {
        if (point) {
            let idx = this.points.indexOf(point);
            let [p0, p1, p2, p3] = this.points;
            switch (idx) {
                case 0: p1.lat = p0.lat; p2.lng = p0.lng; break;
                case 1: p0.lat = p1.lat; p3.lng = p1.lng; break;
                case 2: p3.lat = p2.lat; p0.lng = p2.lng; break;
                case 3: p2.lat = p3.lat; p1.lng = p3.lng; break;
            }
        } else {
            throw "Can't position area";
        }
        // Trigger actions for area and points
        this.points.forEach(p => {
            window.geoos.events.trigger("userObject", "moved", p.id)
            p.refreshWatchers();
        });
        window.geoos.events.trigger("userObject", "moved", this.id);
        this.layer.refresh();
        this.refreshWatchers();
    }

    getInteractionObjectInfo(interactionObject) {
        if (interactionObject.userObjectType == "point") return this.points[interactionObject.userObjectIndex].getInteractionObjectInfo(interactionObject);
        return {name:this.name, center:this.getCenter()}
    }

    async refresh() {
        for (let p of this.points) await p.refresh();
        super.refresh();
    }

    getKonvaElements(visualizer) {
        let {elements, interactionElements} = super.getKonvaElements();

        let p0 = visualizer.toCanvas([this.lat0, this.lng0]);
        let p1 = visualizer.toCanvas([this.lat1, this.lng1]);
        let poly = new Konva.Line({
            points: [p0.x, p0.y, p1.x, p0.y, p1.x, p1.y, p0.x, p1.y],
            fill: 'rgba(0,0,0,0.05)',
            stroke: 'black',
            strokeWidth: 1,
            closed: true,
            draggable:true,
            shadowOffsetX : 5,
            shadowOffsetY : 5,
            shadowBlur : 10,
            listening:false
        });
        elements.push(poly);
        if (visualizer.interactions) {
            let interPoly = new Konva.Line({
                points: [p0.x, p0.y, p1.x, p0.y, p1.x, p1.y, p0.x, p1.y],
                fill: 'rgba(0,0,0,0.05)',
                stroke: 'black',
                closed: true,
                draggable:true,
                listening:true
            });
            interPoly.userObjectType = "area";
            interactionElements.push(interPoly);
        }
        let idx=0;
        for (let p of this.points) {
            let els = p.getKonvaElements(visualizer);
            elements = elements.concat(els.elements?els.elements:[]);
            let pointInteractionElements = els.interactionElements || [];
            pointInteractionElements.forEach(p => p.userObjectIndex = idx);
            interactionElements = interactionElements.concat(pointInteractionElements);
            idx++;
        }

        return {elements, interactionElements}
    }
}