class WSeleccionaFecha extends ZDialog {
    onThis_init(options) {
        console.log("init", options);
        this.temporalidad = options.temporalidad;
        if (this.temporalidad != "1d" && this.temporalidad != "1M" && this.temporalidad != "1y") throw "Temporalidad no manejada:" + this.temporalidad;
        this.tiempo = this.ajustaTiempo(options.tiempo);
        if (options.titulo) this.title.text = options.titulo;
        this.finPeriodo = options.finPeriodo;
        if (this.temporalidad == "1y") {
            this.itemDia.hide();
            this.itemMes.hide();
        } else if (this.temporalidad == "1M") {
            this.itemDia.hide();
        }
        this.refrescaTiempo();
    }
    ajustaTiempo(ms) {
        let tiempo = moment.tz(ms, window.timeZone);
        tiempo.hours(0); tiempo.minutes(0); tiempo.seconds(0); tiempo.milliseconds(0);
        if (this.temporalidad == "1M") {
            tiempo.date(1);
        } else if (this.temporalidad == "1y") {
            tiempo.date(1); tiempo.month(0);
        }
        return tiempo;
    }
    refrescaTiempo() {
        this.lblAno.text = this.tiempo.year();
        this.lblMes.text = this.tiempo.format("MMMM");
        this.lblDia.text = this.tiempo.format("DD");
    }

    onPreDia_click() {
        this.tiempo.date(this.tiempo.date() - 1);
        this.refrescaTiempo();
    }
    onNextDia_click() {
        this.tiempo.date(this.tiempo.date() + 1);
        this.refrescaTiempo();
    }
    onPreMes_click() {
        this.tiempo.month(this.tiempo.month() - 1);
        this.refrescaTiempo();
    }
    onNextMes_click() {
        this.tiempo.month(this.tiempo.month() + 1);
        this.refrescaTiempo();
    }
    onPreAno_click() {
        this.tiempo.year(this.tiempo.year() - 1);
        this.refrescaTiempo();
    }
    onNextAno_click() {
        this.tiempo.year(this.tiempo.year() + 1);
        this.refrescaTiempo();
    }

    onCmdOk_click() {
        if (this.finPeriodo) {
            if (this.temporalidad == "1d") this.tiempo.date(this.tiempo.date() + 1);
            else if (this.temporalidad == "1M") this.tiempo.month(this.tiempo.month() + 1);
            else this.tiempo.year(this.tiempo.year() + 1);
            this.tiempo.milliseconds(this.tiempo.milliseconds() - 1);            
        }
        this.close(this.tiempo.valueOf())
    }
    onCmdCancel_click() {this.cancel()}
}
ZVC.export(WSeleccionaFecha);