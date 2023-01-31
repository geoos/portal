class GEOOSAnalyzerTimeSerie extends GEOOSAnalyzer {
    constructor(o, listeners) {
        super(o, "time-serie", listeners);
        this.data1 = {aborter:null, serie:null}
        this.data2 = {aborter:null, serie:null}
        this.timeListener = _ => {this.callRefresh(true, true)}
        this.moveListener = id => {
            if (this.object.type == "user-object" && this.object.code == id) this.callRefresh(true, true)
        }
        window.geoos.events.on("portal", "timeChange", this.timeListener);
        window.geoos.events.on("userObject", "moved", this.moveListener);

    }

    callRefresh(w1, w2) {
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        if (w1) this.refreshW1 = true;
        if (w2) this.refreshW2 = true;
        this.refreshTimer = setTimeout(_ => {
            this.refreshTimer = null;
            if (this.refreshW1) this.refreshWatcher1();
            if (this.refreshW2) this.refreshWatcher2();
            this.refreshW1 = false;
            this.refreshW2 = false;
        }, 100);
    }

    destroy() {
        if (this.data1.aborter) this.data1.aborter.abort()
        if (this.data2.aborter) this.data2.aborter.abort()
        window.geoos.events.remove(this.timeListener);
        window.geoos.events.remove(this.moveListener);
    }

    getPropertyPanels() {
        let basePath = window.geoos.getPlugin("base").basePath;
        return [{
            code:"time-serie-vars", name:"Selección de Variables", path:basePath + "/analysis/time-serie/TimeSerieVars"
        }, {
            code:"time-serie-time", name:"Configurar Temporalidad", path:basePath + "/analysis/time-serie/TimeSerieTime"
        }]
    }
    getMainPanel() {
        let basePath = window.geoos.getPlugin("base").basePath;
        return basePath + "/analysis/time-serie/TimeSerieMain"
    }

    get watcher1() {
        if (this._watcher1) return this._watcher1;
        if (this.config.watcher1) {
            this._watcher1 = GEOOSQuery.deserialize(this.config.watcher1)
            return this._watcher1;
        } else {
            return null;
        }
    }
    set watcher1(w) {
        this._watcher1 = w;
        this.config.watcher1 = w?w.serialize():null;
        this.callRefresh(true, false);
        this.triggerChange();
    }
    get watcher2() {
        if (this._watcher2) return this._watcher2;
        if (this.config.watcher2) {
            this._watcher2 = GEOOSQuery.deserialize(this.config.watcher2)
            return this._watcher2;
        } else {
            return null;
        }
    }
    set watcher2(w) {
        this._watcher2 = w;
        this.config.watcher2 = w?w.serialize():null;
        this.callRefresh(false, true);
        this.triggerChange();
    }

    get timeConfig() {
        let t = this.config.time;
        if (!t) {
            t = {type:"relative", temporality:"1d", from:-5, to:2}
            this.config.time = t;
        }
        return t;
    }
    get timeType() {return this.timeConfig.type}
    set timeType(t) {this.timeConfig.type = t; this.callRefresh(true, true);}
    get temporality() {return this.timeConfig.temporality}
    set temporality(t) {this.timeConfig.temporality = t; this.callRefresh(true, true);}
    get timeFrom() {return this.timeConfig.from}
    set timeFrom(t) {this.timeConfig.from = t; this.callRefresh(true, true);}
    get timeTo() {return this.timeConfig.to}
    set timeTo(t) {this.timeConfig.to = t; this.callRefresh(true, true);}
    get timeFromDate() {return this.timeConfig.fromDate}
    set timeFromDate(t) {this.timeConfig.fromDate = t; this.callRefresh(true, true);}
    get timeToDate() {return this.timeConfig.toDate}
    set timeToDate(t) {this.timeConfig.toDate = t; this.callRefresh(true, true);}

    async initDefaults() {
        //console.log("analyzer", this.code, "initDefaults", this.object);
    }
    async mainPanelAttached() {
        this.callRefresh(true, true);
    }

    getPeriod() {
        let t0, t1;
        if (this.timeType == "relative") {
            let tPortal = moment.tz(window.geoos.time, window.timeZone);
            tPortal.hours(0); tPortal.minutes(0); tPortal.seconds(0); tPortal.milliseconds(0);
            if (this.temporality == "1d") {
               t0 = tPortal.clone();
               t0.date(t0.date() + this.timeFrom);
               t1 = tPortal.clone();
               t1.date(t1.date() + this.timeTo + 1); t1.milliseconds(t1.milliseconds() - 1); // Fin del día anterior
               t0 = t0.valueOf();
               t1 = t1.valueOf();
            } else if (this.temporality == "1M") {
                tPortal.date(1);
                t0 = tPortal.clone();
                t0.month(t0.month() + this.timeFrom);
                t1 = tPortal.clone();
                t1.month(t1.month() + this.timeTo + 1); t1.milliseconds(t1.milliseconds() - 1); // Fin del día anterior
                t0 = t0.valueOf();
                t1 = t1.valueOf();
            } else if (this.temporality == "1y") {
                tPortal.date(1); tPortal.month(0);
                t0 = tPortal.clone();
                t0.year(t0.year() + this.timeFrom);
                t1 = tPortal.clone();
                t1.year(t1.year() + this.timeTo + 1); t1.milliseconds(t1.milliseconds() - 1); // Fin del día anterior
                t0 = t0.valueOf();
                t1 = t1.valueOf();
             } else throw "temporalidad " + this.temporality + " no está manejada en serie de tiempo";            
        } else {
            t0 = this.timeFromDate;
            t1 = this.timeToDate;            
        }
        return {startTime:t0, endTime:t1}
    }
    refreshWatcher1() {
        this.startWorking();
        if (this.data1.aborter) this.data1.aborter.abort();
        this.data1.aborter = null;
        if (!this.watcher1) {
            this.finishWorking();
            return;
        }
        let period = this.getPeriod();
        let center = this.objectPoint;
        let {promise, controller} = this.watcher1.query({
            startTime:period.startTime, endTime:period.endTime, format:"time-serie", objectCode:this.object.code, temporality:"5m", lat:center.lat, lng:center.lng
        });
        this.data1.aborter = controller;
        promise
            .then(res => {
                this.data1.aborter = null;
                if (this.watcher1.type == "minz") {
                    this.data1.serie = res.map(r => ({x:r.time, y:r.resultado}));
                } else {
                    this.data1.serie = res.map(r => ({x:r.time, y:r.value}));
                }
                this.finishWorking();
            }).catch(err => {
                this.finishWorking();
                this.data1.aborter = null;
                console.error(err)
            })
    }
    refreshWatcher2() {
        this.startWorking();
        if (this.data2.aborter) this.data2.aborter.abort();
        this.data2.aborter = null;
        if (!this.watcher2) {
            this.finishWorking();
            return;
        }
        let period = this.getPeriod();
        let center = this.objectPoint;;
        let {promise, controller} = this.watcher2.query({
            startTime:period.startTime, endTime:period.endTime, format:"time-serie", objectCode:this.object.code, temporality:"5m", lat:center.lat, lng:center.lng
        });
        this.data2.aborter = controller;
        promise
            .then(res => {
                this.data2.aborter = null;
                if (this.watcher2.type == "minz") {
                    this.data2.serie = res.map(r => ({x:r.time, y:r.resultado}));
                } else {
                    this.data2.serie = res.map(r => ({x:r.time, y:r.value}));
                }
                this.finishWorking();
            }).catch(err => {
                this.finishWorking();
                this.data2.aborter = null;
                console.error(err)
            })
    }
}

GEOOSAnalyzer.register("time-serie", "Serie de Tiempo", 
    o => (o.type == "station" || o.type == "vector-object" || o.type == "user-object" || o.type == "monstation"), 
    (o, listeners) => (new GEOOSAnalyzerTimeSerie(o, listeners)),
    350
)

