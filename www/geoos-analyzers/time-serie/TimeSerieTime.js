const unidadesTiempo = {"1d":"días", "1M":"meses", "1y":"años"}

class TimeSerieTime extends ZCustomController {
    onThis_init(options) {
        this.analyzer = options.analyzer;
        this.refresh();
    }

    refresh() {
        let v = this.analyzer.watcher1;
        if (!v) v = this.analyzer.watcher2;
        if (!v) {
            this.tiempoRelativo.hide();
            this.tiempoFijo.hide();
            return;            
        }
        let nivel = nivelesTemporalidad.indexOf(v.minZTemporality);
        if (nivel < 6) nivel = 6; // minimo es 1d
        if (nivel > 7) nivel = 11; // 3M 4M 6M => 1y
        let niveles = [], nivelDefault = "1y", rangoDefault = [-6, 0];
        if (nivel <= 6) {
            niveles.push({codigo:"1d", nombre:"Diaria"});
            nivelDefault = "1d";
            rangoDefault = [-4, 2];
        }
        if (nivel <= 7) {
            niveles.push({codigo:"1M", nombre:"Mensual"});
            if (nivelDefault == "1y") nivelDefault = "1M";
        }
        niveles.push({codigo:"1y", nombre:"Anual"});
        let tempo = this.analyzer.temporality;
        if (!tempo || !niveles.find(n => n.codigo == tempo)) {
            tempo = nivelDefault;
            this.analyzer.temporality = tempo;
            this.analyzer.timeFrom = rangoDefault[0];
            this.analyzer.timeTo = rangoDefault[1];            
        }
        this.edTemporalidad.setRows(niveles, tempo);
        this.unidadFrom.text = unidadesTiempo[tempo];
        this.unidadTo.text = unidadesTiempo[tempo];
        // Actualizar titulo
        this.edTipoTiempo.setRows([{
            codigo:"relative", nombre:"Relativo al Mapa"
        }, {
            codigo:"fixed", nombre:"Límites Fijos"
        }], this.analyzer.timeType);    
        if (this.analyzer.timeType == "relative") {
            this.tiempoRelativo.show();
            this.tiempoFijo.hide();            
            this.edFrom.value = this.analyzer.timeFrom;
            this.edTo.value = this.analyzer.timeTo;
        } else {
            this.tiempoRelativo.hide();
            this.tiempoFijo.show();            
            if (!this.analyzer.timeFromDate || !this.analyzer.timeToDate) {
                this.analyzer.timeFromDate = Date.now() - 24*60*60*1000;
                this.analyzer.timeToDate = Date.now();
            }
            this.edFromDate.temporalidad = this.analyzer.temporality;
            this.edFromDate.finPeriodo = false;
            this.edFromDate.titulo = "Inicio del Período";
            this.edFromDate.value = this.analyzer.timeFromDate;
            this.edToDate.temporalidad = this.analyzer.temporality;
            this.edToDate.finPeriodo = true;
            this.edToDate.titulo = "Fin del Período";
            this.edToDate.value = this.analyzer.timeToDate;
        }
    }

    async onEdTemporalidad_change() {
        this.analyzer.temporality = this.edTemporalidad.value;
        this.unidadFrom.text = unidadesTiempo[this.analyzer.temporality];
        this.unidadTo.text = unidadesTiempo[this.analyzer.temporality];
    }
    async onEdFrom_change() {
        let v = parseFloat(this.edFrom.value);
        if (isNaN(v)) return;
        this.analyzer.timeFrom = v;
    }
    async onEdTo_change() {
        let v = parseFloat(this.edTo.value);
        if (isNaN(v)) return;
        this.analyzer.timeTo = v;
    }
    async onEdFromDate_change() {
        this.analyzer.timeFromDate = this.edFromDate.value;
    }
    async onEdToDate_change() {
        this.analyzer.timeToDate = this.edToDate.value;
    }

    async onEdTipoTiempo_change() {
        this.analyzer.timeType = this.edTipoTiempo.value;
        this.refresh();
    }
}
ZVC.export(TimeSerieTime);