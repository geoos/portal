class WSourceTime extends ZDialog {
    onThis_init(options) {
        this.source = options.source;
        this.edType.setRows([{code:"fixed", name:"Tiempo Fijo"}, {code:"map", name:"Tiempo del Mapa"}], this.source.time.type);
        this.onEdType_change();
        let defUnit = "minutes";
        if (this.source.time.type == "map" && this.source.time.offset) defUnit = this.source.time.unit
        this.edTimeUnit.setRows([{code:"minutes", name:"Minutos"}, {code:"hours", name:"Horas"}, {code:"days", name:"Días"}], defUnit)
        this.edOffset.value = this.source.time.offset || 0;
        this.time = moment.tz(Date.now(), window.timeZone);
        if (this.source.time.type == "fixed") {
            this.time = moment.tz(this.source.time.ms, window.timeZone);
        }
        this.edDate.value = this.time.clone().startOf("day");
        let hhs = [];
        for (let hh=0; hh<24; hh++) {
            hhs.push({code:hh, name:(hh <10?"0":"") + hh});
        }
        this.edHH.setRows(hhs, this.time.hour())
        let mms = [];
        for (let mm=0; mm<60; mm += 5) {
            mms.push({code:mm, name:(mm <10?"0":"") + mm});
        }
        this.edMM.setRows(mms, this.time.minute())
    }

    onEdType_change() {                
        let type = this.edType.value;
        if (type == "map") {
            this.fixedTime.hide();
            this.mapTime.show("flex");
        } else {
            this.fixedTime.show("flex");
            this.mapTime.hide();
        }
    }

    async onCmdOk_click() {
        try {
            if (this.edType.value == "map") {
                let offset = parseFloat(this.edOffset.value);
                if (isNaN(offset)) throw "Desplazamiento inválido";
                this.source.time = {type:"map", offset, unit:this.edTimeUnit.value}
            } else {
                let time = this.edDate.value;
                time = moment.tz(time.getTime(), window.timeZone);
                time.hours(parseInt(this.edHH.value));
                time.minutes(parseInt(this.edMM.value));
                time.seconds(0);
                time.milliseconds(0);
                this.source.time = {type:"fixed", ms:time.valueOf()}
            }
            console.log("source", this.source);
            this.close(this.source);
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()})
        }
    }
    onCmdCancel_click() {this.cancel()}
    onCmdClose_click() {this.cancel()}    
}
ZVC.export(WSourceTime);