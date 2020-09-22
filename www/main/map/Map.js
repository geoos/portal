class Map extends ZCustomController {
    onThis_init() {
        window.geoos.mapPanel = this;
        this.map = L.map(this.mapContainer.id, {
            zoomControl:false, 
            attributionControl:false,
            minZoom:2, maxZoom:12
        }).setView([-33.034454, -71.592093], 6);

        let baseMap = window.geoos.baseMaps[0];

        let mapOpts = baseMap.options;
        this.lyBase = L.tileLayer(baseMap.url, mapOpts);

        this.lyBase.addTo(this.map);
    }

    doResize(size) {
        setTimeout(_ => this.map.invalidateSize(), 400);
    }

    createPanelForLayer(layer) {
        let p = this.map.createPane("ly-" + layer.id);
        p.id = "ly-" + layer.id;
        p.style.pointerEvents = "none";
        this.adjustOpacity(layer);
        return p;
    }
    destroyPanelFromLayer(layer) {
        L.DomUtil.remove(document.getElementById("ly-" + layer.id));
    }
    adjustPanelZIndex(layer) {
        let p = document.getElementById("ly-" + layer.id);
        p.style.zIndex = 500 + (layer.group.layers.length - layer.index);
    }
    adjustOpacity(layer) {
        document.getElementById("ly-" + layer.id).style.opacity = layer.opacity / 100;
    }
}
ZVC.export(Map);