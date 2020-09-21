class GroupProperties extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
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
    refreshOpacityLabel() {
        this.lblOpacity.text = "Opacidad: " + this.layer.opacity + "%";
    }
}
ZVC.export(GroupProperties);