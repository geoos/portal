class Formula extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.refresh();
    }

    async refresh() {
        this.lblFormula.value = this.layer.formula;
    }

    onLblFormula_click() {        
        this.showDialog("./WFormula", {layer:this.layer});
    }
}
ZVC.export(Formula);