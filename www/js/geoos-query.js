const descTempos = {
    "5m":"cada 5 minutos", "15m":"cada 15 minutos", "30m":"cada 30 minutos",
    "1h":"por hora", "6h":"cada 6 horas", "12h":"cada 12 horas",
    "1d":"diario", 
    "1M":"mensual", "3M":"trimestral", "4M":"cuatrimestral", "6M":"semestral",
    "1y":"anual"
}
const descAcums = {
    "n":"nº muestras", "sum":"acumulado", "avg":"promedio", "min":"mínimo", "max":"máximo"
}
const nivelesTemporalidad = ["5m", "15m", "30m", "1h", "6h", "12h", "1d", "1M", "3M", "4M", "6M", "1y"];
const rangosTemporalidad = {
    "5m":1000 * 60 * 5, "15m":1000 * 60 * 5, "30m":1000 * 60 * 30,
    "1h":1000 * 60 * 60, "6h":1000 * 60 * 60 * 6, "12h":1000 * 60 * 60 * 12,
    "1d":1000 * 60 * 60 * 24,
    "1M":1000 * 60 * 60 * 24 * 30, "3M":1000 * 60 * 60 * 24 * 30 * 3, "4M":1000 * 60 * 60 * 24 * 30 * 4, "6M":1000 * 60 * 60 * 24 * 30 * 6,
    "1y":1000 * 60 * 60 * 24 * 365
}

class GEOOSQuery {
    constructor(config) {
        this.id = "GQ" + parseInt(9999999999 * Math.random());
        this.config = config;
        this.color = false;
        this.legend = false;
    }
    get type() {return this.config.type}
    get icon() {return this.config.icon}
    get name() {return this.config.name}
    get unit() {return "??"}
    get decimals() {return 2}
    get colorScale() {return {name:"SAGA - 01", clipOutOfRange:false, auto:true, unit:this.unit}}
    get minZTemporality() {throw "minZTemporality not overwritten"}
    get dependsOnTime() {return true}
    get timeRange() {throw "timeRange not overwritten"}

    redondea(value, includeUnit) {
        let pow = Math.pow(10, this.decimals);
        let txt = Math.floor(value * pow) / pow + "";
        if (includeUnit) txt += "[" + this.unit + "]";
    }

    static newEmptySelector(caption, minZDimension, layerName, layer) {
        let monstationsLayerCode = null;
        if (layer instanceof GEOOSMonStationsLayer) monstationsLayerCode = layer.config.code;
        return new GEOOSQuery({
            type:"selector",
            code:"selector",
            name:caption || "[Seleccione Variables]",
            icon:"img/icons/search.svg",
            minZDimension:minZDimension,
            layerName:layerName,
            monstationsLayerCode
        })
    }

    static cloneQuery(q) {
        if (q.type == "raster") return RasterQuery.cloneQuery(q)
        else if (q.type == "minz") return MinZQuery.cloneQuery(q);
        throw "Query no cloneable"        
    }

    static fromSearchItem(item) {
        if (item.type == "minz") {
            return MinZQuery.fromSearchItem(item)
        } else if (item.type == "raster") {
            item.format = "valueAtPoint";
            return RasterQuery.fromSearchItem(item)
        }
    }


    serialize() {
        throw "Serialize not overwritten";
    }
    static deserialize(cfg) {
        if (cfg.type == "minz") return MinZQuery.deserialize(cfg);
        else if (cfg.type == "raster") return RasterQuery.deserialize(cfg);
        throw "Cannot desearialize " + cfg;
    }

    getHTML() {
        return `
            <div class="row mt-1">
                <div class="col">
                    <img class="mr-1 float-left inverse-image" height="16px" src="${this.icon}"/>
                    <span id="varName${this.id}" class="selectable-name" data-z-clickable="true">${this.name}</span>
                    <i id="caretVar${this.id}" class="fas fa-caret-right ml-1 float-right mt-1" ></i>
                </div>
            </div>
            `;
    }
    registerListeners(container, listeners) {
        container.find("#varName" + this.id).onclick = _ => {
            container.showDialog("common/WSelectVariables", {dimCode:this.config.minZDimension, layerName:this.config.layerName, singleSelection:listeners.singleSelection, monstationsLayerCode: this.config.monstationsLayerCode}, variables => {
                if (listeners.onSelect) listeners.onSelect(variables)
            })
        }
    }
    getLegendColorHTML() {
        let html = "";
        html += `<div class="row mt-1">`;
        html += `  <div id="selLegend$" class="textt-left mt-1">Leyendas</span>`;
        html += `  </div>`;
        html += `  <div id="selColor${this.id}" class="col" style="cursor: pointer;" >`;
        html += `    <i class="far ${this.color?"fa-dot-circle":"fa-circle"} mr-2 float-left mt-1"></i>`;
        html += `    <span class="float-left mt-1">Colorear</span>`;
        html += `  </div>`;
        html += `</div>`;
        return html;
    } 

    getProgressHTML() {return ""}

    query(args) {
        throw "No query";
    }
}

class RasterQuery extends GEOOSQuery {
    static fromSearchItem(item) {
        return new RasterQuery(item.geoServer, item.dataSet, item.variable, item.format);
    }

    constructor(geoServer, dataSet, variable, format, level) {
        super({
            //type:"raster", name:variable.name, code:variable.code, icon:"img/icons/point.svg"
            type:"raster", name:variable.name, code:variable.code, icon:"img/icons/empty.png"
        });
        this.variable = variable;
        this.format = format;
        this.geoServer = geoServer;
        this.dataSet = dataSet;
        this.temporality = variable.temporality;
        this.level = level;
        if (this.variable.levels && this.level === undefined) this.level = this.variable.options && this.variable.options.defaultLevel !== undefined?this.variable.options.defaultLevel:0;
        //this.accum = "sum";        
        this.progress = 100;
    }

    static cloneQuery(q) {
        let c = new RasterQuery(q.geoServer, q.dataSet, q.variable, q.format, q.level);
        return c;
    }

    get unit() {return this.variable && this.variable.unit?this.variable.unit:super.unit}
    get decimals() {return this.variable && this.variable.options && this.variable.options.decimals?this.variable.options.decimals:super.decimals}
    get levelName() {return this.variable.levels?this.variable.levels[this.level]:null}

    get minZTemporality() {
        let t = this.dataSet.temporality;
        if (t == "none") return "1y";
        if (t.unit == "hours") return "1d";
        if (t.unit == "days") return "1M";
        if (t.unit == "months") return "1y";
        return "1y"
    }
    get dependsOnTime() {return this.dataSet.temporality && this.dataSet.temporality != "none"}
    get timeRange() {
        let t = this.variable.options.temporality || this.dataSet.temporality;
        if (!t || t == "none") return 0;
        let factor;
        switch (t.unit) {
            case "minutes": factor = 60; break;
            case "hours": factor = 60 * 60; break;
            case "days": factor = 60 * 60 * 24; break;
            case "months": factor = 60 * 60 * 24 * 30; break;
            case "years": factor = 60 * 60 * 24 * 365; break;
        }
        return 1000 * factor * t.value;
    }

    serialize() {
        return {
            type:"raster", id:this.id, color:this.color, legend:this.legend, format:this.format,
            geoServer:this.geoServer.code, dataSet:this.dataSet.code, variable:this.variable.code, 
            level:this.level
        }
    }
    static deserialize(cfg) {
        let geoServer = window.geoos.getGeoServer(cfg.geoServer);
        if (!geoServer) throw "GeoServer " + cfg.geoServer + " not available";
        let dataSet = geoServer.dataSets.find(ds => ds.code == cfg.dataSet);
        if (!dataSet) throw "DataSet " + cfg.dataSet + " not available in GeoServer " + cfg.geoServer;
        let variable = dataSet.variables.find(v => v.code == cfg.variable);
        if (!variable) throw "Variable" + cfg.variable + " not available in dataSet " + cfg.dataSet + " GeoServer " + cfg.geoServer;
        let q = new RasterQuery(geoServer, dataSet, variable, cfg.format, cfg.level);
        q.id = cfg.id;
        q.color = cfg.color;
        q.legend = cfg.legend;
        return q;
    }
    query(args) {
        if (args.format) this.format = args.format;
        if (this.level !== undefined && args.level === undefined) args.level=this.level;
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
        } else if (this.format == "valueAtPoint") {
            if (!args.time) args.time = window.geoos.time;
            if (args.lat === undefined || args.lng === undefined) throw "Must provide lat,lng for Value at Point format";
        } else if (this.format == "time-serie") {
            if (!args.startTime || !args.endTime) throw "Must provide startTime and endTime arguments";
            if (args.lat === undefined || args.lng === undefined) throw "Must provide lat,lng for Value at Point format";
        } else throw "Format '" + this.format + "' not handled in RasterQuery"

        if (this.format == "isolines") {
            return this.geoServer.client.isolines(this.dataSet.code, this.variable.code, args.time, args.n, args.w, args.s, args.e, args.level, args.increment, args.fixedLevels);
        } else if (this.format == "isobands") {
            return this.geoServer.client.isobands(this.dataSet.code, this.variable.code, args.time, args.n, args.w, args.s, args.e, args.level, args.increment, args.fixedLevels);
        } else if (this.format == "grid") {
            return this.geoServer.client.grid(this.dataSet.code, this.variable.code, args.time, args.n, args.w, args.s, args.e, args.margin, args.level);
        } else if (this.format == "vectors") {
            return this.geoServer.client.vectorsGrid(this.dataSet.code, this.variable.code, args.time, args.n, args.w, args.s, args.e, args.margin);
        } else if (this.format == "valueAtPoint") {
            return this.geoServer.client.valueAtPoint(this.dataSet.code, this.variable.code, args.time, args.lat, args.lng, args.level);
        } else if (this.format == "time-serie") {
            return this.geoServer.client.timeSerie(this.dataSet.code, this.variable.code, args.startTime, args.endTime, args.lat, args.lng, args.level);
        }
    }

    getHTML(cantDelete) {
        let html =  `
            <div class="row mt-1">
                <div class="col">
            `;
        if (!cantDelete) {
            html += `
                    <i id="delVar${this.id}" class="fas fa-trash-alt mr-2 float-left mt-1" data-z-clickable="true" style="cursor: pointer;"></i>
                `
        }
        html += `
                    <img class="mr-1 mt-1 float-left inverse-image" height="16px" src="${this.icon}"/>
                    <span id="varName${this.id}" class="selectable-name mt-1 float-left">${this.name}</span>
                </div>
            </div>
        `
        if (this.variable.levels && this.variable.levels.length) {
            if (this.level === undefined) this.level = this.variable.options && this.variable.options.defaultLevel !== undefined?this.variable.options.defaultLevel:0;
            let options = this.variable.levels.reduce((html, l, idx) => {
                html += "<option value='" + idx + "'";
                if (idx == this.level) html += " selected";
                html += ">" + l + "</option>";
                return html;
            },"")
            html += `
            <div class="ml-4">
                <div class="row mt-1">
                    <div class="col">
                        <select id="edNivel${this.id}" class="custom-select custom-select-sm">${options}</select>
                    </div>
                </div>
            </div>
            `;
        }
        return html;
    }

    getProgressHTML() {
        let html = `
            <div id="rowWorking${this.id}" class="row mt-1" ${this.progress >= 100?'style="display: none;"':''}>
                <div class="col">
                    <i class="mr-1 float-left fas fa-spin fa-spinner"></i>
                    <div class="progress">
                        <div id="progress${this.id}" class="progress-bar" role="progressbar" style="width: ${parseInt(this.progress)}px; "></div>
                    </div>
                </div>
            </div>
        `        
        return html;
    } 
    updateProgress(container) {
        let rowWorking = container.find("#rowWorking" + this.id);
        if (!rowWorking) return;
        if (this.progress > 0 && this.progress < 100) {
            rowWorking.style.removeProperty("display");
            container.find("#progress" + this.id).style.width = this.progress + "%";
        } else {
            rowWorking.style.display = "none";
        }
    }

    registerListeners(container, listeners) {
        if (container.find("#delVar" + this.id)) {
            container.find("#delVar" + this.id).onclick =  _ => {
                if (listeners.onDelete) listeners.onDelete(this);
            }
        }
        if (container.find("#selLegend" + this.id)) {
            container.find("#selLegend" + this.id).onclick = _ => {
                if (listeners.onLegendChange) listeners.onLegendChange()
            }
        }
        if (container.find("#selColor" + this.id)) {
            container.find("#selColor" + this.id).onclick = _ => {
                if (listeners.onColorChange) listeners.onColorChange()
            }
        }
        if (container.find("#edNivel" + this.id)) {
            container.find("#edNivel" + this.id).onchange = _ => {
                let l = container.find("#edNivel" + this.id).value;
                this.level = parseInt(l);
                if (listeners.onChange) listeners.onChange(this);
            }
        }
        container.find("#varName" + this.id).onclick = _ => {
            container.showDialog("common/WSelectVariables", {dimCode:this.config.minZDimension, layerName:this.config.layerName, singleSelection:listeners.singleSelection}, variables => {
                if (listeners.onSelect) listeners.onSelect(variables)
            })
        }
    }
}

class MinZQuery extends GEOOSQuery {
    static fromSearchItem(item) {
        if (!item.accum && item.variable.options.defaults && item.variable.options.defaults.accum) {
            item.accum = item.variable.options.defaults.accum;
        }
        return new MinZQuery(item.zRepoServer, item.variable, item.path, null, [], item.accum)
    }
    constructor(zRepoServer, variable, groupingDimension, fixedFilter, filters, accum) {
        super({
            type:"minz", name:variable.name, code:variable.code, icon:"img/icons/dashboard.svg"
        })
        this.zRepoServer = zRepoServer;
        this.variable = variable;
        this.temporality = variable.temporality;
        this.groupingDimension = groupingDimension;
        this.fixedFilter = fixedFilter;
        this.filters = filters;
        this.accum = accum || "sum";

        this.descripcionFiltros = null;
        this.descripcionAgrupador = null;
    } 

    get unit() {return this.variable && this.variable.options && this.variable.options.unit?this.variable.options.unit:super.unit}
    get decimals() {return this.variable && this.variable.options && this.variable.options.decimals?this.variable.options.decimals:super.decimals}
    get minZTemporality() {return this.temporality}
    get dependsOnTime() {return true}
    get timeRange() {
        let t = this.temporality;
        console.log("minzQuery Temporality", t);
        if (!t || t == "none") return 0;
        return rangosTemporalidad[t];
    }

    get colorScale() {
        if (this.variable.options && this.variable.options.colorScale) return this.variable.options.colorScale;
        return super.colorScale;
    }

    static cloneQuery(q) {
        let c = new MinZQuery(q.zRepoServer, q.variable, q.groupingDimension, q.fixedFilter, q.filters, q.accum);
        c.descripcionAgrupador = q.descripcionAgrupador;
        c.descripcionFiltros = q.descripcionFiltros;
        c.monstationsLayerCode = q.monstationsLayerCode;
        return c;
    }

    get allFiltros() {
        let ret = [];
        if (this.fixedFilter && this.fixedFilter.ruta) {
            ret.push({filtro:this.fixedFilter, fijo:true});            
        }
        this.filters.forEach(f => ret.push({
            filtro:f, fijo:false
        }))
        return ret;
    }

    serialize() {
        return {
            type:"minz", id:this.id, color:this.color, legend:this.legend, accum:this.accum,
            descripcionAgrupador:this.descripcionAgrupador, descripcionFiltros: this.descripcionFiltros,
            startTime:this.startTime, endTime:this.endTime, temporality: this.temporality,
            filters:this.filters, fixedFilter:this.fixedFilter, 
            groupingDimension:this.groupingDimension, timeDescription:this.timeDescription, 
            zRepoServer:this.zRepoServer.url, variable:this.variable.code,
            monstationsLayerCode:this.monstationsLayerCode
        }
    }
    static deserialize(cfg) {
        let zRepoServer = window.geoos.zRepoServers.find(s => s.url == cfg.zRepoServer);
        if (!zRepoServer) throw "ZRepoServer " + cfg.zRepoServer + " not available";
        let variable = zRepoServer.variables.find(v => v.code == cfg.variable);
        if (!variable) throw "Variable" + cfg.variable + " not available in ZRepoServer " + cfg.zRepoServer;
        let q = new MinZQuery(zRepoServer, variable, cfg.groupingDimension, cfg.fixedFilter, cfg.filters, cfg.accum);
        q.id = cfg.id;
        q.temporality = cfg.temporality;
        q.color = cfg.color;
        q.legend = cfg.legend;
        q.monstationsLayerCode = cfg.monstationsLayerCode;
        return q;
    }

    async getHTML() {
        if (!this.descripcionFiltros) await this.construyeDescripcionFiltros();
        let html =  `
            <div class="row mt-1">
                <div class="col">
                    <i id="delVar${this.id}" class="fas fa-trash-alt mr-2 float-left mt-1" data-z-clickable="true" style="cursor: pointer;"></i>
                    <img class="mr-1 mt-1 float-left inverse-image" height="16px" src="${this.icon}"/>
                    <span id="nombreVar${this.id}" class="mt-1 float-left">${this.name}</span>
                </div>
            </div>
        `;

        html += "<div class='row mt-1'>";
        html += "  <div class='col-sm-5 pr-0'>";
        html += "    <select id='edAcumulador" + this.id + "' class='custom-select custom-select-sm' >";
        html += Object.keys(descAcums).reduce((html, a) => {
            return html + "<option value='" + a + "' " + (this.accum == a?" selected":"") + ">" + descAcums[a] + "</option>";
        }, "");
        html += "    </select>";
        html += "  </div>";
        html += "  <div class='col-sm-7 pl-1'>";
        html += "    <select id='edTemporalidad" + this.id + "' class='custom-select custom-select-sm' >";
        let nivel = nivelesTemporalidad.indexOf(this.variable.temporality);
        html += nivelesTemporalidad.slice(nivel).reduce((html, t) => {
            return html + "<option value='" + t + "' " + (this.temporality == t?" selected":"") + ">" + descTempos[t] + "</option>";
        }, "");
        html += "    </select>";
        html += "  </div>";
        html += "</div>";  
        if (this.descripcionAgrupador) {
            html += `
                <div class="row mt-1">
                    <div class="col">
                        <i class="fas fa-columns mr-2 float-left mt-1"></i>
                        <span>Agrupado por ${this.descripcionAgrupador}</span>
                    </div>
                </div>`
        }
        let descFiltros = this.descripcionFiltros;
        if (!descFiltros) {
            console.warn("No se ha construido la descripción de filtros para la consulta");
        } else {
            if (!descFiltros.length) {
                html += `
                <div class="row mt-1">
                    <div class="col">
                        <i class="fas fa-filter mr-2 float-left mt-1"></i>
                        <span class="filtro-${this.id} selectable-name" data-z-clickable="true"'>Aplicar Filtros</span>
                        <i class="filtro-${this.id} fas fa-caret-right ml-1 float-right mt-1"></i>
                    </div>
                </div>`
            } else {
                html += "<ul style='padding-left:10px; margin-top:5px; margin-bottom:0; '>";
                html += descFiltros.reduce((html, f, i) => {
                    html += "<li class='filtro-" + this.id + " selectable-name'>";
                    if (!i) html += "Para ";
                    else html += "y ";
                    html += f.etiqueta + "</li>";
                    return html;
                }, "")
                html += "</ul>";
            }
        }

        return html;
    }

    async describeFiltro(filtro) {        
        try {
            let clasificadoresPath = this.zRepoServer.client.describeRuta(this.variable, filtro.ruta);
            let st = clasificadoresPath.reduce((st, c) => {
                if (st.length) st += " => ";
                st += c.name;
                return st;
            }, "");
            let etiquetaValor;
            // Tomar datos del último clasificador para mostrar
            if (filtro.valor && filtro.valor.startsWith("${codigo-objeto}")) {
                st += " en mapa";
                etiquetaValor = "Selección en Mapa";
            } else {
                let c = clasificadoresPath[clasificadoresPath.length - 1];            
                let row = await this.zRepoServer.client.getValorDimension(c.dimensionCode, filtro.valor);            
                let v = row?row.name:filtro.valor;
                st += " igual a '" + v + "'";
                etiquetaValor = v;
            }
            return {etiqueta:st, etiquetaValor};
        } catch(error) {
            console.error(error);
            throw error;
        }
    }
    async construyeDescripcionFiltros() {
        try {
            let ret = [];
            if (this.fixedFilter && this.fixedFilter.ruta) {
                let etiquetas = await this.describeFiltro(this.fixedFilter);
                ret.push({
                    etiqueta:etiquetas.etiqueta,
                    etiquetaValor:etiquetas.etiquetaValor,
                    fijo:true,
                    ruta:this.fixedFilter.ruta,
                    valor:this.fixedFilter.valor
                });
            }
            for (let i=0; i<this.filters.length; i++) {
                let etiquetas = await this.describeFiltro(this.filters[i]);
                ret.push({
                    etiqueta:etiquetas.etiqueta,
                    etiquetaValor:etiquetas.etiquetaValor,
                    fijo:false,
                    ruta:this.filters[i].ruta,
                    valor:this.filters[i].valor
                });
            }
            this.descripcionFiltros = ret;
            if (this.groupingDimension) {
                this.descripcionAgrupador = (await this.describeFiltro({ruta:this.groupingDimension, valor:"${codigo-objeto}"})).etiqueta
            } else {
                this.descripcionAgrupador = null;
            }
        } catch(error) {
            console.error(error);
            this.descripcionFiltros = null;
        }
    }

    registerListeners(container, listeners) {
        let edAcumulador = container.find("#edAcumulador" + this.id);
        edAcumulador.onchange = _ => {
            this.accum = edAcumulador.value;
            if (listeners.onChange) listeners.onChange(this);
        };
        let edTemporalidad = container.find("#edTemporalidad" + this.id);
        edTemporalidad.onchange = _ => {
            this.temporality = edTemporalidad.value;
            if (listeners.onChange) listeners.onChange(this);
        };
        container.findAll(".filtro-" + this.id).forEach(element => {
            element.onclick = _ => {
                container.showDialog("common/WMinZFilters", {consulta:this}, newConsulta => {
                    this.filters = JSON.parse(JSON.stringify(newConsulta.filters));
                    this.descripcionFiltros = newConsulta.descripcionFiltros;
                    this.descripcionAgrupador = newConsulta.descripcionAgrupador;
                    if (listeners.onChange) listeners.onChange(this);
                })
            }
        })
        if (container.find("#delVar" + this.id)) {
            container.find("#delVar" + this.id).onclick =  _ => {
                if (listeners.onDelete) listeners.onDelete(this);
            }
        }
        if (container.find("#selLegend" + this.id)) {
            container.find("#selLegend" + this.id).onclick = _ => {
                if (listeners.onLegendChange) listeners.onLegendChange()
            }
        }
        if (container.find("#selColor" + this.id)) {
            container.find("#selColor" + this.id).onclick = _ => {
                if (listeners.onColorChange) listeners.onColorChange()
            }
        }
    }

    construyeArbolFiltrosDesde(nodos, dimOVar, path0, x0, y0, subArbolHabilitado, max) {
        if (max.x === undefined || x0 > max.x) max.x = x0;
        let dimensiones = this.zRepoServer.dimensiones;
        let y = y0;
        for (let i=0; i<dimOVar.classifiers.length; i++) {
            let c = dimOVar.classifiers[i];
            let nodo = {
                x:x0, y:y, clasificador:c, editable:subArbolHabilitado
            }
            if (max.y === undefined || y > max.y) max.y = y;
            let path = path0 + (path0.length?".":"") + c.fieldName;
            nodo.ruta = path;
            let filtro = this.allFiltros.find(f => f.filtro.ruta == path);
            if (filtro) {
                nodo.filtro = filtro.filtro;
                if (filtro.fijo) nodo.editable = false;
                let desc = this.descripcionFiltros.find(f => f.ruta == path);
                nodo.descripcionFiltro = desc;
            } else if (subArbolHabilitado) {
                // Si es parte de la ruta del filtro fijo, se deshabilita
                if (this.allFiltros.find(f => f.fijo && f.filtro.ruta.startsWith(path))) {
                    nodo.editable = false;
                }
            }
            let dim = dimensiones.find(d => d.code == c.dimensionCode);
            if (!dim) throw "No se encontró la dimensión '" + c.dimensionCode + "' desde " + dimOVar.name;
            if (dim.classifiers && dim.classifiers.length) {
                nodo.nodos = [];
                y = this.construyeArbolFiltrosDesde(nodo.nodos, dim, path, x0 + 1, y, nodo.editable && !nodo.filtro, max);
            } else {
                y++;
            }
            nodos.push(nodo);
        }
        return y;
    }
    getArbolFiltros() {
        let nodos = [], max = {x:undefined, y:undefined};
        this.construyeArbolFiltrosDesde(nodos, this.variable, "", 1, 0, true, max);
        return {max:max, nodos:nodos};
    }
    agregaFiltro(ruta, valor) {
        // Eliminar filtros existentes en subarbol
        this.filters.filter(f => f.ruta.startsWith(ruta + ".")).forEach(f => this.eliminaFiltro(f));

        this.filters.push({ruta:ruta, valor:valor});        
    }
    eliminaFiltro(filtro) {
        let idx = this.filters.findIndex(f => f.ruta == filtro.ruta);
        if (idx < 0) {
            throw "No se encontró el filtro por " + filtro.ruta;
        }
        this.filters.splice(idx, 1);
    }

    query(args) {
        let fixedFilter = JSON.parse(JSON.stringify(this.fixedFilter || {}));
        if (args.objectCode && fixedFilter) {
            if (fixedFilter.valor == "${codigo-objeto}") fixedFilter.valor = args.objectCode;
        }
        let q;
        if (args.startTime) {
            this.startTime = args.startTime;
            this.endTime = args.endTime;
            this.timeDescription = "custom";
        } else {
            let time = args.time || window.geoos.time;
            let temporality = args.temporality || this.variable.temporality;
            let {t0, t1, desc} = this.zRepoServer.client.normalizaTiempo(temporality, time);
            this.startTime = t0; this.endTime = t1; this.timeDescription = desc;
        }
        if (args.format == "dim-serie") {
            q = {
                tipoQuery:"dim-serie", 
                filtros:this.filters, 
                variable:this.variable, 
                dimensionAgrupado:this.groupingDimension,
                acumulador:this.accum,
                temporality:this.temporality
            }
        } else if (args.format == "time-serie") {
            q = {
                tipoQuery:"time-serie", 
                filtros:this.filters, 
                filtroFijo:fixedFilter,
                variable:this.variable, 
                acumulador:this.accum,
                temporalidad:this.temporality
            }
        } else throw "Format '" + args.format + "' not handled";
        return this.zRepoServer.client.query(q, this.startTime, this.endTime);
    }
}
