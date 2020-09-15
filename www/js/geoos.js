class GEOOS {
    constructor() {
        this.events = new GEOOSEvents();
        this.calculatePortalSize();
        window.addEventListener("resize", _ => this.triggerResize());
    }

    async init() {
        this.config = await zPost("getPortalConfig.geoos");
        console.log("config", this.config);
        await this.buildMetadata();
        console.log("geoServers", this.geoServers);
    }

    get baseMaps() {return this.config.maps}
    get groups() {return this.config.groups}
    get regions() {return this.groups.regions}
    get subjects() {return this.groups.subjects}
    get types() {return this.groups.types}
    get providers() {return this._providers}

    triggerResize() {
        if (this.timerResize) clearTimeout(this.timerResize);
        setTimeout(_ => {
            this.timerResize = null;
            this.events.trigger("portal", "resize", this.calculatePortalSize())
        }, 300)
    }
    calculatePortalSize() {
        let width = document.documentElement.clientWidth;
        let height = document.documentElement.clientHeight;
        let size, sizeLevel;
        if (width <768) {size = "xs"; sizeLevel = 0;}
        else if (width < 992) {size = "s"; sizeLevel = 1;}
        else if (width < 1280) {size = "m"; sizeLevel = 2;}
        else if (width < 1366) {size = "l"; sizeLevel = 3;}
        else if (width < 1920) {size = "xl"; sizeLevel = 4;}
        else {size = "xxl"; sizeLevel = 5;}
        this.size = {width, height, size, sizeLevel};
        return this.size;
    }

    closeFloatingPanels() {
        if (this.myPanel.open) this.myPanel.toggle();
        if (this.addPanel.open) this.addPanel.toggle();
    }

    buildMetadata() {
        return new Promise((resolve, reject) => {
            let nPending = 0;        
            this.geoServers = [];
            for (let i=0; i<this.config.geoServers.length; i++) {            
                let url = this.config.geoServers[i];
                nPending++;
                this.getGeoServerMetadata(url)
                    .then(metadata => {
                        metadata.url = url;
                        this.geoServers.push(metadata);
                        if (--nPending <= 0) {
                            this.finishBuildMetadata();
                            resolve();
                        }
                    })            
                    .catch(err => {
                        console.error(err);
                        if (--nPending <= 0) {
                            this.finishBuildMetadata();
                            resolve();
                        }
                    })
            }
        })        
    }
    async getGeoServerMetadata(url) {
        try {
            let geoServerClient = new GEOServerClient(url);
            let metadata = await geoServerClient.readMetadata();
            metadata.client = geoServerClient;
            return metadata;
        } catch(error) {
            throw error;
        }

    }
    finishBuildMetadata() {
        this._providers = [];
        for (let geoServer of this.geoServers) {
            let list = geoServer.providers.reduce((list, provider) => {
                if (list.findIndex(p => p.code == provider.code) < 0) {
                    provider.logo = geoServer.url + "/" + provider.logo;
                    list.push(provider);
                }
                return list;
            }, [])
            this._providers = this._providers.concat(list);
        }
        this._providers.sort((p1, p2) => (p1.name > p2.name?1:-1));
        
        this.regions.sort((r1, r2) => (r1.name > r2.name?1:-1));
        this.regions.splice(0,0,{code:"no", name:"Sin Región Especificada"})        
        this.regions.forEach(r => r.nVars = 0);

        this.subjects.sort((r1, r2) => (r1.name > r2.name?1:-1));
        this.subjects.splice(0,0,{code:"no", name:"Sin Tema Especificado"})        
        this.subjects.forEach(r => r.nVars = 0);

        this.types.sort((r1, r2) => (r1.name > r2.name?1:-1));
        this.types.splice(0,0,{code:"no", name:"Sin Tipo Especificado"})        
        this.types.forEach(r => r.nVars = 0);
    }    

    getAvailableLayers(type) {
        let layers = [];
        if (type == "variables") {
            for (let geoServer of this.geoServers) {
                for (let dataSet of geoServer.dataSets) {
                    if (dataSet.type == "raster") {
                        for (let variable of dataSet.variables) {
                            layers.push({
                                type:"raster",
                                geoServer:geoServer, dataSet:dataSet,
                                providers:[dataSet.provider],
                                subjects:variable.options.subjects,
                                regions:variable.options.regions,
                                types:variable.options.types,
                                variable:variable,
                                code:dataSet.code + "." + variable.code, name:variable.name
                            })
                        }
                    }
                }
            }
        } else {
            throw "Layer type '" + type + "' not yet supported";
        }
        layers.sort((l1, l2) => (l1.name > l2.name?1:-1))
        return layers;
    }

    addLayers(layers) {
        console.log("addLayers", layers);
    }
}

window.geoos = new GEOOS();