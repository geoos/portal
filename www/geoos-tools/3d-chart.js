class Tool3DChart extends GEOOSTool {
    constructor(id, name, createOptions) {
        let config = {
            layerId:createOptions.layerId, object:createOptions.object
        }
        super("3d-chart", id, name, config);
        this.data = {aborter:null, grid:null}        
        this.colorScale = null;
    }

    get object() {return this.config.object}
    get layerId() {return this.config.layerId}
    get layer() {return window.geoos.getActiveGroup().getLayer(this.layerId)}
    get mainPanelPath() {return "geoos-tools/3d-chart-panels/3DChartMain"}

    getPropertyPanels() {
        return [{
            code:"tool-props", name:"Nombre del Análisis", path:"./propertyPanels/PropToolName"
        }, {
            code:"raster-var", name:"Selección de Variable", path:"./propertyPanels/SelectRasterVariable"
        }, {
            code:"color-scale", name:"Escala de Colores", path:"./propertyPanels/ToolColorScaleProperties"
        }, {
            code:"p3d-axis-scale", name:"Escalar Ejes", path:"geoos-tools/3d-chart-panels/3DChartScaleAxis"
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
        if (!this.variable) this.createDefaultConfig();
        let b = this.bounds;
        let {promise, controller} = this.variable.query({
            format:"grid", n:b.n, s:b.s, w:b.w, e:b.e
        });
        this.data1aborter = controller;
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
}

GEOOSTool.register("3d-chart", "Gráfico 3D", {    
    creationPanelPath:"./creationPanels/ToolObjectSelector",
    creationPanelOptions:{
        allowedObjectTypes:["user-object/area"],
        caption:"Seleccione el Área para los datos del Gráfico"
    },
    icon:"img/tools/3d-chart.png",
    factory:(name, creationPanelResult) => (new Tool3DChart(null, name, creationPanelResult))
})