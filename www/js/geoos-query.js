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

    static cloneQuery(q) {
        if (q.type == "raster") return RasterQuery.cloneQuery(q)
        else if (q.type == "minz") return MinZQuery.cloneQuery(q);
        console.error("Query", q);
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
    getLegendColorHTML() {
        let html = "";
        html += `<div class="row mt-1">`;
        html += `  <div id="selLegend${this.id}" class="col" style="cursor: pointer;" >`;
        html += `    <i class="far ${this.legend?"fa-check-square":"fa-square"} mr-2 float-left mt-1"></i>`;
        html += `    <span class="float-left mt-1">Leyendas</span>`;
        html += `  </div>`;
        html += `  <div id="selColor${this.id}" class="col" style="cursor: pointer;" >`;
        html += `    <i class="far ${this.color?"fa-check-circle":"fa-circle"} mr-2 float-left mt-1"></i>`;
        html += `    <span class="float-left mt-1">Colorear</span>`;
        html += `  </div>`;
        html += `</div>`;
        return html;
    } 

    query(args) {
        throw "No query";
    }
}

class RasterQuery extends GEOOSQuery {
    static fromSearchItem(item) {
        return new RasterQuery(item.geoServer, item.dataSet, item.variable, item.format);
    }

    constructor(geoServer, dataSet, variable, format) {
        super({
            type:"raster", name:variable.name, code:variable.code, icon:"img/icons/point.svg"
        });
        this.variable = variable;
        this.format = format;
        this.geoServer = geoServer;
        this.dataSet = dataSet;
        this.temporality = variable.temporality;
        this.accum = "sum";
    }

    static cloneQuery(q) {
        let c = new RasterQuery(q.geoServer, q.dataSet, q.variable, q.format);
        return c;
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

    getHTML() {
        let html =  `
            <div class="row mt-1">
                <div class="col">
                    <i id="delVar${this.id}" class="fas fa-trash-alt mr-2 float-left mt-1" data-z-clickable="true" style="cursor: pointer;"></i>
                    <img class="mr-1 mt-1 float-left inverse-image" height="16px" src="${this.icon}"/>
                    <span id="nombreVar${this.id}" class="mt-1 float-left">${this.name}</span>
                </div>
            </div>
        `
        if (this.variable.levels && this.variable.levels.length) {
            html += `
            <div class="ml-4">
                <div class="row mt-1">
                    <div class="col-4">
                        <label class="etiqueta-subpanel-propiedades mb-0">Nivel</label>
                    </div>
                    <div class="col-8">
                        <div id="edNivel${this.id}"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <label id="lblNivel${this.id}" class="etiqueta-subpanel-propiedades mb-0">...</label>
                    </div>
                </div>
            </div>
            `;
        }
        return html;
    }
}

class MinZQuery extends GEOOSQuery {
    static fromSearchItem(item) {
        return new MinZQuery(item.zRepoServer, item.variable, item.path, null, [], item.accum)
    }
    constructor(zRepoServer, variable, groupingDimension, fixedFilter, filters, accum) {
        super({
            type:"minz", name:variable.name, code:variable.code, icon:"img/icons/dashboard.svg"
        })
        this.zRepoServer = zRepoServer;
        this.variable = variable;
        this.groupingDimension = groupingDimension;
        this.fixedFilter = fixedFilter;
        this.filters = filters;
        this.accum = accum || "sum";

        this.descripcionFiltros = null;
        this.descripcionAgrupador = null;
    } 

    static cloneQuery(q) {
        let c = new MinZQuery(q.zRepoServer, q.variable, q.groupingDimension, q.fixedFilter, q.filters);
        c.descripcionAgrupador = q.descripcionAgrupador;
        c.descripcionFiltros = q.descripcionFiltros;
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
        container.find("#delVar" + this.id).onclick =  _ => {
            if (listeners.onDelete) listeners.onDelete(this);
        }
        container.find("#selLegend" + this.id).onclick = _ => {
            if (listeners.onLegendChange) listeners.onLegendChange()
        }
        container.find("#selColor" + this.id).onclick = _ => {
            if (listeners.onColorChange) listeners.onColorChange()
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
        let q;
        if (args.startTime) {
            this.startTime = args.startTime;
            this.endTime = args.endTime;
            this.timeDescription = "custom";
        } else {
            let time = args.time || window.geoos.time;
            let {t0, t1, desc} = this.zRepoServer.client.normalizaTiempo(this.variable.temporality, time);
            this.startTime = t0; this.endTime = t1; this.timeDescription = desc;
        }
        if (args.format == "dim-serie") {
            q = {
                tipoQuery:"dim-serie", 
                filtros:this.filters, 
                variable:this.variable, 
                dimensionAgrupado:this.groupingDimension,
                acumulador:this.accum
            }
        } else throw "Format '" + args.format + "' not handled";
        return this.zRepoServer.client.query(q, this.startTime, this.endTime);
    }
}
