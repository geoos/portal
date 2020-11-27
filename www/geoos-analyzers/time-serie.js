class GEOOSAnalyzerTimeSerie extends GEOOSAnalyzer {
    constructor(o) {
        super(o, "time-serie");
        this.data1 = {aborter:null, serie:null}
        this.data2 = {aborter:null, serie:null}
        this.timeListener = _ => {this.refreshWatcher1(); this.refreshWatcher2()}
        window.geoos.events.on("portal", "timeChange", this.timeListener);
    }

    destroy() {
        if (this.data1.aborter) this.data1.aborter.abort()
        if (this.data2.aborter) this.data2.aborter.abort()
        window.geoos.events.removeListener(this.timeListener);
    }

    getPropertyPanels() {
        return [{
            code:"time-serie-vars", name:"Selección de Variables", path:"geoos-analyzers/time-serie/TimeSerieVars"
        }, {
            code:"time-serie-time", name:"Configurar Temporalidad", path:"geoos-analyzers/time-serie/TimeSerieTime"
        }]
    }
    getMainPanel() {return "geoos-analyzers/time-serie/TimeSerieMain"}

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
        this.refreshWatcher1();
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
        this.refreshWatcher2();
    }

    async initDefaults() {
        console.log("analyzer", this.code, "initDefaults", this.object);
    }
    async mainPanelAttached() {
        this.refreshWatcher1();
        this.refreshWatcher2();
    }


    refreshWatcher1() {
        console.log("refresh watcher 1");
        if (this.data1.aborter) this.data1.aborter.abort();
        this.data1.aborter = null;
        if (!this.watcher1) return;
        let t1 = moment.tz(window.timeZone).endOf("day");
        let t0 = t1.clone().startOf("day").subtract(3, "days");
        let {promise, controller} = this.watcher1.query({
            startTime:t0.valueOf(), endTime:t1.valueOf(), format:"time-serie", objectCode:this.object.code, temporality:"5m", lat:this.object.lat, lng:this.object.lng
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
                console.log("res1", res, "serie1", this.data1.serie);
                this.refreshMainPanel();
            }).catch(err => {
                this.data1.aborter = null;
                console.error(err)
            })
    }
    refreshWatcher2() {
        console.log("refresh watcher 2");
        if (this.data2.aborter) this.data2.aborter.abort();
        this.data2.aborter = null;
        if (!this.watcher2) return;
        let t1 = moment.tz(window.timeZone).endOf("day");
        let t0 = t1.clone().startOf("day").subtract(3, "days");
        let {promise, controller} = this.watcher2.query({
            startTime:t0.valueOf(), endTime:t1.valueOf(), format:"time-serie", objectCode:this.object.code, temporality:"5m", lat:this.object.lat, lng:this.object.lng
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
                console.log("res2", res, "serie2", this.data2.serie);
                this.refreshMainPanel();
            }).catch(err => {
                this.data2.aborter = null;
                console.error(err)
            })
    }
}

GEOOSAnalyzer.register("time-serie", "Serie de Tiempo", 
    o => (o.type == "station" || o.type == "vector-object"), 
    o => (new GEOOSAnalyzerTimeSerie(o)),
    350
)

