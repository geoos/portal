class LayerProperties extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        if (layer.variable && layer.variable.levels && layer.variable.levels.length) {
            this.levels = layer.variable.levels;
            this.edLevel.setRows(this.levels.map((l,idx) => ({idx, nombre:l})), layer.level)
        } else {
            this.levelRow.hide();
        }
        this.edLayerName.value = layer.name;
        this.edOpacity.setRange(0, 100, 1);
        this.edOpacity.value = layer.opacity;
        this.refreshOpacityLabel();
    }    

    onEdLayerName_change() {
        let newName = this.edLayerName.value;
        if (newName.trim().length > 2) {
            this.layer.name = newName;
            window.geoos.events.trigger("layer", "rename", this.layer);
        }
    }

    onEdOpacity_changing(v) {
        this.layer.opacity = v;
        this.refreshOpacityLabel();
    }
    onEdOpacity_change(v) {
        this.layer.opacity = v;
        this.refreshOpacityLabel();
    } 
    refreshOpacityLabel() {
        this.lblOpacity.text = "Opacidad: " + this.layer.opacity + "%";
    }
    onEdLevel_change() {
        this.layer.level = parseInt(this.edLevel.value);
        window.geoos.events.trigger("layer", "rename", this.layer)
        //this.refreshLevel()
    }
}
ZVC.export(LayerProperties);