class SelectorFecha extends ZCustomController {
    onThis_init() {
        this.fecha = moment.tz(window.timeZone)
        this._temporalidad = "1d";
        this.finPeriodo = false;
        this.titulo = null;
    }
    
    get value() {
        this.fecha.hour(0); this.fecha.minutes(0); this.fecha.seconds(0); this.fecha.milliseconds(0);
        if (this.temporalidad == "1M") {
            this.fecha.date(1);
        } else if (this.temporalidad == "1y") {
            this.fecha.date(1); this.fecha.month(0);
        }
        if (this.finPeriodo) {
            if (this.temporalidad == "1d") {
                this.fecha.date(this.fecha.date() + 1);
            } else if (this.temporalidad == "1M") {
                this.fecha.month(this.fecha.month() + 1);
            } else {
                this.fecha.year(this.fecha.year() + 1);
            }
            this.fecha.milliseconds(this.fecha.milliseconds() - 1);
        }
        return this.fecha.valueOf();
    }
    set value(ms) {
        this.fecha = moment.tz(ms, window.timeZone);
        this.refresca();
    }
    get temporalidad() {return this._temporalidad}
    set temporalidad(t) {
        if (t != "1d" && t != "1M" && t != "1y") throw "Temporalidad " + t + " no soportada";
        this._temporalidad = t, this.refresca();
    }

    onCmdCalendario_click() {
        this.showDialog("./WSeleccionaFecha", {
            temporalidad:this.temporalidad, 
            tiempo:this.fecha.valueOf(), 
            finPeriodo:this.finPeriodo,
            titulo:this.titulo
        }, t => {
            this.fecha = moment.tz(t, window.timeZone);
            this.refresca();
            this.triggerEvent("change");
        })
    }

    refresca() {
        let fmt = "DD/MMM/YYYY";
        if (this.temporalidad == "1M") fmt = "MMM/YYYY";
        else if (this.temporalidad == "1y") fmt = "YYYY";
        this.ed.value = this.fecha.format(fmt);
    }
}
ZVC.export(SelectorFecha);