class GEOOSUser {
    get config() {
        if (this._config) return this._config;
        let cfg = localStorage.getItem("geoos-config");
        if (!cfg) {
            cfg = JSON.stringify({
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
                }
            })
        }
        this._config = JSON.parse(cfg);
        return this._config;
    }

    saveConfig() {
        localStorage.setItem("geoos-config", JSON.stringify(this._config));
    }
}
