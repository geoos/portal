class GEOOSAnalyzerObjectProperties extends GEOOSAnalyzer {
    constructor(o, listeners) {
        super(o, "object-properties", listeners);
    }

    getPropertyPanels() {
        return []
    }
    getMainPanel() {return "geoos-analyzers/object-properties/ObjectPropertiesMain"}

    async initDefaults() {
        //console.log("analyzer", this.code, "initDefaults", this.object);
    }
    async mainPanelAttached() {
        this.buildMetadata();
        await this.mainPanel.refresh();        
    }

    buildMetadata() {
        this.metadata = {id:this.object.code, name:this.object.name}
        if (this.object.type == "vector-object") {
            let o = this.object.layer.metadataMap[this.object.code];
            console.log("Metadata Object", o);            
            this.metadata.properties = Object.keys(o).reduce((list, propName) => (propName != "id" && propName != "name"?[...list, {name:propName, value:o[propName]}]:[]), []);
        }
    }
}

GEOOSAnalyzer.register("object-properties", "Propiedades del Objeto", 
    o => (o.type == "vector-object"), 
    (o, listeners) => (new GEOOSAnalyzerObjectProperties(o, listeners)),
    250
)

