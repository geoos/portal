class Tolerance extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.refresh();
    }

    async refresh() {
        let tolerancia = this.layer.tolerancia;
        this.edUnidad.setRows([{code:"minuto", name:"Minutos"}, {code:"hora", name:"Horas"}, {code:"dia", name:"Días"}, {code:"mes", name:"Meses"}, {code:"año", name:"Años"}], tolerancia.unidad)
        this.edValor.value = tolerancia.valor;
    }

    onEdUnidad_change() {
        let tolerancia = this.layer.tolerancia;
        tolerancia.unidad = this.edUnidad.value;
        this.layer.reload();
    }
    onEdValor_change() {
        let valor = parseFloat(this.edValor.value);
        if (isNaN(valor)) return;
        let tolerancia = this.layer.tolerancia;
        tolerancia.valor = valor;
        this.layer.reload();
    }
}
ZVC.export(Tolerance);