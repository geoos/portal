class GEOOSTilesLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
    }

    get map() {return this.config.map}
    get geoServer() {return this.config.geoServer}
    get dataSet() {return this.config.dataSet}

    get options() {
        return this.config.file.options;
    }
    
    serialize() {
        let l = super.serialize();
        l.type = "tiles";
        l.map = this.map.name;
        l.geoServer = this.geoServer.code;
        l.dataSet = this.dataSet.code;
        return l;
    }
    static deserialize(s, config) {
        config.geoServer = window.geoos.getGeoServer(s.geoServer);
        if (!config.geoServer) throw "GeoServer '" + s.geoServer + "' is not available";
        config.dataSet = config.geoServer.dataSets.find(ds => ds.code == s.dataSet);
        if (!config.dataSet) throw "DataSet '" + s.dataSet + "' is no available in GeoServer '" + s.geoServer + "'";
        config.map = config.dataSet.maps.find(m => m.name == s.map);
        if (!config.map) throw "Tiles Map '" + s.map + "' is no available in DataSet '" + s.dataSet + "' in GeoServer '" + s.geoServer + "'";
        let layer = new GEOOSTilesLayer(config);
        layer.id = s.id;
        return layer;
    }

    parseURL(url) {
        let time = window.geoos.time;
        // replace all "{time:XXXX}" elements
        let p = url.indexOf("{time:");
        let idx = 0;
        let st = "";
        while (p > 0) {
            let p1 = url.indexOf("}", p);
            let fmt = url.substr(p + 6, p1 - p - 6);
            let value = "not-handled";
            if (fmt == "unix-utc") value = parseInt(time / 1000);
            st += url.substring(idx, p) + value;
            idx = p1 + 1;
            p = url.indexOf("{time:", idx);
        }
        if (idx < url.length) st += url.substr(idx);
        return st;
    }

    async create() {
        this.timeChangeListener = _ => {this.refresh()};
        window.geoos.events.on("portal", "timeChange", this.timeChangeListener);

        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        let url = this.map.urlPattern;
        if (this.dataSet.temporality != "none") url = this.parseURL(url);
        this.tileLayer = L.tileLayer(url, {pane:this.pane.id});
        this.tileLayer.addTo(window.geoos.map);
    }
    async destroy() {
        window.geoos.events.remove(this.timeChangeListener);
        if (this.tileLayer) {
            window.geoos.map.removeLayer(this.tileLayer);
            this.tileLayer = null;
        }
        window.geoos.mapPanel.destroyPanelFromLayer(this);
    }

    async refresh() {        
        if (this.dataSet.temporality != "none") {
            if (this.tileLayer) {
                this.tileLayer.setUrl(this.parseURL(this.map.urlPattern));
            }
        }        
    }

    repaint() {
        console.log("tiles layer repaint");
    }

    reorder() {
        console.log("tiles layer reorder");
        window.geoos.mapPanel.adjustPanelZIndex(this);
    }

    getPropertyPanels() {
        let panels = super.getPropertyPanels();
        return panels;
    }
}