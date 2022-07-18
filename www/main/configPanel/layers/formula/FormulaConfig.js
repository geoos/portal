class FormulaConfig extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.refresh();
    }

    refresh() {
        this.edDLat.value = this.layer.dLat;
        this.edDLng.value = this.layer.dLng;
        this.edUnidad.value = this.layer.unit;
        this.edDecimales.value = this.layer.decimals;
        this.edFormulaType.setRows([{
            code:"localJS", name:"JavaScript por Punto en Browser"
        }, {
            code:"serverJSPoint", name:"JavaScript por Punto en Servidor"
        }], this.layer.formulaType);
    }

    onEdDLng_change() {
        let v = parseFloat(this.edDLng.value);
        if (!isNaN(v) && v > 0) {
            this.layer.dLng = v;
            this.layer.refresh();
        }
    }
    onEdDLat_change() {
        let v = parseFloat(this.edDLat.value);
        if (!isNaN(v) && v > 0) {
            this.layer.dLat = v;
            this.layer.refresh();
        }
    }
    onEdDecimales_change() {
        let n = parseInt(this.edDecimales.value);
        if (!isNaN(n)) {
            this.layer.decimals = n;
            this.layer.refresh();
        }
    }
    onEdUnidad_change() {
        let u = this.edUnidad.value.trim();
        if (u) {
            this.layer.unit = u;
            this.layer.refresh();
        }
    }
    onEdFormulaType_change() {
        this.layer.formulaType = this.edFormulaType.value;
        this.layer.refresh();
    }
}
ZVC.export(FormulaConfig);