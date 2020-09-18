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

    createPanelForLayer(layer) {
        let p = this.map.createPane("ly-" + layer.id);
        p.id = "ly-" + layer.id;
        p.style.pointerEvents = "none";
        return p;
    }
    destroyPanelFromLayer(layer) {
        L.DomUtil.remove(document.getElementById("ly-" + layer.id));
    }
    adjustPanelZIndex(layer) {
        let p = document.getElementById("ly-" + layer.id);
        p.style.zIndex = 500 + layer.index;
    }
}
ZVC.export(Map);