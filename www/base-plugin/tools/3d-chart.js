class Tool3DChart extends GEOOSTool {
    constructor(id, name, createOptions) {
        let config = {
            layerId:createOptions.layerId, object:createOptions.object
        }
        super("3d-chart", id, name, config);
        this.data = {aborter:null, grid:null}        
        this.colorScale = null;
        this.timeChangeListener = async _ => await this.timeChanged();
        this.objectMoveListener = async objectId => await this.objectMoved(objectId);
    }

    get object() {return this.config.object}
    get layerId() {return this.config.layerId}
    get layer() {return window.geoos.getActiveGroup().getLayer(this.layerId)}
    get mainPanelPath() {
        let basePath = window.geoos.getPlugin("base").basePath;
        return basePath + "/tools/3d-chart-panels/3DChartMain"
    }

    async activate() {
        super.activate();
        window.geoos.events.on("portal", "timeChange", this.timeChangeListener);
        window.geoos.events.on("userObject", "moved", this.objectMoveListener);
    }
    async deactivate() {
        window.geoos.events.remove(this.timeChangeListener);
        window.geoos.events.remove(this.objectMoveListener);
        super.deactivate();
    }

    getPropertyPanels() {
        let basePath = window.geoos.getPlugin("base").basePath;
        return [{
            code:"tool-props", name:"Nombre del Análisis", path:"./propertyPanels/PropToolName"
        }, {
            code:"raster-var", name:"Selección de Variable", path:"./propertyPanels/SelectRasterVariable"
        }, {
            code:"color-scale", name:"Escala de Colores", path:"./propertyPanels/ToolColorScaleProperties"
        }, {
            code:"p3d-axis-scale", name:"Escalar Ejes", path:basePath + "/tools/3d-chart-panels/3DChartScaleAxis"
        }]
    }

    get caption() {
        if (this.variable) return this.name + " / " + this.variable.name;
        return this.name + ": 3D";
    }

    get variable() {
        if (this._variable) return this._variable;
        if (this.config.variable) {
            this._variable = GEOOSQuery.deserialize(this.config.variable)
            return this._variable;
        } else {
            return null;
        }
    }
    set variable(v) {
        this._variable = v;
        this.config.variable = v?v.serialize():null;
        this.createDefaultColorScale(true);
        window.geoos.events.trigger("tools", "renamed", this);
        window.geoos.events.trigger("tools", "propertyChange", this);
        this.refresh();
    }

    get colorScaleConfig() {return this.config.colorScale};
    get scaleLatLng() {return this.config.scaleLatLng}
    set scaleLatLng(s) {
        this.config.scaleLatLng = s;
        if (this.mainPanel) this.mainPanel.refresh();
    }
    get scaleZ() {return this.config.scaleZ && this.config.scaleLatLng && this.variable.unit == "m"}
    set scaleZ(s) {
        this.config.scaleZ = s;
        if (this.mainPanel) this.mainPanel.refresh();
    }
    get zScaleFactor() {return this.config.zScaleFactor}
    set zScaleFactor(s) {
        this.config.zScaleFactor = s;
        if (this.mainPanel) this.mainPanel.refresh();
    }


    createDefaultConfig() {
        //this.config.variable = {type:"raster", id:"default", format:"grid", geoServer:"geoos-main", dataSet:"noaa-gfs4", variable:"TMP_2"}
        this.config.variable = {type:"raster", id:"default", format:"grid", geoServer:"geoos-main", dataSet:"gebco-bathymetry", variable:"BATHYMETRY"}
        this.createDefaultColorScale();
        this.config.scaleLatLng = true;
        this.config.scaleZ = true;
        this.config.zScaleFactor = 10;    
    }
    createDefaultColorScale(silent) {
        if (this.variable.variable.options && this.variable.variable.options.colorScale) {
            this.config.colorScale = JSON.parse(JSON.stringify(this.variable.variable.options.colorScale));
        } else if (!this.config.colorScale) {            
            this.config.colorScale = {
                name:"Verde a Rojo", auto:true, clipOutOfRange:false
            }
        } 
        this.config.colorScale.unit = this.variable.unit;
        this.updateColorScale(silent);   
    }
    updateColorScale(silent) {
        let scaleDef = window.geoos.scalesFactory.byName(this.colorScaleConfig.name);
        if (!scaleDef) throw "Can't find color scale '" + this.colorScaleConfig.name + "'";
        this.colorScale = window.geoos.scalesFactory.createScale(scaleDef, this.colorScaleConfig);    
        if (this.data.grid) this.colorScale.setRange(this.data.grid.min, this.data.grid.max);
        if (!silent && this.mainPanel) {
            this.mainPanel.refresh(); 
        }
    }

    get bounds() {
        if (this.object.type == "user-object/area") {
            let area = window.geoos.getUserObject(this.object.code);
            return {n:area.lat0, s:area.lat1, w:area.lng0, e:area.lng1};
        }
        throw "Object type " + this.object.type + " not handled";
    }
    refresh() {
        this.startWorking();
        if (this.data.aborter) {
            this.data.aborter.abort();
            this.data.aborter = null;
        }
        if (!this.variable) this.createDefaultConfig();
        let b = this.bounds;
        let {promise, controller} = this.variable.query({
            format:"grid", n:b.n, s:b.s, w:b.w, e:b.e
        });
        this.data.aborter = controller;
        promise
            .then(res => {
                this.data.aborter = null;
                this.data.grid = res;
                if (this.mainPanel) this.mainPanel.refresh();
                this.finishWorking();
            }).catch(err => {
                this.finishWorking();
                this.data.aborter = null;
                console.error(err)
            })

    }

    async timeChanged() {
        if (this.variable && this.variable.dependsOnTime) {
            if (this.mainPanel) {
                this.refresh();                
            } else {
                this.data.grid = null;
            }            
        }                      
    }

    async objectMoved(objectId) {
        if (this.object.type.startsWith("user-object") && objectId == this.object.code) {
            if (this.mainPanel) {
                this.refresh();                
            } else {
                this.data.grid = null;
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

GEOOSTool.register("3d-chart", "Gráficos 3D sobre Lat / Lng", {    
    creationPanelPath:"./creationPanels/ToolObjectSelector",
    creationPanelOptions:{
        allowedObjectTypes:["user-object/area"],
        caption:"Seleccione el Área para los datos del Gráfico"
    },
    icon:window.geoos.getPlugin("base").basePath + "/tools/img/3d-chart.png",
    menuIcon:window.geoos.getPlugin("base").basePath + "/tools/img/menu-3d-chart.svg",
    menuLabel:"Mapa 3D",
    factory:(name, creationPanelResult) => (new Tool3DChart(null, name, creationPanelResult)),
    deserialize:(id, name, config) => {
        let tool = new Tool3DChart(id, name, {layerId:config.layerId, object:config.object})
        tool.config = config;
        tool.updateColorScale(true);
        return tool;
    }        
})

/*
for (let iii = 0; iii<20; iii++) {
    GEOOSTool.register("3d-chart-" + iii, "Gráficos 3D sobre Lat / Lng: " + iii, {    
        creationPanelPath:"./creationPanels/ToolObjectSelector",
        creationPanelOptions:{
            allowedObjectTypes:["user-object/area"],
            caption:"Seleccione el Área para los datos del Gráfico"
        },
        icon:window.geoos.getPlugin("base").basePath + "/tools/img/3d-chart.png",
        menuIcon:window.geoos.getPlugin("base").basePath + "/tools/img/menu-3d-chart.svg",
        menuLabel:"Mapa 3D",
        factory:(name, creationPanelResult) => (new Tool3DChart(null, name, creationPanelResult)),
        deserialize:(id, name, config) => {
            let tool = new Tool3DChart(id, name, {layerId:config.layerId, object:config.object})
            tool.config = config;
            tool.updateColorScale(true);
            return tool;
        }        
    })
}
*/