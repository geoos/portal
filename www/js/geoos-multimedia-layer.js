// https://github.com/Leaflet/Leaflet.markercluster
// https://github.com/lennardv2/Leaflet.awesome-markers


class GEOOSMultimediaLayer extends GEOOSLayer {
    constructor(config) {
        super(config);
        //console.log("creando capa desde config", config);
        config.layerDefinition = window.geoos.getMultimediaLayer(config.code);
        if (!config.layerDefinition) throw "No se encontró la definición de la capa multimedia '" + config.code + "'";
        if (!config.tolerancia && config.layerDefinition.tolerancia) config.tolerancia = JSON.parse(JSON.stringify(config.layerDefinition.tolerancia));
    }

    get layerCode() {return this.config.code}
    get source() {return this.config.layerDefinition.source || "static"}
    get staticElements() {
        if (!this.config.layerDefinition || !this.config.layerDefinition.staticElements) return [];
        return this.config.layerDefinition.staticElements;
    }
    get tolerancia() {return this.config.tolerancia}

    serialize() {
        let l = super.serialize();
        l.type = "multimedia";
        l.code = this.layerCode;
        l.tolerancia = this.tolerancia;
        return l;
    }
    static deserialize(s, config) {
        //config.layerDefinition = window.geoos.getMultimediaLayer(s.code);
        config.code = s.code;
        let layer = new GEOOSMultimediaLayer(config);
        layer.id = s.id;
        return layer;
    }

    async create() {
        this.timeChangeListener = async _ => {
            if (this.source != "static") {
                this.markersChanged = true;
                this.items = await this.queryItems();
            }
            this.refresh();
        };
        window.geoos.events.on("portal", "timeChange", this.timeChangeListener);

        this.pane = window.geoos.mapPanel.createPanelForLayer(this);
        this.markers = L.markerClusterGroup();
        this.markers.addTo(window.geoos.map);
        this.items = await this.queryItems();
        this.markersChanged = true;
        await this.refresh();
    }
    async destroy() {
        window.geoos.events.remove(this.timeChangeListener);
        if (this.markers) {
            window.geoos.map.removeLayer(this.markers);
            this.markers = null;
        }
        window.geoos.mapPanel.destroyPanelFromLayer(this);
    }
    reorder() {
        window.geoos.mapPanel.adjustPanelZIndex(this);
    }

    async reload() {
        this.items = await this.queryItems();
        this.markersChanged = true;
        await this.refresh();
    }
    async refresh() {
        if (!this.group.active || !this.active) return;
        if (!this.markers) return;
        this.markersChanged = false;
        this.markers.clearLayers();
        for (let item of this.items) {
            let icon;
            if (item.type == "video") {
                icon = L.AwesomeMarkers.icon({icon: 'video', prefix: 'fa', markerColor: 'cadetblue'});
            } else if (item.type == "audio") {
                icon = L.AwesomeMarkers.icon({icon: 'microphone', prefix: 'fa', markerColor: 'darkgreen'});
            } else if (item.type == "imagen") {
                icon = L.AwesomeMarkers.icon({icon: 'image', prefix: 'fa', markerColor: 'darkred'});
            } else {
                throw "Tipo de item multimedia '" + item.type + "' no manejado";
            }
            let marker = L.marker([item.lat, item.lng], {icon});
            marker.bindTooltip(item.name);
            marker.on("click", m => this.markerClicked(m, item));
            marker.addTo(this.markers);
        }
    }

    getDataState() {
        if (this.isWorking) return "Consultando ...";
    }
    getPropertyPanels() {
        let panels = super.getPropertyPanels();
        if (this.tolerancia) {
            panels.push({
                code:"layer-tolerance", name:"Tolerancia Búsqueda Temporal", path:"./layers/multimedia/Tolerance"
            })
        }
        return panels;
    }

    async queryItems() {
        if (this.source == "static") {
            console.log("staticElements", this.staticElements);
            let items = [];
            for (let e of this.staticElements) {
                let item = JSON.parse(JSON.stringify(e));
                items.push(item);
            }
            return items;
        } else if (this.source == "google-spreadsheet") {
            let items = await zPost("getMultimediaItems.geoos", {capa:this.config.code, time:window.geoos.time, tolerancia:this.tolerancia});
            console.log("items", items);
            return items;
        } else {
            throw "Tipo de items - tiempo '" + this.source + "' no implementado";
        }
    }

    markerClicked(marker, item) {
        if (item.type == "video") {
            window.geoos.mapPanel.showDialog("main/multimedia-layer/WYoutubeVideo", {item});
        } else if (item.type == "audio") {
            window.geoos.mapPanel.showDialog("main/multimedia-layer/WAudio", {item});
        } else if (item.type == "imagen") {
            window.geoos.mapPanel.showDialog("main/multimedia-layer/WImage", {item});
        } else {
            throw "Tipo de item multimedia '" + item.type + "' no manejado";
        }
    }
}