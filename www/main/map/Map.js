class Map extends ZCustomController {
    onThis_init() {
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
}
ZVC.export(Map);