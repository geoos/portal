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
            console.error("Error reading /home/config/config.hjson", error);
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

    getHEREAPIKey() {
        return this.getConfig().hereAPIKey  || "eG2NCop0Fa_k1JUQUaiZvkt-pQKlSlYODS_UwKqaD6c";
    }
 
    getPlugins() {
        return this.getConfig().plugins || [];
    }
}

module.exports = Config.instance;