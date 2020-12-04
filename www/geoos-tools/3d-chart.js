class Tool3DChart extends GEOOSTool {
    constructor(id, name, createOptions) {
        let config = {
            layerId:createOptions.layerId, object:createOptions.object
        }
        super("3d-chart", id, name, config);
        console.log("3d-chart created", this);
    }

    get object() {return this.config.object}
    get layerId() {return this.config.layerId}
    get layer() {return window.geoos.getActiveGroup().getLayer(this.layerId)}
    get mainPanelPath() {return "geoos-tools/3d-chart-panels/3DChartMain"}

    getPropertyPanels() {
        return [{
            code:"tool-props", name:"Nombre del Análisis", path:"./propertyPanels/PropToolName"
        }]
    }

    get caption() {
        return this.name + ": 3D / (nombre de la variable)";
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