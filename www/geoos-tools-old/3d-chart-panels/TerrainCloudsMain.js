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
        if (!this.tool.hasData()) return;
        let terrainScale = window.geoos.scalesFactory.createScale(
            window.geoos.scalesFactory.byName("Agua - Tierra"),
            {name:"Agua - Tierra", auto:true, clipOutOfRange:false}
        );
        let cloudsScale = window.geoos.scalesFactory.createScale(
            window.geoos.scalesFactory.byName("Transparencia Lineal Blanca"),
            {name:"Transparencia Lineal Blanca", auto:false, min:0, max:100, clipOutOfRange:false} 
        );
        let cloudLevels = [-1, 1000, 2500, 6000]; // Starting at 1 (as tool data grids array)
        
        let grids = this.tool.data.reduce((list, d) => [...list, d.grid], []);
        terrainScale.setRange(grids[0].min, grids[0].max);
        let serieDatas = [];
        let minLng, maxLng, minLat, maxLat, minTerrainHeight;
        for (let i=0; i<4; i++) {
            let grid = grids[i];
            let serieData = [];
            for (let iLat=0, lat=grid.foundBox.lat0; iLat<grid.nrows; iLat++, lat += grid.foundBox.dLat) {
                let row = grid.rows[iLat];
                for (let iLng=0, lng=grid.foundBox.lng0; iLng<grid.ncols; iLng++, lng += grid.foundBox.dLng) {
                    if (i == 0) {
                        serieData.push([lng, lat, row[iLng]]);
                        if (minTerrainHeight === undefined || row[iLng] < minTerrainHeight) minTerrainHeight = row[iLng];
                    } else {
                        serieData.push([lng, lat, cloudLevels[i], row[iLng]]);
                    }                    
                }
            }
            let lng0 = grid.foundBox.lng0, lng1 = grid.foundBox.lng1;
            let lat0 = grid.foundBox.lat0, lat1 = grid.foundBox.lat1;
            if (minLng === undefined || lng0 < minLng) minLng = lng0;
            if (maxLng === undefined || lng1 > maxLng) maxLng = lng1;
            if (minLat === undefined || lat0 < minLat) minLat = lat0;
            if (maxLat === undefined || lat1 > maxLat) maxLat = lat1;
            serieDatas.push(serieData);
        }

        let min = Math.min(minTerrainHeight, 0), max = 6000;
        let distLng = turf.distance(turf.point([minLng, (minLat + maxLat) / 2]), [maxLng, (minLat + maxLat) / 2]);
        let distLat = turf.distance(turf.point([(minLng + maxLng) / 2, minLat]), [(minLng + maxLng) / 2, maxLat]);
        let dZ = (max -min) / 1000;
        // Ajustar proporcion de acuerdo a las distancias 
        if (distLng > distLat) {
            let factor = (distLng - distLat) / distLat;
            let dLat = factor * grids[0].nrows * grids[0].foundBox.dLat;
            minLat -= dLat / 2;
            maxLat += dLat / 2;
        } else {
            let factor = (distLat - distLng) / distLng;
            let dLng = factor * grids[0].ncols * grids[0].foundBox.dLng;
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
        

        let options = {
            title:{text:this.tool.name},
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
                    formatter:v => v.toFixed(2) + " [m]"
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
            series: serieDatas.reduce((list, serieData, i) => {
                list.push({
                    type: 'surface',
                    silent: true,
                    wireframe: {
                        show: true
                    },
                    itemStyle: {
                        color: params => {
                            if (i == 0) {
                                let z = params.data[2];
                                return terrainScale.getColor(z);
                            } else {
                                let z = params.data[3];
                                return cloudsScale.getColor(z);
                            }
                        }
                    },
                    data: serieData,
                    shading: 'realistic',
                    realisticMaterial: {
                        roughness: 0.1,
                        metalness: 0.5
                    }
                });
                return list;
            }, [])
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