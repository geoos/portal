class Main3DChart extends ZCustomController {
    async onThis_init(options) {
        this.tool = options.tool;
    }

    onThis_activated() {this.tool.mainPanel = this;}
    onThis_deactivated() {this.tool.mainPanel = null;}

    doResize() {
        let size = this.size;
        this.mainPanelContainer.size = size;
        this.chartContainer.size = {width:size.width, height:size.height - 10};
        if (this.chart) {
            this.chart.resize(this.chartContainer.size);
        }
    }
    async refresh() {
        this.lblHelp.text = "La variable que se grafica es '" + this.tool.variable.name + "'. Para cambiarla haga click en el ícono de configuraciones"
        let grid = this.tool.data.grid;
        if (!grid) return;
        this.tool.colorScale.setRange(grid.min, grid.max);
        let serieData = [];
        for (let iLat=0, lat=grid.foundBox.lat0; iLat<grid.nrows; iLat++, lat += grid.foundBox.dLat) {
            let row = grid.rows[iLat];
            for (let iLng=0, lng=grid.foundBox.lng0; iLng<grid.ncols; iLng++, lng += grid.foundBox.dLng) {
                serieData.push([lng, lat, row[iLng]]);
            }
        }
        let min = grid.min, max = grid.max;
        let minLat = grid.foundBox.lat0, maxLat = grid.foundBox.lat1;
        let minLng = grid.foundBox.lng0, maxLng = grid.foundBox.lng1;
        let distLng = turf.distance(turf.point([minLng, (minLat + maxLat) / 2]), [maxLng, (minLat + maxLat) / 2]);
        let distLat = turf.distance(turf.point([(minLng + maxLng) / 2, minLat]), [(minLng + maxLng) / 2, maxLat]);
        let dZ = (max -min) / 1000;
        // Ajustar proporcion de acuerdo a las distancias 
        if (this.tool.scaleLatLng) {
            if (distLng > distLat) {
                let factor = (distLng - distLat) / distLat;
                let dLat = factor * grid.nrows * grid.foundBox.dLat;
                minLat -= dLat / 2;
                maxLat += dLat / 2;
            } else {
                let factor = (distLat - distLng) / distLng;
                let dLng = factor * grid.ncols * grid.foundBox.dLng;
                minLng -= dLng / 2;
                maxLng += dLng / 2;
            }
            distLng = turf.distance(turf.point([minLng, (minLat + maxLat) / 2]), [maxLng, (minLat + maxLat) / 2]);
            distLat = turf.distance(turf.point([(minLng + maxLng) / 2, minLat]), [(minLng + maxLng) / 2, maxLat]);
            if (this.tool.scaleZ) {
                // distLng y distLat se asumen iguales
                if (distLng > dZ) {
                    let factor = (distLng - dZ) / dZ;
                    min -= 1000 * factor * dZ / 2 / this.tool.zScaleFactor;
                    max += 1000 * factor * dZ / 2 / this.tool.zScaleFactor;
                } else {
                    let factor = (dZ - distLat) / distLat;
                    let dLat = factor * grid.nrows * grid.foundBox.dLat;
                    minLat -= dLat / 2;
                    maxLat += dLat / 2;
                    factor = (dZ - distLng) / distLng;
                    let dLng = factor * grid.ncols * grid.foundBox.dLng;
                    minLng -= dLng / 2;
                    maxLng += dLng / 2;
                }
                distLng = turf.distance(turf.point([minLng, (minLat + maxLat) / 2]), [maxLng, (minLat + maxLat) / 2]);
                distLat = turf.distance(turf.point([(minLng + maxLng) / 2, minLat]), [(minLng + maxLng) / 2, maxLat]);
                dZ = (max -min) / 1000;
            }
        }

        let options = {
            title:{text:this.tool.variable.name},
            backgroundColor: '#fff',
            visualMapBACK: {
                top: 10,
                right: 10,
                pieces: [{gte: 0, color: '#612e04'}, {lt: 0, color: '#262699'}],
                outOfRange: {color: '#999'}
            },
            xAxis3D: {
                type: 'value',
                name:"Lng",
                axisLabel:{
                    formatter:v => v.toFixed(2) + "º"
                },                    
                min: minLng,
                max: maxLng
            },
            yAxis3D: {
                type: 'value',
                name:"Lat",
                axisLabel:{
                    formatter:v => v.toFixed(2) + "º"
                },
                min: minLat,
                max: maxLat
            },
            zAxis3D: {
                type: 'value',
                name:"", //titulo + " [" + this.data.unit + "]",
                axisLabel:{
                    formatter:v => v.toFixed(this.tool.variable.decimals) + " [" + this.tool.variable.unit + "]"
                },
                min: min,
                max: max
            },
            grid3D: {
                show: true,
                axisPointer: {label:{show: true}},
                viewControl: {distance: 200},
                postEffect: {enable: false},
                temporalSuperSampling: {enable: true},
                light: {
                    main: {
                        intensity: 2,
                        shadow: true
                    },
                    ambient: {
                        intensity: 0.5
                    },
                    ambientCubemap: {
                        texture:'img/canyon.hdr',
                        exposure: 2,
                        diffuseIntensity: 1,
                        specularIntensity: 1
                    }
                }
            },
            series: [{
                type: 'surface',
                silent: true,
                wireframe: {
                    show: true
                },
                itemStyle: {
                    color: params => {
                        let z = params.data[2];
                        return this.tool.colorScale.getColor(z);
                    }
                },
                data: serieData,
                shading: 'realistic',
                realisticMaterial: {
                    roughness: 0.1,
                    metalness: 0.5
                },
            }]
        }
        if (!this.chart) {
            this.doResize();
            this.chart = echarts.init(this.chartContainer.view);
            this.chart.setOption(options);
        } else {
            let changedOptions = {
                xAxis3D:options.xAxis3D,
                yAxis3D:options.yAxis3D,
                zAxis3D:options.zAxis3D,
                series:options.series,
                title:options.title
            }
            this.chart.setOption(changedOptions);
        }
    }
}
ZVC.export(Main3DChart);