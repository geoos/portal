class Tool3DTerrainClouds extends GEOOSTool {
    constructor(id, name, createOptions) {
        let config = {
            layerId:createOptions.layerId, object:createOptions.object
        }
        super("3d-terrain-clouds", id, name, config);
        // data = [bathymetry, low-clouds, mid-clouds, high-clouds]
        this.data = [{aborter:null, grid:null}, {aborter:null, grid:null}, {aborter:null, grid:null}, {aborter:null, grid:null}]
        this.timeChangeListener = async _ => await this.timeChanged();
        this.objectMoveListener = async objectId => await this.objectMoved(objectId);
    }

    get object() {return this.config.object}
    get layerId() {return this.config.layerId}
    get layer() {return window.geoos.getActiveGroup().getLayer(this.layerId)}
    get mainPanelPath() {return "geoos-tools/3d-chart-panels/TerrainCloudsMain"}

    get scaleZ() {
        if (this.config.scaleZ === undefined || this.config.zScaleFactor === undefined) {
            this.config.scaleZ = true; this.config.zScaleFactor = 100;
        }
        return this.config.scaleZ
    }
    set scaleZ(s) {
        this.config.scaleZ = s;
        if (this.mainPanel) this.mainPanel.refresh();
    }
    get zScaleFactor() {
        if (this.config.scaleZ === undefined || this.config.zScaleFactor === undefined) {
            this.config.scaleZ = true; this.config.zScaleFactor = 100;
        }
        return this.config.zScaleFactor
    }
    set zScaleFactor(s) {
        this.config.zScaleFactor = s;
        if (this.mainPanel) this.mainPanel.refresh();
    }

    get forceScaleLatLng() {return true}

    async activate() {
        super.activate();

        console.log("activar panel");
        window.geoos.topPanel.activateOption("opWizard2");
        window.geoos.events.on("portal", "timeChange", this.timeChangeListener);
        window.geoos.events.on("userObject", "moved", this.objectMoveListener);
    }
    async deactivate() {
        window.geoos.events.remove(this.timeChangeListener);
        window.geoos.events.remove(this.objectMoveListener);
        super.deactivate();
    }

    getPropertyPanels() {
        return [{
            code:"tool-props", name:"Nombre del Análisis", path:"./propertyPanels/PropToolName"
        }, {
            code:"p3d-axis-scale", name:"Escalar Ejes", path:"geoos-tools/3d-chart-panels/3DChartScaleAxis"
        }]
    }

    get caption() {
        return this.name;        
    }

    get bounds() {
        if (this.object.type == "user-object/area") {
            let area = window.geoos.getUserObject(this.object.code);
            return {n:area.lat0, s:area.lat1, w:area.lng0, e:area.lng1};
        }
        throw "Object type " + this.object.type + " not handled";
    }

    hasData() {
        let n = this.data.reduce((n, d) => (n + (d.grid && !d.aborter?1:0)), 0);
        return n == 4;
    }
    refresh() {
        this.startWorking();
        this.data.forEach(d => {
            if (d.aborter) d.aborter.abort();
            d.aborter = null;
            d.grid = null;
        })
        let promises = [
            this.loadTerrain(), this.loadCloudsLevel(0), this.loadCloudsLevel(1), this.loadCloudsLevel(2)
        ];
        Promise.all(promises)
            .then(_ => {
                console.log("res", this.data);
                this.finishWorking();
            })
            .catch(error => {
                for (let i=0; i<4; i++) {
                    this.data[i].grid = null;
                    this.data[i].aborter = null;
                }
                this.finishWorking();
                console.error(error);
            })
    }

    loadTerrain() {
        return new Promise((resolve, reject) => {
            let variable = GEOOSQuery.deserialize({type:"raster", id:"default", format:"grid", geoServer:"geoos-main", dataSet:"gebco-bathymetry", variable:"BATHYMETRY"})
            let b = this.bounds;
            let {promise, controller} = variable.query({
                format:"grid", n:b.n, s:b.s, w:b.w, e:b.e
            });
            this.data[0].aborter = controller;
            promise
                .then(res => {
                    this.data[0].aborter = null;
                    this.data[0].grid = res;
                    resolve();
                }).catch(err => {
                    console.error(err)
                    reject(err);
                })
        })
    }
    loadCloudsLevel(level) {
        return new Promise((resolve, reject) => {
            let variable = GEOOSQuery.deserialize({type:"raster", id:"default", format:"grid", geoServer:"geoos-main", dataSet:"noaa-gfs4", variable:"TCDC", level:level})
            let b = this.bounds;
            let {promise, controller} = variable.query({
                format:"grid", level:level, n:b.n, s:b.s, w:b.w, e:b.e
            });
            this.data[level+1].aborter = controller;
            promise
                .then(res => {
                    this.data[level+1].aborter = null;
                    this.data[level+1].grid = res;
                    resolve();
                }).catch(err => {
                    console.error(err)
                    reject(err);
                })
        })
    }

    async timeChanged() {
        if (this.mainPanel) {
            this.refresh();                
        } else {
            this.data.forEach(d => {
                if (d.aborter) d.aborter.abort();
                d.aborter = null;
                d.grid = null;
            })
        }            
    }

    async objectMoved(objectId) {
        if (this.object.type.startsWith("user-object") && objectId == this.object.code) {
            if (this.mainPanel) {
                this.refresh();                
            } else {
                this.data.forEach(d => {
                    if (d.aborter) d.aborter.abort();
                    d.aborter = null;
                    d.grid = null;
                })
            }    
        }
    }

    async isValid() {
        //console.log("isValid", this.layerId, this.object);
        if (this.object.type.startsWith("user-object/")) return window.geoos.getUserObject(this.object.code)?true:false;
        /*
        let layer = window.geoos.getLayer(this.layerId);
        if (!layer) return false;        
        console.log("layer", layer);
        if (layer.type == "user-object") {
            let uo = ...
        }
        */
        return true;
    }
}

GEOOSTool.register("3d-terrain-clouds", "Vista 3D de Terreno y Nubosidad", {    
    creationPanelPath:"./creationPanels/ToolObjectSelector",
    creationPanelOptions:{
        allowedObjectTypes:["user-object/area"],
        caption:"Seleccione el Área para Analizar"
    },
    icon:"img/tools/3d-terrain-clouds.png",
    menuIcon:"img/tools/menu-3d-terrain-clouds.svg", 
    menuIconStyles:{filter:"invert(1)"},
    menuLabel:"Terreno y Nubosidad",
    factory:(name, creationPanelResult) => (new Tool3DTerrainClouds(null, name, creationPanelResult)),
    deserialize:(id, name, config) => {
        let tool = new Tool3DTerrainClouds(id, name, {layerId:config.layerId, object:config.object})
        tool.config = config; 
        return tool;
    } 
})