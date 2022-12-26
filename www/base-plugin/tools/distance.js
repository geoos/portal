class ToolDistance extends GEOOSTool {
    constructor(id, name, createOptions) {
        let config = {
            points:createOptions.points || [],
            unit:createOptions.unit || "kilometers"
        }
        super("distance", id, name, config);
    }

    get points() {return this.config.points}
    set unit(u) {this.config.unit = u}
    get unit() {return this.config.unit}
    get mainPanelPath() {
        let basePath = window.geoos.getPlugin("base").basePath;
        return basePath + "/tools/distance-panels/DistanceMain"
    }

    async activate() {
        super.activate();
        //window.geoos.events.on("userObject", "moved", this.objectMoveListener);
    }
    async deactivate() {
        window.geoos.events.remove(this.objectMoveListener);
        super.deactivate();
    }

    getPropertyPanels() {
        let basePath = window.geoos.getPlugin("base").basePath;
        return [{
            code:"tool-props", name:"Nombre del Análisis", path:"./propertyPanels/PropToolName"
        }]
    }

    get caption() {
        return this.name;
    }


    createDefaultConfig() {
        //this.config.variable = {type:"raster", id:"default", format:"grid", geoServer:"geoos-main", dataSet:"noaa-gfs4", variable:"TMP_2"}
        this.config.points = []
    }
    refresh() {
        /*
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
        */
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
        //console.log("isValid", this, this.layerId, this.object);
        if (this.object && this.object.type.startsWith("user-object/")) return window.geoos.getUserObject(this.object.code)?true:false;
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

GEOOSTool.register("distance", "Medidor de Distancia", {    
    creationPanelPath:"./creationPanels/ToolPathSelector",
    creationPanelOptions:{
        caption:"Agregue puntos a la Ruta"
    },
    icon:window.geoos.getPlugin("base").basePath + "/tools/img/distance.png",
    menuIcon:window.geoos.getPlugin("base").basePath + "/tools/img/distance.svg",
    menuLabel:"Medir Distancia",
    factory:(name, creationPanelResult) => (new ToolDistance(null, name, creationPanelResult)),
    deserialize:(id, name, config) => {
        let tool = new ToolDistance(id, name, {points:config.points})
        tool.config = config;
        return tool;
    }        
})
