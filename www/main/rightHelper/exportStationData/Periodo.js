class Periodo extends ZCustomController {
    onThis_init(options) {
        this.error.hide();
        this.options = options;
        if (options.dsOriginal) {
            this.rowAgrupador.hide();
        } else {
            let s = this.options.station;
            let z = s.server.client;
            let vars = this.options.variables;
            let maxTempLevel = 0;
            let variables = this.options.listaVariables.reduce((lista, v) => {
                if (vars[v.code + "-avg"] || vars[v.code + "-min"] || vars[v.code + "-max"] || vars[v.code + "-n"]) lista.push(v.code);
                return lista;
            }, []);
            for (let v of variables) {
                let variable = z.variables.find(v2 => v2.code == v);
                if (variable) {
                    let level = temporalityLevel[variable.temporality].level;
                    if (level && level > maxTempLevel) maxTempLevel = level;
                }
            }
            console.log("maxTempLevel", maxTempLevel);
            if (!options.temporalidad) {
                options.temporalidad = "5m";
            }
            this.rowAgrupador.show();
            // Calcular mayor temporalidad (level) de las variables para filtrar agrupadores para consulta
            this.edTemporalidad.setRows([{
                code:"5m", name:"5 Minutos", level:0
            }, {
                code:"15m", name:"15 Minutos", level:1
            }, {
                code:"30m", name:"30 Minutos", level:2
            }, {
                code:"1h", name:"1 Hora", level:3
            }, {
                code:"6h", name:"6 Horas", level:4
            }, {
                code:"12h", name:"12 Horas", level:5
            }, {
                code:"1d", name:"1 Día", level:6
            }, {
                code:"1M", name:"1 Mes", level:7
            }].filter(n => n.level >= maxTempLevel), options.temporalidad)
        }
        let months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        months = months.map((m, idx) => ({index:idx, name:m}));
        if (!options.fromYear) {
            let now = moment.tz(window.timeZone);
            options.toYear = now.year(); options.toMonth = now.month(); options.toDate = now.date();
            now = now.subtract(1, "day");
            options.fromYear = now.year(); options.fromMonth = now.month(); options.fromDate = now.date();
        }
        this.edFromYear.value = options.fromYear;
        this.edFromMonth.setRows(months, options.fromMonth);
        this.edFromDate.value = options.fromDate;
        this.edToYear.value = options.toYear;
        this.edToMonth.setRows(months, options.toMonth);
        this.edToDate.value = options.toDate;
        this.checkVisible();
    }

    onEdTemporalidad_change() {this.checkVisible();}
    onEdFromYear_change() {this.checkValid()}
    onEdFromMonth_change() {this.checkValid()}
    onEdFromDate_change() {this.checkValid()}
    onEdToYear_change() {this.checkValid()}
    onEdToMonth_change() {this.checkValid()}
    onEdToDate_change() {this.checkValid()}

    checkVisible() {
        if (this.edTemporalidad.value == "1M") {
            this.edFromDate.hide();
            this.edToDate.hide();
        } else {
            this.edFromDate.show();
            this.edToDate.show();
        }
        this.checkValid();
    }

    checkValid() {
        this.error.hide();
        try {
            let tempo = this.edTemporalidad.value;
            this.options.temporalidad = tempo;
            let fromYear = parseInt(this.edFromYear.value);
            if (isNaN(fromYear) || fromYear < 1950 || fromYear > 2200) throw "El Período es Inválido";
            let fromMonth = parseInt(this.edFromMonth.value);
            let fromDate = parseInt(this.edFromDate.value);
            if (tempo != "1M" || this.options.dsOriginal) {
                if (isNaN(fromDate) || fromDate < 1 || fromDate > 31) throw "El Período es Inválido";
            }
            let fromTime = moment.tz(window.timeZone);
            fromTime.year(fromYear); fromTime.month(fromMonth);
            if (tempo != "1M" || this.options.dsOriginal) {
                fromTime.date(fromDate);
                fromTime = fromTime.startOf("day");
                this.options.fmtFromTime = fromTime.format("DD/MM/YYYY");
            } else {
                fromTime = fromTime.startOf("month");
                this.options.fmtFromTime = fromTime.format("MM/YYYY");
            }
            this.options.fromTime = fromTime.valueOf();

            let toYear = parseInt(this.edToYear.value);
            if (isNaN(toYear) || toYear < 1950 || toYear > 2200) throw "El Período es Inválido";
            let toMonth = parseInt(this.edToMonth.value);
            let toDate = parseInt(this.edToDate.value);
            if (tempo != "1M" || this.options.dsOriginal) {
                if (isNaN(toDate) || toDate < 1 || toDate > 31) throw "El Período es Inválido";
            }
            let toTime = moment.tz(window.timeZone);
            toTime.year(toYear); toTime.month(toMonth);
            if (tempo != "1M" || this.options.dsOriginal) {
                toTime.date(toDate);
                toTime = toTime.endOf("day");
                this.options.fmtToTime = toTime.format("DD/MM/YYYY");
            } else {
                toTime = toTime.endOf("month");
                this.options.fmtToTime = toTime.format("MM/YYYY");
            }
            this.options.toTime = toTime.valueOf();
            if (this.options.toTime < this.options.fromTime) throw "El Período es Inválido";
            this.triggerEvent("enableNext");

            // Validar por estimacion del n° de registros
            if (this.options.dsOriginal) {
                let days = toTime.diff(fromTime, "days");
                if (days > 31) throw "La exportación de los datos originales de una estación no puede ser para un período mayor a un mes"
            } else {
                let nFilas, nVars = Object.keys(this.options.variables).reduce((sum, v) => (sum + (this.options.variables[v]?1:0)), 0);
                if (tempo == "1M") {
                    nFilas = parseInt(toTime.diff(fromTime, "months")) + 1;
                } else {
                    const nFilasDia = {
                        "5m":24*12, "15m":24*4, "30m":24*2, "1h":24, "6h":4, "12h":2, "1d":1
                    }
                    nFilas = nFilasDia[tempo] * (parseInt(toTime.diff(fromTime, "days")) + 1);
                    //console.log("n estimado", nFilas, "*", nVars, "=", nFilas * nVars);
                    if (nFilas * nVars > 100000) throw "Demasiados datos para exportar, por favor reducirlos. Puede acortar el período, escoger una agrupación temporal más alta o disminuir el número de variables";
                }
            }
        } catch(error) {
            this.error.show();
            this.error.find("#lblError").innerText = error.toString();
            this.triggerEvent("disableNext");
        }
    }
}
ZVC.export(Periodo);