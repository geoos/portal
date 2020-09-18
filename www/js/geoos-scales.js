class ScalesFactory {
    constructor() {}

    async init() {
        this.scaleDefs = [];
        for (let geoServer of window.geoos.geoServers) {
            for (let scaleDef of geoServer.colorScales) {
                if (scaleDef.type == "pg") {
                    scaleDef.config.pgContent = await this.fetchFile(geoServer.url + "/" + scaleDef.config.url);
                }
                this.scaleDefs.push(scaleDef);
            }
        }
    }

    fetchFile(url) {
        return new Promise((resolve, reject) => {
            fetch(url, {mode:"cors"}).then(r => {
                r.text().then(txt => {
                    resolve(txt);
                });
            }).catch(error => reject(error));
        })
    }

    createScale(scaleDef, config) {
        switch(scaleDef.type) {
            case "linear-hsl": return new HSLLinearScale(scaleDef, config);
            default: throw "Color Scale '" + scaleDef.type + "' not handled";
        }
    }
}

class GEOOSColorScale {
    constructor(scaleDef, config) {
        this.def = scaleDef;
        this.config = config;        
    }        
    get name() {return this.config.name}
    get auto() {return this.config.auto?true:false}
    get clipOutOfRange() {return this.config.clipOutOfRange?true:false}
    get min() {return this.auto?this._min:this.config.min}
    get max() {return this.auto?this._max:this.config.max}
    setRange(min, max) {this._min = min; this._max = max}

    getColor(value) {return "rgb(255,0,0)"}
}

class HSLLinearScale extends GEOOSColorScale {
    get s() {return this.config.s || "100%"}
    get l() {return this.config.l || "50%"}
    getColor(value) {
        let color = "rgb(0,0,0,0)";
        if (value !== undefined && this.min < this.max) {
            let v = (value - this.min) / (this.max - this.min);
            if (this.clipOutOfRange && (v < 0 || v > 1)) color;
            if (v < 0) v = 0;
            if (v > 1) v = 1;
            let hue=((1-v)*120).toString(10);
            color = ["hsl(",hue, ",", this.s , "," ,this.l, ")"].join("");
        }
        return color;
    }
}
