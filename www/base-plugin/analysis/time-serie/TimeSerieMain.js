class TimeSerieMain extends ZCustomController {
    onThis_init(options) {
        this.analyzer = options.analyzer;
        this.chart = null;
        this.refreshChart();
    }

    get watcher1() {return this.analyzer.watcher1}
    get watcher2() {return this.analyzer.watcher2}

    doResize() {
        let size = this.size;   
        this.chartContainer.size = size;
        if (this.chart) this.chart.setSize(size.width, size.height);
    }

    refresh() {this.refreshChart(true)}

    refreshChart(recreate) {
        if (this.chart && recreate) {
            this.chartContainer.html = "";
            this.chart = null;
        }
        try {
            let title = null, subtitle = null;
            let series = [];
            let yAxis = [];
            this.variables = [];
            this.timeRanges = [];            
            if (this.watcher1 && this.analyzer.data1.serie) {
                this.variables.push(this.watcher1);
                title = this.watcher1.name;
                //if (variable.niveles && variable.niveles.length > 1) title += " [" + variable.niveles[variable.nivel].descripcion + "]";
                let serieType = "spline";
                //console.log("variable1", this.watcher1.variable);
                if (this.watcher1.variable && this.watcher1.variable.options && this.watcher1.variable.options.defaults) {
                    if (this.watcher1.variable.options.defaults.serieType) serieType = this.watcher1.variable.options.defaults.serieType;
                }
                series.push({
                    type:serieType,
                    name:title,
                    data:this.analyzer.data1.serie,
                    turboThreshold: 0                    
                });
                this.timeRanges.push(this.watcher1.timeRange);
                yAxis.push({id:"primary", title:{text:this.watcher1.unit}});
            }
            if (this.watcher2 && this.analyzer.data2.serie) {
                this.variables.push(this.watcher2);
                let useSecondaryAxes = false;
                if (series.length && yAxis[0].title.text != this.watcher2.unit) {
                    useSecondaryAxes = true;
                    yAxis.push({id:"secondary", title:{text:this.watcher2.unit}, opposite:true});
                } else if (!series.length) {
                    yAxis.push({id:"primary", title:{text:this.watcher2.unit}});
                }
                if (!series.length) {
                    title = this.watcher2.name;
                    //if (variable.niveles && variable.niveles.length > 1) title += " [" + variable.niveles[variable.nivel].descripcion + "]";
                } else {
                    subtitle = "v/s " + this.watcher2.name;
                    //if (variable.niveles && variable.niveles.length > 1) subtitle += " [" + variable.niveles[variable.nivel].descripcion + "]";
                }
                let serieType = "spline";
                //console.log("variable2", this.watcher2.variable);
                if (this.watcher2.variable && this.watcher2.variable.options && this.watcher2.variable.options.defaults) {
                    if (this.watcher2.variable.options.defaults.serieType) serieType = this.watcher2.variable.options.defaults.serieType;
                }
                series.push({
                    type:serieType,
                    //name:variable.nombre + (variable.niveles && variable.niveles.length > 1?variable.niveles[variable.nivel]:""),
                    name:this.watcher2.name,
                    data:this.analyzer.data2.serie,
                    turboThreshold: 0,
                    yAxis:useSecondaryAxes?"secondary":"primary"
                })
                this.timeRanges.push(this.watcher2.timeRange);
            }
            if (!this.chart && series.length) {
                let self = this;
                let options = {
                    title:{text:this.analyzer.object.name + ": " + title},
                    subtitle:subtitle?{text:subtitle}:undefined,
                    xAxis:{type:"datetime"},
                    yAxis:yAxis,
                    legend:{enabled:false},
                    plotOptions: {
                        area: {
                            fillColor: {
                                linearGradient: {x1: 0,y1: 0,x2: 0,y2: 1},
                                stops: [
                                    [0, Highcharts.getOptions().colors[0]],
                                    [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                                ]
                            },
                            marker: {radius: 2},
                            lineWidth: 1,
                            states: {hover: {lineWidth: 1}},
                            threshold: null
                        }
                    },
                    series:series,
                    credits: {
                        enabled: false
                    },   
                    legend: {
                        layout: 'vertical',
                        align: 'right',
                        verticalAlign: 'middle'
                    },
                    /*
                    tooltip:{
                        useHTML:true,
                        formatter:function()  {
                            let capa = self.variables[this.series.index];
                            let nombre = capa.nombre,
                                nombreNivel = (capa.niveles && capa.niveles.length > 1?capa.niveles[this.nivelVar2]:""),
                                origen = window.geoportal.origenes[capa.origen],
                                icono = capa.icono,
                                atributos = this.point.atributos
                            let html = "<div class='tooltip-contenido'>";
                            html += "<div class='tooltip-titulo'>" + nombre + "</div>";
                            if (nombreNivel) html += "<div class='tooltip-subtitulo'>" + nombreNivel + "</div>";
                            html += "<hr class='my-1 bg-white' />";
                            html += "<div class='tooltip-contenido'>";
                            html += "<table class='w-100'>";
                            html += "<tr>";
                            html += "<td class='icono-tooltip'><img src='" + origen.icono + "' width='14px' /></td>";
                            html += "<td class='propiedad-tooltip'>Origen:</td>";
                            html += "<td class='valor-tooltip'>" + origen.nombre + "</td>";
                            html += "</tr>";
                            
                            let valor = GeoPortal.round(this.y, capa.decimales).toLocaleString() + " [" + capa.unidad + "]";
                            html += "<tr>";
                            html += "<td class='icono-tooltip-invert'><img src='" + icono + "' width='14px' /></td>";
                            html += "<td class='propiedad-tooltip'>Valor:</td>";
                            html += "<td class='valor-tooltip'>" + valor + "</td>";
                            html += "</tr>";
                           if (atributos) {
                                Object.keys(atributos).forEach(att => {
                                    let valor = atributos[att];
                                    let icono = "fa-tag";
                                    if (att.toLowerCase().indexOf("tiempo") >= 0) {
                                        let dt = moment.tz(valor, window.timeZone);
                                        if (dt.isValid()) {
                                            valor = dt.format("DD/MMM/YYYY HH:mm");
                                            icono = "fa-clock";
                                        }
                                    }
                                    if (att.toLowerCase().indexOf("modelo") >= 0) icono = "fa-square-root-alt";
                                    if (typeof valor == "string" && valor.length > 25) valor = valor.substr(0,20) + "...";
                                    html += "<tr>";
                                    html += "<td class='icono-tooltip'><i class='fas fa-lg " + icono + "'></i></td>";
                                    html += "<td class='propiedad-tooltip'>" + att + ":</td>";
                                    html += "<td class='valor-tooltip'>" + valor + "</td>";
                                    html += "</tr>";
                                });
                                if (atributos.realLng && atributos.realLat) {
                                    window.geoportal.mapa.dibujaPuntoDatos(self.objeto.getCentroide().lat, self.objeto.getCentroide().lng, atributos.realLat, atributos.realLng, 3000);
                                }
                            }

                            html += "</table>";
                            html += "</div>";
                            html += "</div>";                            
                            return html;
                        }
                    } 
                    */                                   
                }
                this.chart = Highcharts.chart(this.chartContainer.view, options);  
                this.doResize();
            } else {
                series.forEach((serie, i) => this.chart.series[i].setData(serie.data));
                if (title) this.chart.setTitle({text:title});
                if (subtitle) this.chart.setSubtitle({text:subtitle});
            }
            // Ajustar ancho de columnas de acuerdo a temporalidad de las variables
            if (this.chart) {
                let ejeX = this.chart.xAxis[0];
                series.forEach((serie, i) => {
                    let s = this.chart.series[i];
                    if (s.type == "column" && this.timeRanges[i]) {
                        let x0 = Date.now();
                        let x1 = x0 + this.timeRanges[i];
                        let w = parseInt(ejeX.toPixels(x1, true) - ejeX.toPixels(x0, true)) - 2;
                        if (w > 5) {
                            s.update({pointWidth:w});
                        }
                    }
                });
            }
            this.triggerEvent("setCaption", "Serie de Tiempo" + (title?" / " + title + (subtitle?(" " + subtitle):""):""));
        } catch(error) {
            console.trace(error);
        }
    }
}
ZVC.export(TimeSerieMain);