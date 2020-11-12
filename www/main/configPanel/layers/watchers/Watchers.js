class Watchers extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        console.log("layer", layer);
        this.rowWorking.hide();
        this.rowCanceling.hide();
        this.refresh();
    }

    refresh() {
        let selector = GEOOSQuery.newEmptySelector("[Observar Nueva Variable]", this.layer.minZDimension, this.layer.name);
        this.rowNew.html = selector.getHTML(true);
        selector.registerListeners(this.rowNew, {
            onSelect:variables => console.log("select variables", variables)
        })
    }
}
ZVC.export(Watchers)