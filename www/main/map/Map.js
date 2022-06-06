class Map extends ZCustomController {
    onThis_init() {
        window.geoos.mapPanel = this;
        let southWest = L.latLng(-89.98155760646617, -180);
        let northEast = L.latLng(89.99346179538875, 180);
        this.map = L.map(this.mapContainer.id, {
            zoomControl:false, 
            attributionControl:false,
            minZoom:3, maxZoom:12,
            maxBounds:[southWest, northEast]
        }).setView([-33.034454, -71.592093], 6);

        this.map.on("click", e => {
            if (this.ignoreNextClick) {
                this.ignoreNextClick = false;
                return;
            }
            let lat = e.latlng.lat;
            let lng = e.latlng.lng;
            let point = this.map.latLngToContainerPoint([lat, lng]);
            window.geoos.events.trigger("map", "click", {lat:lat, lng:lng, x:point.x, y:point.y});
        });
        this.map.on("mousemove", e => {
            let lat = e.latlng.lat;
            let lng = e.latlng.lng;
            let point = this.map.latLngToContainerPoint([lat, lng]);
            this.currentPoint = {lat:lat, lng:lng, x:point.x, y:point.y};
            window.geoos.events.trigger("map", "move", this.currentPoint);
        });

        // Limitar desplazamiento en el mapa
        /*
        let southWest = L.latLng(-89.98155760646617, -180);
        let northEast = L.latLng(89.99346179538875, 180);
        let bounds = L.latLngBounds(southWest, northEast);
        map.setMaxBounds(bounds);
        map.on('drag', _ => {
            map.panInsideBounds(bounds, { animate: false });
        });
        */

        let mapConfig = window.geoos.user.config.mapConfig;
        let baseMap = window.geoos.baseMaps.find(m => m.code == mapConfig.selectedMap)

        let mapOpts = baseMap.options;
        this.mapBasePanel = this.map.createPane("baseMap");
        this.mapBasePanel.id = "baseMap";
        this.mapBasePanel.style["z-index"] = 100;
        mapOpts.pane = this.mapBasePanel.id;
        this.lyBase = L.tileLayer(baseMap.url, mapOpts);
        this.lyBase.addTo(this.map);

        this.namesLayerPanel = this.map.createPane("mapNames");
        this.namesLayerPanel.id = "mapNames";
        this.mapBasePanel.style["z-index"] = 101;
        this.lyLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
            pane:this.namesLayerPanel.id
        });
        if (mapConfig.namesLayer) {
            this.lyLabels.addTo(this.map);
        }

        // Map Grid
        this.mapGridPanel = this.map.createPane("mapGrid");
        this.mapGridPanel.id = "mapGrid";
        this.mapGridPanel.style["z-index"] = 995;
        this.resetGrid();        
        
        // Highlights
        this.highlightsPanel = this.map.createPane("highlights");
        this.highlightsPanel.id = "highlights";
        this.highlightsPanel.style["z-index"] = 998;
        this.highlightsKonvaLeafletLayer = new KonvaLeafletLayer(this.map, null, null, {pane:this.highlightsPanel.id});
        this.highlightsKonvaLeafletLayer.addTo(window.geoos.map);
        this.highlightsKonvaLeafletLayer.addVisualizer("highlights", new GEOOSHighlights({}))
        window.geoos.highlights = this.highlightsKonvaLeafletLayer.getVisualizer("highlights");
        window.geoos.highlights.init();
        
        // Interactions
        this.interactionsPanel = this.map.createPane("interactions");
        this.interactionsPanel.id = "interactions";
        this.interactionsPanel.style["z-index"] = 999;
        this.interactionsKonvaLeafletLayer = new KonvaLeafletLayer(this.map, null, null, {pane:this.interactionsPanel.id});
        this.interactionsKonvaLeafletLayer.addTo(window.geoos.map);
        this.interactionsKonvaLeafletLayer.addVisualizer("interactions", new GEOOSInteractions({}))
        window.geoos.interactions = this.interactionsKonvaLeafletLayer.getVisualizer("interactions");       
    }

    resetBaseMap(code) {
        let mapConfig = window.geoos.user.config.mapConfig;
        mapConfig.selectedMap = code;
        let baseMap = window.geoos.baseMaps.find(m => m.code == mapConfig.selectedMap)

        this.lyBase.remove();
        let mapOpts = baseMap.options;
        this.lyBase = L.tileLayer(baseMap.url, mapOpts);
        this.lyBase.addTo(this.map);
    }
    resetNamesLayer(selected) {
        let mapConfig = window.geoos.user.config.mapConfig;
        mapConfig.namesLayer = selected;
        if (mapConfig.namesLayer) {
            this.lyLabels.addTo(this.map);
        } else {
            this.lyLabels.remove();
        }
    }
    resetGrid() {
        let gridConfig = window.geoos.user.config.mapConfig.grid;
        if (!gridConfig.show) {
            if (this.showingGrid) {
                this.mapGridKonvaLeafletLayer.removeFrom(this.map);
                this.mapGridKonvaLeafletLayer = null;
                this.showingGrid = false;
            }
            return;
        }
        if (!this.showingGrid) {
            this.mapGridKonvaLeafletLayer = new KonvaLeafletLayer(this.map, null, null, {pane:this.mapGridPanel.id});
            this.mapGridKonvaLeafletLayer.addTo(window.geoos.map);
            this.mapGridKonvaLeafletLayer.addVisualizer("grid", new MapGridVisualizer({}))
            this.showingGrid = true;
        }
        this.mapGridKonvaLeafletLayer.getVisualizer("grid").update();
    }

    serialize() {
        let center = this.map.getCenter();
        return {lat:center.lat, lng:center.lng, zoom:this.map.getZoom()}
    }
    deserialize(s) {
        this.map.flyTo([s.lat, s.lng], s.zoom);
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

    zoomIn() {
        let z = this.map.getZoom();
        if (z < 12) this.map.setZoom(z + 1);
    }
    zoomOut() {
        let z = this.map.getZoom();
        if (z > 3) this.map.setZoom(z - 1);
    }

    async getPicture() {
        try {
            let canvas = await html2canvas(this.view, {
                allowTaint:true, useCORS:true
            });
            return canvas;
        } catch (error) {
            console.error(error);
        }
    }

    async takePicture() {
        try {
            let canvas = await this.getPicture();
            let dataURL = canvas.toDataURL();
            var image = new Image();
            image.src = dataURL;
            var w = window.open("");
            w.document.write(image.outerHTML);
        } catch (error) {
            console.error(error);
        }
    }
}
ZVC.export(Map);