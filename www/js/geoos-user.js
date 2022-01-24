class GEOOSUser {
    get defaultConfig() {
        return {
            name:"Usuario Anónimo", 
            toolsConfig:{tool1:"3d-chart", tool2:"3d-terrain-clouds"},
            mapConfig:{
                selectedMap:"esri-world-physical",
                namesLayer:false,
                grid:{
                    show:true, 
                    color1:"#000000", width1:1, step1:10,
                    color2:"#000000", width2:0.2, step2:5
                }
            },
            favorites:{
                layers:[],
                groups:[],
                stations:[]
            },
            defaultGroup:{}
        }
    }
    get config() {
        if (this._config) return this._config;
        this.configType = "local";
        let cfg = localStorage.getItem("geoos-config");
        if (!cfg) {
            cfg = JSON.stringify(this.defaultConfig)
        }
        this._config = JSON.parse(cfg);
        return this._config;
    }

    setServerConfig(serverConfig) {
        this._config = serverConfig || this.defaultConfig;
        this.configType = "server";
    }
    setLocalConfig() {
        this._config = null;
        let c = this.config; // load local
    }

    saveConfig() {
        if (this.configType == "local") {
            localStorage.setItem("geoos-config", JSON.stringify(this._config));
        } else {
            zPost("saveUserConfig.geoos", {config:this._config});
        }
    }
}
