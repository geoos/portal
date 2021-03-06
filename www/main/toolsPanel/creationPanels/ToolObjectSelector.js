class ToolObjectSelector extends ZCustomController {
    async onThis_init(options) {
        this.types = options.allowedObjectTypes.reduce((map, type) => {
            map[type] = true;
            return map;
        }, {});
        if (options.caption) {
            this.find("#lblSelectCaption").textContent = options.caption;
        }
        await this.refresh();
        this.userObjectAddedListener = uo => this.refresh({layerId:uo.layer.id, type:"user-object/" + uo.type, code:uo.id})
        this.userObjectRenameListener = uo => {
            let rows = this.edObject.rows;
            if (rows && rows.length) {
                let idx = rows.findIndex(r => r.code == uo.id);
                if (idx >= 0) {
                    this.edObject.view.options[idx].innerHTML = uo.name;
                }
            }
        }
    }
    async onThis_activated() {
        window.geoos.events.on("userObject", "added", this.userObjectAddedListener)
        window.geoos.events.on("userObject", "rename", this.userObjectRenameListener)
    }
    async onThis_deactivated() {
        window.geoos.events.remove(this.userObjectAddedListener)
        window.geoos.events.remove(this.userObjectRenameListener)
    }

    refresh(select) {
        this.searchLayers(select);
    }

    isValid() {return this.edObject.value?true:false}
    getCreateOptions() {
        return {layerId:this.edLayer.value, object:this.edObject.selectedRow}
    }

    searchLayers(select) {
        if (!this.types["user-object/area"]) this.cmdAddArea.hide();
        else this.cmdAddArea.show();
        if (!this.types["station"]) this.cmdAddStation.hide();
        else this.cmdAddStation.show();
        this.layers = [];        
        window.geoos.getActiveGroup().layers.forEach(layer => {
            let layerToAdd = null;
            if (layer instanceof GEOOSUserObjectsLayer) {
                for (let uo of layer.getUserObjects()) {
                    if (this.types["user-object/" + uo.type]) {
                        if (!layerToAdd) layerToAdd = {id:layer.id, name:layer.name, objects:[]}
                        layerToAdd.objects.push({type:"user-object/" + uo.type, code:uo.id, name:uo.name});
                    }
                }
            }
            if (layerToAdd) this.layers.push(layerToAdd)
        })
        if (!this.layers.length) {
            this.existingObject.hide();
        } else {
            this.existingObject.show();
            let toSel = select?select.layerId:this.edLayer.value;
            this.edLayer.setRows(this.layers, toSel);
            this.refreshObjects(select);
        }
    }
    onEdLayer_change() {this.refreshObjects()}
    refreshObjects(select) {
        let toSel = select?select.code:this.edObject.value;
        this.edObject.setRows(this.edLayer.selectedRow.objects, toSel);
        this.triggerEvent("change");
    }


    onCmdAddArea_click() {
        window.geoos.toolsPanel.ignoreNextToggle = true;
        window.geoos.addObjectPanel.addRequest("area");
    }
}
ZVC.export(ToolObjectSelector);