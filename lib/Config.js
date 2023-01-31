const fs = require("fs");
const HJSON = require("hjson");

class Config {
    static get instance() {
        if (Config.singleton) return Config.singleton;
        Config.singleton = new Config;
        return Config.singleton;
    }

    getConfig() {
        try {
            let stats = fs.statSync("/home/config/portal.hjson");
            if (stats.mtime.getTime() != this.lastConfigTime) {
                let json = fs.readFileSync("/home/config/portal.hjson").toString("utf-8");
                this._config = HJSON.parse(json);
                this.lastConfigTime = stats.mtime.getTime();
                return this._config;                        
            } else {
                return this._config
            }
        } catch(error) {
            if (error.code == "ENOENT") return {};
            console.error("Error reading /home/config/portal.hjson", error);
            throw error;
        }
    }
    
    getWebServerConfig() {
        return this.getConfig().webServer || {http:{port:8090}}
    }
    getBaseMaps() {
        return this.getConfig().maps || [{
            code:"esri-world-physical", name:"Esri - World Physical Map",
            url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
            options:{
                attribution: 'Tiles &copy; Esri &mdash; Source: US National Park Service',
                maxZoom: 8
             }
        }]
    }
    getGeoServers() {
        return this.getConfig().geoServers || [];
    }
    getZRepoServers() {
        return this.getConfig().zRepoServers;
    }
    getGroups() {
        let c = this.getConfig();
        return {
            subjects:c.varSubjects,
            types:c.varTypes,
            regions:c.varRegions
        }
    }
    getDefaultGroupLayers() {
        return this.getConfig().defaultGroupLayers || [];
    }

    getHEREAPIKey() {
        return this.getConfig().hereAPIKey  || "eG2NCop0Fa_k1JUQUaiZvkt-pQKlSlYODS_UwKqaD6c";
    }
 
    getPlugins() {
        return this.getConfig().plugins || [];
    }
    getTemasBiblioteca() {
        return this.getConfig().temasBiblioteca;
    }
    getCapasMultimedia() {
        return this.getConfig().capasMultimedia || [];
    }
    getCapasMonitoreo(includeX_privateX) {
        //console.log("includeP¨rivates", includeX_privateX);
        let capas = this.getConfig().capasMonitoreo || [];
        // Eliminar datos privados
        if (!includeX_privateX) {
            capas = capas.map(c => {
                delete c.client_email;
                delete c.private_key;
                delete c.parentFolderId;
                delete c.importedFolderId;
                delete c.discardedFolderId;
                delete c.withErrorsFolderId;
                return c;
            });
        }
        return capas;
    }
    esAdminBiblioteca(email) {
        return (this.getConfig().adminsBiblioteca || []).indexOf(email) >= 0;
    }
}

module.exports = Config.instance;