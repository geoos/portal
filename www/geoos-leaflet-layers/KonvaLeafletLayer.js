L.KonvaCustomLayer = L.Layer.extend({
    options:{
        wrapper:null
    },
    initialize:function(options) {
        L.setOptions(this, options);
    },
    onAdd:function(map) {
        this.options.wrapper.onAdd();
        map.on('moveend', this._update, this);
    },
    onRemove:function(map) {
        this.options.wrapper.onRemove();
        map.off('moveend', this._update, this);
    },
    _update:function(evt) {
        this.options.wrapper.doUpdate(evt);
    }
}) 

class KonvaLeafletLayer {
    constructor(map, zIndex, options, layerOptions) {
        this.options = options;
        this.map = map;
        if (layerOptions) {
            this.uniqueId = layerOptions.pane?layerOptions.pane:parseInt(Math.random() * 99999999);
            layerOptions.wrapper = this;
            this.leafletLayer = new L.KonvaCustomLayer(layerOptions);
        } else {
            this.uniqueId = parseInt(Math.random() * 99999999);
            let paneName = "geoos" + this.uniqueId;
            map.createPane(paneName);
            //map.getPane(paneName).style.pointerEvents = "none";
            map.getPane(paneName).style.zIndex = "" + zIndex;
            this.leafletLayer = new L.KonvaCustomLayer({wrapper:this, pane:paneName});
        }
        this.visualizers = []
    }
    get lOptions() {return this.leafletLayer.options}
    get lPane() {return this.map.getPane(this.lOptions.pane)}
    get canvas() {
        return this.container.querySelector("canvas")
    }

    addTo(map) {
        this.leafletLayer.addTo(map);
    }
    removeFrom(map) {
        map.removeLayer(this.leafletLayer);
    }
    onAdd() {
        this.container = L.DomUtil.create("DIV");
        this.container.id = "kstage" + this.uniqueId;
        this.lPane.appendChild(this.container);
        this.konvaStage = new Konva.Stage({
            id:this.uniqueId,
            container:"kstage" + this.uniqueId,
            width:500, height:500
        })
        this.visualizers.forEach(v => this.konvaStage.add(v.visualizer.konvaLayer))
        this.doUpdate();
    }
    onRemove() {
        this.visualizers.forEach(v => v.visualizer.destroy())
        this.konvaStage.destroy();
        this.visualizers = [];
        L.DomUtil.remove(this.container);
    }
    doUpdate(evt) {        
        let bounds = this.map.getBounds();
        let p0 = this.map.latLngToLayerPoint(bounds.getNorthWest());
        let p1 = this.map.latLngToLayerPoint(bounds.getSouthEast());        
        this.konvaStage.width(p1.x - p0.x);
        this.konvaStage.height(p1.y - p0.y);
        this._dx = p0.x; this._dy = p0.y;
        this.visualizers.forEach(v => v.visualizer.doUpdate());        
    }
    visualizerUpdated() {        
        let bounds = this.map.getBounds();
        let p0 = this.map.latLngToLayerPoint(bounds.getNorthWest());
        L.DomUtil.setPosition(this.container, p0);
    }
    addVisualizer(id, visualizer) {
        this.visualizers.push({id:id, visualizer:visualizer});
        visualizer.stageLayer = this;
        visualizer.uniqueId = this.uniqueId + "_" + id;
        this.konvaStage.add(visualizer.konvaLayer);
        visualizer.onAttached();
        visualizer.update();
        this.reorderVisualizers()
    }
    getVisualizer(id) {
        let v = this.visualizers.find(v => v.id == id);
        return v?v.visualizer:null;
    }
    removeVisualizer(id) {
        let idx = this.visualizers.findIndex(v => v.id == id);
        if (idx >= 0) {
            this.visualizers[idx].visualizer.destroy();
            this.visualizers.splice(idx, 1);
            this.reorderVisualizers()
        }
    }
    clear() {
        this.visualizers.forEach(v => v.visualizer.destroy())
        this.visualizers = [];
        this.konvaStage.draw()
    }
    reorderVisualizers() {
        this.visualizers.sort((v1, v2) => (v1.visualizer.zIndex - v2.visualizer.zIndex))
        this.visualizers.forEach((v, i) => v.visualizer.konvaLayer.zIndex(i));
    }
}

class KonvaLeafletVisualizer {
    constructor(options) {
        this.options = options || {}
        this.konvaLayer = new Konva.Layer();
        this.stageLayer = null; // assigned in "addVisualizer"
    }
    get map() {return this.stageLayer.map}
    get zIndex() {return this.options.zIndex !== undefined?this.options.zIndex:0}
    get width() {return this.stageLayer.konvaStage.width()}
    get height() {return this.stageLayer.konvaStage.height()}
    get stageCanvas() {return this.stageLayer.canvas}

    toCanvas(mapPoint) {
        let p = this.map.latLngToLayerPoint(mapPoint);
        return {x:p.x - this.stageLayer._dx, y:p.y - this.stageLayer._dy}
    }
    toMap(point) {
        return this.map.layerPointToLatLng({x:point.x + this.stageLayer._dx, y:point.y + this.stageLayer._dy})
    }

    onAttached() {}

    destroy() {
        this.konvaLayer.destroy()
    }
    doUpdate() {
        if (this.beforeUpdate() != false) {
            this.update();
        }
    }
    beforeUpdate() {
        if (this.options.onBeforeUpdate) return this.options.onBeforeUpdate();
    }
    afterUpdate() {
        if (this.options.onAfterUpdate) return this.options.onAfterUpdate();
    }
    update() {
        this.stageLayer.visualizerUpdated();
    }
    pointVisible(x, y) {
        return x >= 0 && x <= this.width && y >= 0 && y <= this.height;
    }
    rectVisible(x, y, w, h) {
        return x + w >= 0 && x <= this.width && y + h >= 0 && y <= this.height; 
    }
}
