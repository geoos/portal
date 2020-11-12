class GEOOSQuery {
    constructor(config) {
        this.id = "GQ" + parseInt(9999999999 * Math.random());
        this.config = config;
    }
    get icon() {return this.config.icon}
    get name() {return this.config.name}

    static newEmptySelector(caption, minZDimension, layerName) {
        return new GEOOSQuery({
            type:"selector",
            code:"selector",
            name:caption || "[Seleccione Variables]",
            icon:"img/icons/search.svg",
            minZDimension:minZDimension,
            layerName:layerName
        })
    }

    getHTML() {
        return `
            <div class="row mt-1">
                <div class="col">
                    <img class="mr-1 float-left inverse-image" height="16px" src="${this.icon}"/>
                    <span id="varName${this.id}" class="selectable-name" data-z-clickable="true"'>${this.name}</span>
                    <i id="caretVar${this.id}" class="fas fa-caret-right ml-1 float-right mt-1" ></i>
                </div>
            </div>
            `;
    }
    registerListeners(container, listeners) {
        container.find("#varName" + this.id).onclick = _ => {
            container.showDialog("common/WSelectVariables", {dimCode:this.config.minZDimension, layerName:this.config.layerName}, variables => {
                if (listeners.onSelect) listeners.onSelect(variables)
            })
        }
    }
}

class RasterQuery extends GEOOSQuery {
    constructor(geoServer, dataSet, variable, format) {
        super({
            type:"raster", name:variable.name, code:variable.code, icon:"img/icons/point.svg"
        });
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
        } else if (this.format == "vectors") {
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
        } else if (this.format == "vectors") {
            return this.geoServer.client.vectorsGrid(this.dataSet.code, this.variable.code, args.time, args.n, args.w, args.s, args.e, args.margin);
        }
    }

}

class MinZQuery extends GEOOSQuery {
    constructor(zRepoServer, variable, filter) {
        super({
            type:"minz", name:variable.name, code:variable.code, icon:"img/icons/dashboard.svg"
        })
        this.zRepoServer = zRepoServer;
        this.filter = filter;
    } 
}
