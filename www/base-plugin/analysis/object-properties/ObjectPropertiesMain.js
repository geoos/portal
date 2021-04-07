class ObjectPropertiesMain extends ZCustomController {
    onThis_init(options) {
        this.analyzer = options.analyzer;
    }

    doResize() {
        let size = this.size;   
        this.propPanelContainer.size = size;
    }

    refresh() {
        console.log("metadata", this.analyzer.metadata);
        this.find("#objectName").textContent = this.analyzer.object.layer.name + " / [" + this.analyzer.metadata.id + "] " + this.analyzer.metadata.name;
        let html = this.analyzer.metadata.properties.reduce((html, prop) => {
            if (prop.name != "center" && prop.name != "centroid") {
                html += `<tr><th>${prop.name}</th><td>${prop.value}</td></tr>`;
            }
            return html;
        }, "");
        this.propsContainer.html = "<table class='table table-dark table-striped'>" + html + "</table>"
    }
}
ZVC.export(ObjectPropertiesMain);