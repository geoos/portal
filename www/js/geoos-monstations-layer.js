class GEOOSMonStationsLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
        this.id = config.code;
        this.points = [];
        this.config.search = JSON.parse(JSON.stringify(this.config.search));
    }

    get zRepoServer() {
        return this.config.zRepoServer;
    }
    get variable() {
        return this.zRepoServer.client.getVariableFromCache(this.config.search.variable);
    }

    get searchTolerance() {return this.config.search.toleranceDays;}
    set searchTolerance(days) {this.config.search.toleranceDays = days;}
    get searchVariableCode() {return this.config.search.variable}
    get varStationPath() {return this.config.varStationPath}
    get varLevelPath() {return this.config.varLevelPath}
    get pointsDimension() {return this.config.pointsDimension}
    get levelsDimension() {return this.config.levelsDimension}

    serialize() {
        let l = super.serialize();
        l.type = "monstations";
        l.code = this.config.code;
        return l;
    }
    static deserialize(s, config) {
        let layerConfig = window.geoos.monstationsLayers.find(l => l.code == s.code);
        if (!layerConfig) throw "No se encontró la capa de monitoreo: " + s.code;
        layerConfig.name = config.name;
        layerConfig.opacity = config.opacity;
        layerConfig.expanded = config.expanded;
        layerConfig.active = config.active;
        let layer = new GEOOSMonStationsLayer(layerConfig);
        layer.id = s.id;

        return layer;
    }

    async create() {
        this.timeChangeListener = _ => {
            this.refresh();
        }
        this.stations = await this.zRepoServer.client.getAllValores(this.pointsDimension);

        window.geoos.events.on("portal", "timeChange", this.timeChangeListener);

        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        this.konvaLeafletLayer = new KonvaLeafletLayer(window.geoos.map, null, null, {pane:this.pane.id});
        this.konvaLeafletLayer.addTo(window.geoos.map);
        
        this.konvaLeafletLayer.addVisualizer("points", new PointsVisualizer({
            zIndex:1,
            interactions:window.geoos.interactions,
            getPoints: _ => {
                return this.points;
            },
            onmouseover: point => {
                let monstation = point.monstation;
                if (monstation.code == this.hoveredCode) return;
                this.hoveredCode = monstation.code;
                let name = monstation.name, lat = monstation.lat, lng = monstation.lng;
                if (name !== undefined && lat !== undefined && lng !== undefined) {
                    this.konvaLeafletLayer.getVisualizer("legends").setContextLegend(lat, lng, name);                    
                } else {
                    this.konvaLeafletLayer.getVisualizer("legends").unsetContextLegend();
                }
                window.geoos.mapPanel.mapContainer.view.style.cursor = "crosshair";
            },
            onmouseout: point => {
                this.hoveredCode = null;
                this.konvaLeafletLayer.getVisualizer("legends").unsetContextLegend();
                window.geoos.mapPanel.mapContainer.view.style.removeProperty("cursor");
            },
            onclick:point => {
                console.log("click", point);
                let obj = {
                    type:"monstation", code:point.monstation.code, name:point.monstation.name, layer:this, minZDimension:this.pointsDimension,
                    lat:point.monstation.lat, lng:point.monstation.lng
                };
                console.log("obj", obj);
                window.geoos.selectObject(obj)
            }
        }));    
        this.konvaLeafletLayer.addVisualizer("legends", new LegendsVisualizer({
            zIndex:2
        }));
        this.refresh();
    }

    async destroy() {  
        window.geoos.events.remove(this.timeChangeListener);
        if (!this.konvaLeafletLayer) return;
        this.konvaLeafletLayer.removeVisualizer("legends");
        this.konvaLeafletLayer.removeVisualizer("points");
        this.konvaLeafletLayer.removeFrom(window.geoos.map);
        window.geoos.mapPanel.destroyPanelFromLayer(this);
        this.konvaLeafletLayer = null;
    }

    async refresh() {   
        // this.refreshWatchers();
        console.log("monstations refresh", this.config);
        if (!this.group.active || !this.active) return;
        if (!this.konvaLeafletLayer) return;
        if (this.qController) {
            try {
                console.log("Abortando consulta pendiente ...");
                this.qController.abort();
                console.log("Consulta Abortada");
            } catch (error) {
                console.error(error);
            }            
        }
        let q = new MinZQuery(this.zRepoServer, this.variable, this.varStationPath);
        q.monstationsLayerCode = this.config.code;
        let t0 = window.geoos.time - this.searchTolerance * 1000 * 60 * 60 * 24;
        let t1 = window.geoos.time + this.searchTolerance * 1000 * 60 * 60 * 24;
        await this.konvaLeafletLayer.getVisualizer("points").update();
        let {promise, controller} = q.query({startTime: t0, endTime: t1, format: "dim-serie"});
        this.qController = controller;
        promise.then(ret => {
            this.points = this.stations.reduce((list, row) => {
                if (ret.findIndex(r => r.dim.code == row.code) >= 0) {
                    let point = {
                        id:row.code, monstation:row, lat:row.lat, lng:row.lng,  
                        options:{
                            style:{radius:8, stroke:"black", strokeWidth:1, fill:"blue"}
                        }
                    }
                    list.push(point);
                }
                return list;
            }, []);
            this.konvaLeafletLayer.getVisualizer("points").update();
        }).catch(error => console.error(error));
    }

    repaint() {
        if (!this.konvaLeafletLayer) return;
        this.konvaLeafletLayer.getVisualizer("points").update();
    }

    reorder() {
        window.geoos.mapPanel.adjustPanelZIndex(this);
    }

    getPropertyPanels() {
        return super.getPropertyPanels();
        /*
        let panels = super.getPropertyPanels().concat({
            code:"layer-watchers", name:"Observar Variables", path:"./layers/watchers/Watchers"
        })
        if (this.watchers.reduce((n, w) => (w.color?(n+1):n), 0) > 0) {
            panels.push({
                code:"color-scale", name:"Escala de Colores", path:"./layers/watchers/WatchersColorScale"
            })
        }
        panels.push(
            {code:"stations-name", name:"Estaciones", path:"./layers/watchers/Stations"}
        )
        return panels;
        */
    }

    regenerateIds() {}
}