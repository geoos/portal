class GEOOSQuery {
    constructor() {}
}

class RasterQuery extends GEOOSQuery {
    constructor(geoServer, dataSet, variable, format) {
        super();
        this.variable = variable;
        this.format = format;
        this.geoServer = geoServer;
        this.dataSet = dataSet;
    }

    query(args) {
        if (this.format == "isolines") {
            if (!args.time) args.time = window.geoos.time;
            if (!args.n) {
                let bounds = window.geoos.bounds;
                args.n = bounds.n; args.s = bounds.s; args.e = bounds.e; args.w = bounds.w;
            }
        } else if (this.format == "isobands") {
            if (!args.time) args.time = window.geoos.time;
            if (!args.n) {
                let bounds = window.geoos.bounds;
                args.n = bounds.n; args.s = bounds.s; args.e = bounds.e; args.w = bounds.w;
            }
        } else if (this.format == "grid") {
            if (!args.time) args.time = window.geoos.time;
            if (!args.n) {
                let bounds = window.geoos.bounds;
                args.n = bounds.n; args.s = bounds.s; args.e = bounds.e; args.w = bounds.w;
            }
        } else throw "Format '" + this.format + "' not handled in RasterQuery"

        if (this.format == "isolines") {
            return this.geoServer.client.isolines(this.dataSet.code, this.variable.code, args.time, args.n, args.w, args.s, args.e, args.level, args.increment, args.fixedLevels);
        } else if (this.format == "isobands") {
            return this.geoServer.client.isobands(this.dataSet.code, this.variable.code, args.time, args.n, args.w, args.s, args.e, args.level, args.increment, args.fixedLevels);
        } else if (this.format == "grid") {
            return this.geoServer.client.grid(this.dataSet.code, this.variable.code, args.time, args.n, args.w, args.s, args.e, args.margin, args.level);
        }
    }
}