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
        this.scaleDefs.sort((s1, s2) => (s1.name < s2.name?-1:1))
    }

    get colorScales() {return this.scaleDefs}

    byName(name) {return this.scaleDefs.find(s => s.name == name)}

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
            case "linear-transparency": return new LinearTransparencyScale(scaleDef, config);
            case "pg": return new PGScale(scaleDef, config);
            case "positive-negative": return new NegativePositiveScale(scaleDef, config);
            case "ranges": return new RangesScale(scaleDef, config);
            case "rgb-decoder": return new RGBDecoderScale(scaleDef, config);
            case "rgba-decoder": return new RGBADecoderScale(scaleDef, config);
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
    set auto(a) {this.config.auto = a}
    get clipOutOfRange() {return this.config.clipOutOfRange?true:false}
    set clipOutOfRange(c) {this.config.clipOutOfRange = c}
    get min() {return this.config.min}
    set min(m) {this.config.min = m}
    get max() {return this.config.max}
    set max(m) {this.config.max = m}
    get unit() {return this.config.unit}
    set unit(u) {this.config.unit = u}
    get hasLabels() {return false}
    get minLabel() {return "S/E"}
    get maxLabel() {return "S/E"}
    setRange(min, max) {
        if (this.auto) {
            this.config.min = min; this.config.max = max;
        }
        this._min = min; this._max = max;
    }
    getColor(value) {return "rgb(255,0,0)"}
    refreshPreview(div) {div.style.background = "rgb(255,0,0)"}
}

class HSLLinearScale extends GEOOSColorScale {
    get s() {return this.def.config.s || "100%"}
    get l() {return this.def.config.l || "50%"}
    getColor(value) {
        let color = "rgba(0,0,0,0)";
        if (value !== undefined && this.min < this.max) {
            let v = (value - this.min) / (this.max - this.min);
            if (this.clipOutOfRange && (v < 0 || v > 1)) return color;
            if (v < 0) v = 0;
            if (v > 1) v = 1;
            let hue=((1-v)*120).toString(10);
            color = ["hsl(",hue, ",", this.s , "," ,this.l, ")"].join("");
        }
        return color;
    }
    refreshPreview(div) {
        let style = "linear-gradient(90deg, hsl(120, " + this.s + ", " + this.l + ") 0%, hsl(0, " + this.s + ", " + this.l + ") 100%)";
        div.style["background-image"] = style;
    }
}

class LinearTransparencyScale extends GEOOSColorScale {
    get colors() {
        return [this.def.config.r || 255, this.def.config.g || 255, this.def.config.b || 255]
    }
    getColor(value) {
        let color = "rgba(0,0,0,0)";
        if (value !== undefined && this.min < this.max) {
            let v = (value - this.min) / (this.max - this.min);
            if (this.clipOutOfRange && (v < 0 || v > 1)) return color;
            if (v < 0) v = 0;
            if (v > 1) v = 1;
            let colors = this.colors;
            color = "rgba(" + colors[0] + ", " + colors[1] + ", " + colors[2] + ", " + v + ")";
        }
        return color;
    }
    refreshPreview(div) {
        let [r, g, b] = this.colors;
        let style = "linear-gradient(90deg, rgba(" + r + " ," + g + ", " + b + ", 0) 0%, rgba(" + r + " ," + g + ", " + b + ", 255) 100%)";
        div.style["background-image"] = style;
    }
}

class PGScale extends GEOOSColorScale {
    constructor(scaleDef, config) {
        super(scaleDef, config);
        this.parseScheme();
    }
    parseScheme() {
        let txt = this.def.config.pgContent;
        let ranges = [];
        let lines = txt.split("\n");
        let l1 = undefined;
        for (let i=0; i<lines.length; i++) {
            let fields = lines[i].split(" ").reduce((fields, v) => {
                if (v) fields.push(parseFloat(v));
                return fields;
            }, []);
            if (l1 === undefined) l1 = fields[0] + 0.0001;
            if (fields.length) {
                ranges.push({min:fields[0], max:l1, color:"rgb(" + fields[1] + ", " + fields[2] + ", " + fields[3] + ")"})
                l1 = fields[0];
            }
        }
        ranges.sort((r1, r2) => (r1.min - r2.min));
        let limits = ranges.reduce((acum, r) => {
            if (acum.min === undefined || r.min < acum.min) acum.min = r.min;
            if (acum.max === undefined || r.max > acum.max) acum.max = r.max;
            return acum;
        }, {min:undefined, max:undefined});
        let totalRange = limits.max - limits.min;
        ranges = ranges.map(r => ({
            min:(r.min - limits.min) / totalRange,
            max:(r.max - limits.min) / totalRange,
            color:r.color
        }))
        this.ranges = ranges;
    }    
    getColor(value) {
        let color = "rgba(0,0,0,0)";
        if (value !== undefined && this.min < this.max) {
            let v = (value - this.min) / (this.max - this.min);
            if (this.clipOutOfRange && (v < 0 || v > 1)) return color;
            if (v < 0) v = 0;
            if (v > 1) v = 1;
            let i = parseInt(this.ranges.length / 2);
            color = this.binarySearch(v, i, 0, this.ranges.length - 1);
        }
        return color;
    }
    binarySearch(v, i, i0, i1) {        
        let r = this.ranges[i];
        if (v >= r.min && v <= r.max || (i1 - i0) <= 1) return r.color;
        if (v < r.min) {
            let newI = parseInt(i0 + (i - i0) / 2);
            if (newI == i) {
                console.error("Binary Search error .. invalid lower range");
                return r.color;
            }
            return this.binarySearch(v, newI, i0, i-1);
        } else if (v >= r.max) {
            let newI = i + (i1 - i) / 2;
            if (newI != parseInt(newI)) newI = 1 + parseInt(newI);
            if (newI == i) {
                console.error("Binary Search error .. invalid upper range");
                return r.color;
            }
            return this.binarySearch(v, newI, i+1, i1);
        } else if (isNaN(v)) {
            return null;
        } else {
            console.error("Binary search error .. unhandled condition", r, v);
            return r.color;
        }
    }
    refreshPreview(div) {
        let gradSteps = this.ranges.reduce((steps, r, i) => {
            steps += ", " + r.color + " " + (100 * r.min) + "%";
            return steps;
        }, "");
        let style = "linear-gradient(90deg" + gradSteps + ")";
        div.style["background-image"] = style;
    }
}

class NegativePositiveScale extends GEOOSColorScale {
    get negativeColors() {return this.def.config.negativeColors}
    get positiveColors() {return this.def.config.positiveColors}
    get cutValue() {return this.def.config.cutValue !== undefined?this.def.config.cutValue:0}
    getColor(value) {
        let color = "rgba(0,0,0,0)";
        if (value !== undefined && this.min < this.max) {
            let v = (value - this.min) / (this.max - this.min);
            if (this.clipOutOfRange && (v < 0 || v > 1)) return color;
            let r, g, b;
            if (Math.abs(value - this.cutValue) < 0.001) {
                r = this.positiveColors[0][0];
                g = this.positiveColors[0][1];
                b = this.positiveColors[0][2];
            } else if (value < this.cutValue) {
                let f = (value - this.min) / (this.cutValue - this.min);
                r = (1-f) * this.negativeColors[0][0] + f * this.negativeColors[1][0];
                g = (1-f) * this.negativeColors[0][1] + f * this.negativeColors[1][1];
                b = (1-f) * this.negativeColors[0][2] + f * this.negativeColors[1][2];
            } else {
                let f = (value - this.cutValue) / (this.max - this.cutValue);
                r = (1-f) * this.positiveColors[0][0] + f * this.positiveColors[1][0];
                g = (1-f) * this.positiveColors[0][1] + f * this.positiveColors[1][1];
                b = (1-f) * this.positiveColors[0][2] + f * this.positiveColors[1][2];
            }        
            return "rgb(" + parseInt(r) + " ," + parseInt(g) + ", " + parseInt(b) + ")";
        }
        return color;
    }
    refreshPreview(div) {
        let p = (this.cutValue - this.min) / (this.max - this.min) * 100;
        let r = this.negativeColors[0][0];
        let g = this.negativeColors[0][1];
        let b = this.negativeColors[0][2];
        let style = "linear-gradient(90deg, rgb(" + r + " ," + g + ", " + b + ") 0%";
        r = this.negativeColors[1][0];
        g = this.negativeColors[1][1];
        b = this.negativeColors[1][2];
        style += ", rgb(" + r + " ," + g + ", " + b + ") " + (p - 1) + "%";
        r = this.positiveColors[0][0];
        g = this.positiveColors[0][1];
        b = this.positiveColors[0][2];
        style += ", rgb(" + r + " ," + g + ", " + b + ") " + p + "%";
        r = this.positiveColors[1][0];
        g = this.positiveColors[1][1];
        b = this.positiveColors[1][2];
        style += ", rgb(" + r + " ," + g + ", " + b + ") 100%)";
        div.style["background-image"] = style;
    }
}

class RangesScale extends GEOOSColorScale {
    constructor(scaleDef, config) {
        super(scaleDef, config);
        this.normalizeRanges();
    }
    get hasLabels() {return this.def.config.labels?true:false}
    get minLabel() {return this.def.config.labels[0]}
    get maxLabel() {return this.def.config.labels[this.def.config.labels.length - 1]}

    normalizeRanges() {
        let {min, max} = this.def.config.ranges.reduce((acum, r) => {
            let v = r[0]
            if (acum.min === undefined || v < acum.min) acum.min = v;
            if (acum.max === undefined || v > acum.max) acum.max = v;
            return acum;
        }, {min:undefined, max:undefined})
        this.ranges = [];
        /*
        for (let i in this.def.config.ranges) {
            let r = this.def.config.ranges[i];
            let rMin = (i == 0?r[0]:this.def.config.ranges[i - 1][0]);
            rMin = (rMin - min) / (max - min);
            let rMax = r[0];
            rMax = (rMax - min) / (max - min);
            let rr = {min:rMin, max:rMax, color:r[1]}
            this.ranges.push(rr);
        }
        */
        let n = this.def.config.ranges.length;
        for (let i=0; i < n; i++) {
            let r = this.def.config.ranges[i];
            let rMin, rMax;
            if (i == 0) {
                rMin = r[0];
            } else {
                let r0 = this.def.config.ranges[i-1];
                rMin =  (r0[0] + r[0]) / 2;
            }
            if (i == (n - 1)) {
                rMax = r[0];
            } else {
                let r1 = this.def.config.ranges[i+1];
                rMax =  (r[0] + r1[0]) / 2;
            }
            // normalizar
            rMin = (rMin - min) / (max - min);
            rMax = (rMax - min) / (max - min);
            let rr = {min:rMin, max:rMax, color:r[1]}
            this.ranges.push(rr);
        }
        // console.log("rangos normalizados", this.ranges);
    }   
    getColor(value) {
        let color = "rgba(0,0,0,0)";
        if (value !== undefined && this.min < this.max) {
            let v = (value - this.min) / (this.max - this.min);
            if (this.clipOutOfRange && (v < 0 || v > 1)) return color;
            if (v < 0) v = 0;
            if (v > 1) v = 1;
            let i = parseInt(this.ranges.length / 2);
            color = this.binarySearch(v, i, 0, this.ranges.length - 1);
        }
        return color;
    }
    binarySearch(v, i, i0, i1) {        
        let r = this.ranges[i];
        if (v >= r.min && v < r.max || (i1 - i0) < 1) return r.color;
        if (v < r.min) {
            let newI = parseInt(i0 + (i - i0) / 2);
            if (newI == i) {
                console.error("Binary Search error .. invalid lower range");
                return r.color;
            }
            return this.binarySearch(v, newI, i0, i-1);
        } else if (v >= r.max) {
            let newI = i + (i1 - i) / 2;
            if (newI != parseInt(newI)) newI = 1 + parseInt(newI);
            if (newI == i) {
                console.error("Binary Search error .. invalid upper range");
                return r.color;
            }
            return this.binarySearch(v, newI, i+1, i1);
        } else if (isNaN(v)) {
            return null;
        } else {
            console.error("Binary search error .. unhandled condition", r, v);
            return r.color;
        }
    }
    getLabel(value) {
        let label = "S/E";
        if (value !== undefined && this.min < this.max) {
            let v = (value - this.min) / (this.max - this.min);
            if (this.clipOutOfRange && (v < 0 || v > 1)) return label;
            if (v < 0) v = 0;
            if (v > 1) v = 1;
            let i = parseInt(this.ranges.length / 2);
            label = this.binaryLabelSearch(v, i, 0, this.ranges.length - 1);
        }
        return label;
    }
    binaryLabelSearch(v, i, i0, i1) {        
        let r = this.ranges[i];
        if (v >= r.min && v < r.max || (i1 - i0) < 1) return this.def.config.labels[i];
        if (v < r.min) {
            let newI = parseInt(i0 + (i - i0) / 2);
            if (newI == i) {
                console.error("Binary Label Search error .. invalid lower range");
                return this.def.config.labels[i];
            }
            return this.binaryLabelSearch(v, newI, i0, i-1);
        } else if (v >= r.max) {
            let newI = i + (i1 - i) / 2;
            if (newI != parseInt(newI)) newI = 1 + parseInt(newI);
            if (newI == i) {
                console.error("Binary Label Search error .. invalid upper range");
                return this.def.config.labels[i];
            }
            return this.binaryLabelSearch(v, newI, i+1, i1);
        } else if (isNaN(v)) {
            return null;
        } else {
            console.error("Binary search error .. unhandled condition", r, v);
            return r.color;
        }
    }
    refreshPreview(div) {
        let gradSteps = this.ranges.reduce((steps, r, i) => {
            steps += ", " + r.color + " " + (100 * r.min) + "%";
            return steps;
        }, "");
        let style = "linear-gradient(90deg" + gradSteps + ")";
        div.style["background-image"] = style;
    }
}

class RGBDecoderScale extends GEOOSColorScale {
    getColor(value) {        
        let r = parseInt(value / 65536);
        let rest = value - 65536 * r;
        let g = parseInt(rest / 256);
        let b = rest - 256 * g;

        return "rgb(" + r + "," + g + "," + b + ")";
    }
    refreshPreview(div) {
        div.style["background-image"] = "linear-gradient(90deg, blue, green, red)";
    }
}

class RGBADecoderScale extends GEOOSColorScale {
    getColor(value) {        
        let r = parseInt(value / (65536 * 256));
        let rest = value - (65536 * 256) * r;
        let g = parseInt(rest / 65536);
        rest = rest - 65536 * g;
        let b = parseInt(rest / 256);
        let a = rest - 256 * b;

        return "rgba(" + r + "," + g + "," + b + ", " + (a / 100) + ")";
    }
    refreshPreview(div) {
        div.style["background-image"] = "linear-gradient(90deg, blue, green, red)";
    }
}