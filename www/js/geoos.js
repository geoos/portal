class GEOOS {
    constructor() {
        this.events = new GEOOSEvents();
        this.groups = [];
        this.stationSelected = [];
        this.stationUnselected = [];
        this.selection = {type:null}
        moment.locale("es")
        this._time = Date.now();
        this.calculatePortalSize();
        window.addEventListener("resize", _ => this.triggerResize());        
        this.user = new GEOOSUser();
    }

    async init() {
        console.log("[GEOOS] Inicializando");
        this.config = await zPost("getPortalConfig.geoos");
        await this.buildMetadata();
        this.scalesFactory = new ScalesFactory();
        await this.scalesFactory.init();
        this.events.on("map", "click", async p => await this.unselectObject())
        await this.inicializaPlugins();
        await GEOOSTool.inicializaDashboards();
        this.buildMonstationsLayers();

        console.log("[GEOOS] Inicializado");
    }

    get baseMaps() {return this.config.maps}
    get pluginConfigs() {return this.config.plugins}
    get regions() {return this.config.groups.regions}
    get subjects() {return this.config.groups.subjects}
    get types() {return this.config.groups.types}
    get providers() {return this._providers}
    get temasBiblioteca() {return this.config.temasBiblioteca || []}

    get map() {return this.mapPanel.map}
    get time() {return this._time}
    set time(t) {
        this._time = t;
        this.events.trigger("portal", "timeChange");
    }
    get moment() {return moment.tz(this.time, window.timeZone)}
    set moment(m) {
        if (this._time && m.valueOf() != this._time) { 
            this.time = m.valueOf()
        }
    }
    get bounds() {
        let b = this.map.getBounds();
        return {n:b.getNorth(), s:b.getSouth(), e:b.getEast(), w:b.getWest()}
    }
    get center() {
        let center = this.map.getCenter();
        return {lat:center.lat, lng:center.lng}
    }

    formatNumber(value, decimals, unit) {
        let pow = Math.pow(10, decimals);
        let txt = (Math.floor(value * pow) / pow).toLocaleString() + "";
        if (unit) txt += " [" + unit + "]";
        return txt;
    }
    
    getGeoServer(code) {return this.geoServers.find(s => s.code == code)}

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
        if (this.searchLocationPanel.open) this.searchLocationPanel.toggle();
        if (this.addStationsPanel.open) this.addStationsPanel.toggle();
        if (this.addObjectPanel.open) this.addObjectPanel.toggle();
        //if (this.infoBarPanel.open) this.infoBarPanel.toggle();
        this.userConfigPanel.close();
        this.userAccountPanel.close();
        this.userHelpPanel.close();
        this.userMarksPanel.close();
        this.rightHelper.close();

        this.toolsPanel.toggle("min");
    }
    openMyPanel() {
        if (!this.myPanel.open) this.myPanel.toggle();
    }
    closeMyPanel() {
        if (this.myPanel.open) this.myPanel.toggle();
    }

    openFavorites() {
        if (!this.userMarksPanel.open) this.userMarksPanel.toggle();
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
            this.zRepoServers = [];
            for (let i=0; i<this.config.zRepoServers.length; i++) {            
                let url = this.config.zRepoServers[i].url;
                let token = this.config.zRepoServers[i].token;
                nPending++;
                this.getZRepoMetadata(url, token)
                    .then(metadata => {
                        metadata.url = url;
                        metadata.token = token;
                        this.zRepoServers.push(metadata);
                        if (--nPending <= 0) {
                            this.finishBuildMetadata()
                                .then(_ => resolve()).catch(err => reject(err))
                            
                        }
                    })            
                    .catch(err => {
                        console.error(err);
                        if (--nPending <= 0) {
                            this.finishBuildMetadata()
                                .then(_ => resolve()).catch(err => reject(err))
                        }
                    })
            }
            if (!nPending) {
                this.finishBuildMetadata();
                resolve();
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
    async getZRepoMetadata(url, token) {
        try {
            let zRepoClient = new ZRepoClient(url, token);
            let metadata = await zRepoClient.readMetadata();
            metadata.client = zRepoClient;
            return metadata;
        } catch(error) {
            throw error;
        }
    }
    async finishBuildMetadata() {
        this._providers = [];
        for (let geoServer of this.geoServers) {
            let list = geoServer.providers.reduce((list, provider) => {
                if (this._providers.findIndex(p => p.code == provider.code) < 0) {
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
        await this.buildStationsMetadata();
    }    

    async buildStationsMetadata() {
        this.estaciones = {
            estaciones:{},
            proveedores:{},
            tipos:{},
            variables:{}
        }
        for (let server of this.zRepoServers) {            
            let client = server.client;
            let dimProveedor = await client.getDimension("rie.proveedor");
            let dimTipoEstacion = await client.getDimension("rie.tipoEstacion");
            let dimEstacion = await client.getDimension("rie.estacion");
            if (dimProveedor && dimTipoEstacion && dimEstacion) {
                (await client.getAllValores("rie.proveedor")).forEach(p => this.estaciones.proveedores[p.code] = p);
                (await client.getAllValores("rie.tipoEstacion")).forEach(t => this.estaciones.tipos[t.code] = t);
                let rowsEstaciones = await client.getAllValores("rie.estacion");
                for (let e of rowsEstaciones) {
                    if (e.variables && e.variables.length) {
                        e.server = server;
                        e.providers = [e.proveedor];
                        e.types = [e.tipo];                    
                        this.estaciones.estaciones[e.code] = e;
                        for (let v of e.variables) {
                            let variable = await client.getVariable(v);
                            if (!variable) {
                                console.warn("No se encontró la variable " + v + " referenciada desde la estación " + e.name + " en el servidor " + server.url);
                            } else {
                                this.estaciones.variables[v] = variable;
                            }
                        }
                    } else {
                        console.warn("La estación " + e.name + " en " + server.url + " no define variables", e);
                    }
                }
            }
        }
    }

    async getLayers(){
        let layers = [];
        for (let geoServer of this.geoServers) {
            for (let dataSet of geoServer.dataSets) {
                if (dataSet.type == "raster") {
                    for (let variable of dataSet.variables) {
                        layers.push({
                            type:"raster",
                            geoServer:geoServer, dataSet:dataSet,
                            providers:[dataSet.provider],
                            subjects:variable.options.subjects || [],
                            regions:variable.options.regions || [],
                            types:variable.options.types || [],
                            variable:variable,
                            code:dataSet.code + "." + variable.code, 
                            name:variable.name
                        })
                    }
                }else if (dataSet.type == "vector") {
                    for (let file of dataSet.files) {
                        layers.push({
                            type:"vector",
                            name:file.commonName,
                            geoServer:geoServer,
                            dataSet:dataSet,
                            providers:[dataSet.provider],
                            subjects:file.options.subjects || [],
                            regions:file.options.regions || [],
                            types:file.options.types || [],
                            file:file,
                            code:dataSet.code + "." + file.name 
                        })
                    }
                }
            }
        }
        let stations = this.getAddedStations();
        let added = {};
        for (let station of stations) {
            for (let varCode of station.variables) {
                if (!added[varCode]) {
                    let v = await station.server.client.getVariable(varCode);
                    v.options = v.options || {};
                    layers.push({
                        type:"minz", name:v.name, path:"estacion", variable:v,
                        zRepoServer:station.server,
                        providers:[v.options.provider],
                        subjects:v.options.subjects || [],
                        regions:v.options.regions || [],
                        types:v.options.types || [],
                        code:v.code
                    })
                    added[varCode] = true;
                }
            }
        }
        layers.sort((l1, l2) => (l1.name > l2.name?1:-1))
        return layers;
    }

    async getStations(){
        let layers = [];
        let stations = this.getAddedStations();
        let added = {};
        for (let station of stations) {
            for (let varCode of station.variables) {
                if (!added[varCode]) {
                    let v = await station.server.client.getVariable(varCode);
                    v.options = v.options || {};
                    layers.push({
                        type:"minz", name:v.name, path:"estacion", variable:v,
                        zRepoServer:station.server,
                        providers:[v.options.provider],
                        subjects:v.options.subjects || [],
                        regions:v.options.regions || [],
                        types:v.options.types || [],
                        code:v.code
                    })
                    added[varCode] = true;
                }
            }
        }
        layers.sort((l1, l2) => (l1.name > l2.name?1:-1))
        return layers;
    }

    async getAvailableLayers(type, dimCode, monstationsLayerCode) {
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
                                subjects:variable.options.subjects || [],
                                regions:variable.options.regions || [],
                                types:variable.options.types || [],
                                variable:variable,
                                code:dataSet.code + "." + variable.code, 
                                name:variable.name
                            })
                        }
                    }
                }
            }
        } else if (type == "vector") {
            for (let geoServer of this.geoServers) {
                for (let dataSet of geoServer.dataSets) {
                    if (dataSet.type == "vector") {
                        for (let file of dataSet.files) {
                            layers.push({
                                type:"vector",
                                name:file.commonName,
                                geoServer:geoServer,
                                dataSet:dataSet,
                                providers:[dataSet.provider],
                                subjects:file.options.subjects || [],
                                regions:file.options.regions || [],
                                types:file.options.types || [],
                                file:file,
                                code:dataSet.code + "." + file.name 
                            })
                        }
                    }
                }
            }
        } else if (type == "multimedia") {
            for (let l of this.config.capasMultimedia) {
                let clone = JSON.parse(JSON.stringify(l));
                clone.type = "multimedia";
                clone.providers = clone.provider?[clone.provider]:[];
                clone.subjects = clone.subjects || [];
                clone.regions = clone.regions || [];
                clone.types = clone.types || [];
                layers.push(clone);
            }
        } else if (type == "tiles") {
            for (let geoServer of this.geoServers) {
                for (let dataSet of geoServer.dataSets) {
                    if (dataSet.type == "tiles") {
                        for (let map of dataSet.maps) {
                            layers.push({
                                type:"tiles",
                                name:map.commonName,
                                geoServer:geoServer,
                                dataSet:dataSet,
                                providers:[dataSet.provider],
                                subjects:map.options.subjects || [],
                                regions:map.options.regions || [],
                                types:map.options.types || [],
                                map:map,
                                code:dataSet.code + "." + map.name 
                            })
                        }
                    }
                }
            }
        } else if (type == "special") {
            layers.push({
                type:"rasterFormula",
                name:"Capa Calculada (Raster)",
                providers:[],
                subjects:[],
                regions:[],
                types:[],
                map:map,
                code:"rasterFormula" 
            })
        } else if (type == "minz") {            
            let variables = this.getVariablesFiltrablesPorDimension(dimCode);
            for (let v of variables) {
                v.variable.options = v.variable.options || {};
                layers.push({
                    type:"minz", name:v.variable.name, path:v.ruta, variable:v.variable,
                    zRepoServer:v.server,
                    providers:[v.variable.options.provider],
                    subjects:v.variable.options.subjects || [],
                    regions:v.variable.options.regions || [],
                    types:v.variable.options.types || [],
                    code:v.variable.code
                })
            }
        } else if (type == "stations") {
            let stations = this.getAddedStations();
            let added = {};
            for (let station of stations) {
                for (let varCode of station.variables) {
                    if (!added[varCode]) {
                        let v = await station.server.client.getVariable(varCode);
                        v.options = v.options || {};
                        layers.push({
                            type:"minz", name:v.name, path:"estacion", variable:v,
                            zRepoServer:station.server,
                            providers:[v.options.provider],
                            subjects:v.options.subjects || [],
                            regions:v.options.regions || [],
                            types:v.options.types || [],
                            code:v.code
                        })
                        added[varCode] = true;
                    }
                }
            }
        } else if (type == "monstations") {
            if (!monstationsLayerCode) {
                return this.monstationsLayers;
            } else {
                console.log("Rescartar variables monitoreadas de", monstationsLayerCode);
                let layer = this.monstationsLayers.find(l => l.code == monstationsLayerCode);
                if (!layer) throw "No se encontró la capa de monstations " + monstationsLayerCode;
                for (let code of layer.variables) {
                    let v = await layer.zRepoServer.client.getVariable(code);
                    if (!v) {
                        console.error("No se encontró la variable " + code + " en el ZRepoServer " + layer.zRepoServer.url);
                        continue;
                    }
                    v.options = v.options || {};
                    layers.push({
                        type:"minz", name:v.name, path:layer.varStationPath, variable:v,
                        zRepoServer:layer.zRepoServer,
                        providers:[layer.provider],
                        subjects:layer.subjects || [],
                        regions:layer.regions || [],
                        types:layer.types || [],
                        code:v.code
                    });
                }
            }
        } else {
            throw "Layer type '" + type + "' not yet supported";
        }
        layers.sort((l1, l2) => (l1.name > l2.name?1:-1))
        return layers;
    }

    getZRepoServerByURL(url) {
        return this.zRepoServers.find(s => s.url == url);
    }

    buildMonstationsLayers() {
        this.monstationsLayers = this.config.capasMonitoreo || [];
        // Asignar zRepoServer
        this.monstationsLayers = this.monstationsLayers.map(c => {
            let zRepoServer = this.getZRepoServerByURL(c.zRepoServer);
            if (!zRepoServer) throw "No se encontró el ZRepoServer definido en la capa de Monitore de Estaciones: " + c.code;
            c.type = "monstations";
            c.zRepoServer = zRepoServer;
            c.providers = [c.provider];
            c.subjects = c.subjects || [];
            c.regions = c.regions || [];
            c.types = c.types || [];
            return c;
        });
    }

    getMultimediaLayer(code) {
        for (let l of this.config.capasMultimedia) {
            if (l.code == code) {
                let clone = JSON.parse(JSON.stringify(l));
                clone.type = "multimedia";
                clone.providers = clone.provider?[clone.provider]:[];
                clone.subjects = clone.subjects || [];
                clone.regions = clone.regions || [];
                clone.types = clone.types || [];
                return clone;
            }            
        }
        return null;
    }

    getAvailableStations() {
        if (this.listaEstaciones) return this.listaEstaciones;
        this.listaEstaciones = Object.keys(this.estaciones.estaciones).reduce((list, e) => {
            list.push(this.estaciones.estaciones[e]);
            return list;
        }, []).sort((e1, e2) => (e2.lat - e1.lat));
        return this.listaEstaciones;
    }

    getVariablesFiltrablesPorDimension(dimCode) {
        let ret = [];
        for (let zRepoServer of this.zRepoServers) {
            let variables = zRepoServer.client.getVariablesFiltrables(dimCode);
            variables.forEach(v => v.server = zRepoServer);
            ret = ret.concat(variables);
        }
        return ret;
    }

    getGroup(id) {return this.groups.find(g => g.id == id)}
    getGroupByName(groupName) { return this.groups.find(g => g.config.name == groupName) }
    getActiveGroup() {return this.groups.find(g => (g.active))}
    
    async toggleInitialGroup(id) {
        if (this.user.config.favorites.initialGroup == id) {
            this.user.config.favorites.initialGroup = null;
        } else {
            this.user.config.favorites.initialGroup = id;
        }
        await this.user.saveConfig();
    }
    getFavoriteGroup(id){
        let favorite = this.user.config.favorites;
        //console.log("Grupos favoritos:", favorite);
        return favorite.groups.find(g => g.id == id)
    }
    addGroup(config) {
        let g = new GEOOSGroup(config);
        this.groups.push(g);
        return g;
    }
    addExistingGroup(g) {
        this.groups.push(g);
        return g;
    }
    async deleteGroup(id) {
        try {
            if (this.groups.length == 1) throw "[ERROR] No puede eliminar el último grupo";
            if (this.selection.type == "group" && this.selection.element.id == id) {
                await this.unselect();
            }
            let group = this.getGroup(id);
            if (group.active) {
                let newActive = this.groups.find(g => !g.active);
                this.activateGroup(newActive.id);
            }
            let idx = this.groups.findIndex(g => g.id == id);
            this.groups.splice(idx,1);
            await this.events.trigger("portal", "groupDeleted", group)
        } catch(error) {
            throw ("[ERROR] No se pudo eliminar el grupo", error);
        }
    }

    async activateGroup(groupId) {
        let g = this.getGroup(groupId);
        if (!g) throw "Can't find group '" + groupId + "'";
        let current = this.getActiveGroup();

        if (current) {
            if (this.getSelectedTool()) {
                // deactivate current tool, saving its id in old group
                let oldSelectedToolId = current.selectedToolId;
                await this.selectTool(null)
                current.selectedToolId = oldSelectedToolId;
            }
            current.savedTimeStep = this.timePanel.getTimeStep();
            await current.deactivate();
            await this.events.trigger("portal", "groupDeactivated", current);
        }
        await g.activate();
        if (g.savedTimeStep) this.timePanel.setTimeStep(g.savedTimeStep);
        if (g.selectedToolId) {
            let oldSelectedToolId = g.selectedToolId;
            g.selectedToolId = null; // prevent deactivate without activate in tool
            await this.selectTool(oldSelectedToolId);
        }        
        await this.events.trigger("portal", "groupActivated", g)
        this.checkToolsValidity();
    }

    async addLayers(layers, inGroup) {
        let group = inGroup || this.getActiveGroup();
        for (let layerDef of layers) {
            let geoosLayer = GEOOSLayer.create(layerDef);
            group.addLayer(geoosLayer);
        }
        await this.events.trigger("portal", "layersAdded", group)
    }
    async addLayer(layer, inGroup) {
        let group = inGroup || this.getActiveGroup();
        let geoosLayer = GEOOSLayer.create(layer);
        group.addLayer(geoosLayer);
        await this.events.trigger("portal", "layerAdded", group)
    }

     async addFavLayer(layer){
        // Clonar
        let l2 = GEOOSLayer.deserialize(layer.serialize());
        l2.regenerateIds();    
        this.user.config.favorites.layers.push(l2.serialize());
        await this.user.saveConfig();
        await this.events.trigger("portal", "userConfigChanged");
    } 

    async addFavStation(station){
        let found = this.user.config.favorites.stations.find(element => element.code===station.code)
        if (!found){
            this.user.config.favorites.stations.push(station);
            this.user.saveConfig();
            await this.events.trigger("portal", "userConfigChanged");
        }
    }

    isFavStation(code) {
        return this.user.config.favorites.stations.findIndex(element => element.code===code) >= 0;
    }

    async addFavGroup(group){
        // Clonar
        let g2 = GEOOSGroup.deserialize(group.serialize());
        g2.regenerateIds();
        console.log("serializado", g2.serialize());
        this.user.config.favorites.groups.push(g2.serialize());
        await this.user.saveConfig();
        await this.events.trigger("portal", "userConfigChanged");
    }

    async deleteFavLayer(layerId){
        let favorites = this.user.config.favorites;
        let idx = favorites.layers.findIndex(l => l.id == layerId);
        if (idx >= 0) {
            favorites.layers.splice(idx, 1);
            await this.user.saveConfig();
            await this.events.trigger("portal", "userConfigChanged");
        }
    }

    async deleteFavStation(code){
        let idx = this.user.config.favorites.stations.findIndex(element => element.code == code)
        if(idx >= 0) {
            this.user.config.favorites.stations.splice(idx, 1);
            await this.user.saveConfig();
            await this.events.trigger("portal", "userConfigChanged");
        }
    }

    async deleteFavGroup(groupId){
        let idx = this.user.config.favorites.groups.findIndex(g => g.id == groupId);
        if (idx >= 0) {
            this.user.config.favorites.groups.splice(idx, 1);            
        }
        if (this.user.config.favorites.initialGroup == groupId) {
            this.user.config.favorites.initialGroup = null;
        }
        await this.user.saveConfig();
        await this.events.trigger("portal", "userConfigChanged");
    }

    async deleteFavLayerInGroup(groupId, layerId){
        let grpIdx = this.user.config.favorites.groups.findIndex(g => g.id == groupId);
        if (grpIdx >= 0) {
            let grp = this.user.config.favorites.groups[grpIdx];
            let layIdx = grp.layers.findIndex(l => l.id == layerId);
            if (layIdx >= 0) {
                grp.layers.splice(layIdx, 1);
                if (!grp.layers.length) {
                    await this.deleteFavGroup(groupId);
                } else {
                    await this.user.saveConfig();
                    await this.events.trigger("portal", "userConfigChanged");
                }
            }
        } 
    }

    async unselect() {
        if (!this.selection.type) return;
        let oldSelection = this.selection;
        this.selection = {type:null}
        await this.events.trigger("portal", "selectionChange", {oldSelection:oldSelection, newSelection:this.selection})
        
    }
    async selectElement(type, element) {
        if (!type) {
            this.unselect();
            return;
        }        
        let oldSelection = this.selection;                
        this.selection = {type:type, element:element};
        await this.events.trigger("portal", "selectionChange", {oldSelection:oldSelection, newSelection:this.selection})
    }

    async selectObject(object) {
        this.mapPanel.ignoreNextClick = true;
        if (this.selectedObject) {
            this.selectedObject = object;
            await this.events.trigger("map", "selectedObjectReplaced", this.selectedObject);
        } else {
            this.selectedObject = object;
            await this.events.trigger("map", "objectSelected", this.selectedObject);
        }
    }

    async unselectObject() {
        if (!this.selectedObject) return;
        let selected = this.selectedObject;
        this.selectedObject = null;
        await this.events.trigger("map", "objectUnselected", selected);
    }

    addStation(code, group) {
        let g;
        if(!group) g = this.getActiveGroup();
        else g = group;
        let e = this.estaciones.estaciones[code];
        let p = this.estaciones.proveedores[e.proveedor]
        //let l = g.getStationsLayer(p.code);
        let l = g.getStationsLayer();
        if (!l) {
            l = g.createStationsLayer();
            this.events.trigger("portal", "layersAdded", g);
        /*
        }else if(l.id != p.code){
            l = g.createStationsLayer(p.name, p.code);
            this.events.trigger("portal", "layersAdded", g);
        */
        }
        //console.log("[DBG] l", l);
        l.addStation(code);
    }

    addStations(list) {
        let g = this.getActiveGroup();
        let l = g.getStationsLayer();
        if (!l) {
            l = g.createStationsLayer();
            this.events.trigger("portal", "layersAdded", g)
        }
        l.addStations(list);
    }
    removeStation(code) {
        let g = this.getActiveGroup();  
        let l = g.getStationsLayer();
        if (!l) throw "No hay capa de estaciones";
        l.removeStation(code);
        if (!l.hasStations()) {
            g.removeStationsLayer();
            this.events.trigger("portal", "layersRemoved", g)
        }
    }

    removeStations(list) {
        let g = this.getActiveGroup();
        let l = g.getStationsLayer();
        if (!l) throw "No hay capa de estaciones";
        l.removeStations(list);
        if (!l.hasStations()) {
            g.removeStationsLayer();
            this.events.trigger("portal", "layersRemoved", g)
        }
    }

    isStationAdded(code) {
        if (!this.getActiveGroup()) return false;
        let l = this.getActiveGroup().getStationsLayer();
        if (!l) return false;
        return l.containsStation(code);
    }
    
    selectStation(code){
        let found = this.stationSelected.findIndex(s => s==code);
        if(found!=-1 && this.stationSelected.length == 1){
            this.unselectStation(code, 2);
            this.stationSelected = [];
        }else if(found!=-1) {
            this.unselectStation(code, 2)
            this.stationSelected.splice(found, 1);
        }else{
            this.stationSelected.push(code)
            this.unselectStation(code, 1)
        } 
    }

    unselectStation(code, type){
        let found = this.stationUnselected.findIndex(s => s==code);
        if(found!=-1 && type == 1){
            if (this.stationUnselected.length == 1) this.stationUnselected = [];
            else this.stationUnselected.splice(found, 1);
        }else if (found==-1 && type == 2){
            this.stationUnselected.push(code);
        }
    }
    unselStations(){
        this.stationUnselected = [];
    }

    isStationSelected(code){
        if(this.stationSelected.find(s => s==code)) return true;
    }

    toggleStation(code) {
        if (this.isStationAdded(code)) this.removeStation(code);
        else this.addStation(code);
    }
    getAddedStations() {
        if (!this.getActiveGroup()) return [];
        let l = this.getActiveGroup().getStationsLayer();
        if (!l) return [];
        return l.getStations();
    }
    getUserObjects() {
        let g = this.getActiveGroup();
        let l = g.getUserObjectsLayer();
        if (!l) return [];
        return l.getUserObjects();
    }
    getUserObject(id) {
        let g = this.getActiveGroup();
        let l = g.getUserObjectsLayer();
        if (!l) return null;
        return l.getUserObjects().find(o => (o.id == id));
    }
    addUserObject(o) {        
        let g = this.getActiveGroup();
        let l = g.getUserObjectsLayer();
        if (!l) {
            l = g.createUserObjectsLayer();
            this.events.trigger("portal", "layersAdded", g)
        }
        l.addUserObject(o);
        this.events.trigger("layer", "layerItemsChanged", l);
        this.events.trigger("userObject", "added", o);
    }
    async removeUserObject(id) {
        let g = this.getActiveGroup();
        let l = g.getUserObjectsLayer();
        if (!l) throw "No User Objects Layer in Active Group";
        l.removeUserObject(id);
        await this.checkToolsValidity();
        await this.events.trigger("layer", "layerItemsChanged", l);
        this.events.trigger("userObject", "deleted", id);
    }

    getTools() {
        return this.getActiveGroup().tools;
    }
    getTool(id) {
        let g = this.getActiveGroup();
        return g.tools.find(t => (t.id == id));
    }
    getSelectedTool() {
        let g = this.getActiveGroup();
        if (!g.selectedToolId) return null;
        return this.getTool(g.selectedToolId);
    }
    async addTool(tool) {
        let g = this.getActiveGroup();
        g.tools.push(tool);        
        await this.selectTool(tool.id);
        await this.events.trigger("tools", "toolAdded", tool);
    }
    async removeTool(id) {
        let g = this.getActiveGroup();
        let idxOld = g.tools.findIndex(t => t.id == id);
        if (idxOld < 0) throw "Can't remove tool " + id + ". Not found";
        let oldTool = this.getTool(id);
        let newToolId = null;
        let idxNew = g.tools.findIndex(t => t.id != id);
        if (idxNew >= 0) {
            newToolId = g.tools[idxNew].id;
        }
        await this.selectTool(newToolId);
        g.tools.splice(idxOld, 1);
        this.events.trigger("tools", "toolRemoved", oldTool);
    }    
    async selectTool(id) {
        let g = this.getActiveGroup();
        let oldSelected = this.getSelectedTool();
        if (oldSelected) await oldSelected.deactivate();
        if (id !== null) {
            let tool = this.getTool(id);
            if (!tool) throw "Tool id '" + id + "' not found to select";
            await tool.activate();
            g.selectedToolId = id;
        } else {
            g.selectedToolId = null;
        }
        await this.events.trigger("tools", "selectionChange", {old:oldSelected, new:this.getSelectedTool()});
    }

    async checkToolsValidity() {
        // clone tools array
        let tools = this.getActiveGroup().tools.reduce((list, tool) => [...list, tool], []);
        for (let tool of tools) {
            let valid = await tool.isValid();
            if (!valid) await this.removeTool(tool.id);
        }
    }

    neutralizaTildes(st) {
        const dic = {"á":"a", "é":"e", "í":"i", "ó":"o", "ú":"u", "ñ": "n", "ü":"u"}
        let ret = "";
        for (let i=0; i<st.length; i++) {
            let ch = st.substr(i,1).toLowerCase();
            ret += dic[ch] || ch;
        }
        return ret;
    }

    get plugins() {return Object.keys(this._plugins).map(code => (this._plugins(code)))}
    getPlugin(code) {return this._plugins[code]}

    async inicializaPlugins() {
        this._plugins = {};
        let headers = new Headers();
        headers.append('pragma', 'no-cache');
        headers.append('cache-control', 'no-cache');
        for (let pc of this.pluginConfigs) {
            try {
                let jsResponse = await fetch(pc + "/plugin.js", {headers:headers});
                if (jsResponse.status != 200) throw "HTTP code " + jsResponse.status + " returned by '" + pc + "/plugin.js'"
                let jsCode = await jsResponse.text();
                let pi = eval(jsCode);
                if (!pi || !pi instanceof GEOOSPlugIn) throw "No plugin object returned by '" + pc + "/plugin.js'"
                pi.basePath = pc;
                this._plugins[pi.code] = pi;
                await this.inicializaPlugin(pi);
            } catch(error) {
                console.error(error);
                console.error("Cannot initialize Plugin at '" + pc + "/plugin.js'");
            }
        }
    }
    async inicializaPlugin(pi) {
        let includes = [].concat(pi.includeFiles);
        await this.leeArchivosPlugin(pi, includes);
    }

    leeArchivosPlugin(pi, list) {
        return new Promise((resolve, reject) => this.leeSiguienteArchivo(pi, list, resolve, reject))
    }    
    leeSiguienteArchivo(pi, list, resolve, reject) {
        if (!list || !list.length) {
            resolve();
            return;
        }
        if (list[0].endsWith(".js")) {
            let script = document.createElement('script');
            script.onload = _ => {
                list.splice(0,1);
                this.leeSiguienteArchivo(pi, list, resolve, reject);
            };
            script.onerror = error => {
                console.error("Error reading '" + list[0] + "'", error);
            }
            script.src = pi.basePath + "/" + list[0];
            document.head.appendChild(script);
            console.log("  -> " + list[0])
        } else if (list[0].endsWith(".css")) {
            let link = document.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.setAttribute('href', pi.basePath + "/" + list[0]);
            link.onload = _ => {                
                list.splice(0,1);
                this.leeSiguienteArchivo(pi, list, resolve, reject);
            };
            link.onerror = error => {
                console.error("Error reading '" + list[0] + "'", error);
            }
            document.head.appendChild(link);
            console.log("  -> " + list[0])
        } else {
            console.error("Archivos del tipo de '" + list[0] + "' no manejado");
        }
    }

    login(sesion) {
        this.userSession = sesion;
        window.zSecurityToken = sesion.token;        
    }
    logout() {
        this.userSession = null;
        window.zSecurityToken = null;
    }
    saveSesion(sesion) {
        this.userSession = sesion;        
    }
    triggerLogged() {
        setTimeout(async _ => {
            let userConfig = await zPost("getUserConfig.geoos");
            this.user.setServerConfig(userConfig);
            await this.events.trigger("portal", "userConfigChanged");
        }, 200);
    }
    triggerNotLogged() {
        setTimeout(async _ => {
            this.user.setLocalConfig();
            await this.events.trigger("portal", "userConfigChanged");
        }, 200);
    }
    /*
    isDefault(group){
        if(this.user.config.defaultGroup == null || this.user.config.defaultGroup == undefined) {
            this.user.config.defaultGroup = {layers:[]};
            return false
        }else if (!this.user.config.defaultGroup.layers || this.user.config.defaultGroup.layers.length === 0) {
            //console.log("def 1:", this.user.config.defaultGroup)
            this.user.config.defaultGroup = {layers:[]};
            return false;
        }else {
            //console.log("def 2:", this.user.config.defaultGroup.length, this.user.config.defaultGroup)
            let defLayers = GEOOSGroup.deserialize(this.user.config.defaultGroup).layers;
            if(group.layers.length == defLayers.length){
                for (var i = 0; i < group.layers.length; i++) {
                    if(group.layers[i].id != defLayers[i].id) return false;
                }
            }else return false;
        }
        return true;    
    }

    addDefault(group){
        this.user.config.defaultGroup = {layers:[]};
        this.user.config.defaultGroup = group;
        this.user.saveConfig();
    }

    deleteDefault(id){
        if(this.user.config.defaultGroup.id === id){
            this.user.config.defaultGroup = {layers:[]};
        }
        this.user.saveConfig();
    }
    
    getDefault(){
        if(this.user.config.defaultGroup == null || this.user.config.defaultGroup == undefined) {
            this.user.config.defaultGroup = {layers:[]};
        }else if(!this.user.config.defaultGroup.layers || this.user.config.defaultGroup.layers.length === 0){
            this.user.config.defaultGroup = {layers:[]};
        }else {
            //console.log("gr", this.user.config.defaultGroup);
            let newGroup = GEOOSGroup.deserialize(this.user.config.defaultGroup);
            return newGroup;
        }
    }
    */
}

window.geoos = new GEOOS();