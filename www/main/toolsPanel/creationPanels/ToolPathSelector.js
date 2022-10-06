class ToolPathSelector extends ZCustomController {
    async onThis_init(options) {
        if (!window.geoos.getActiveGroup().getUserObjectsLayer()) {
            window.geoos.getActiveGroup().createUserObjectsLayer();
        }

        if (options.caption) {
            this.find("#lblSelectCaption").textContent = options.caption;
            this.points = [];
        }
        this.refresh();
        this.userObjectAddedListener = uo => {
            if (uo.type == "point") this.points.push(uo.id);
            this.triggerEvent("change");
            this.refresh(uo.id)
            window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
            
        }        
        this.userObjectRenameListener = uo => {
            this.triggerEvent("change");
            this.refresh();
            window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
        }        
        this.userObjectDeleteListener = uoId => {
            let idx = this.points.indexOf(uoId);
            if (idx >= 0) this.points.splice(idx, 1);
            this.triggerEvent("change");
            this.refresh();
            window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
        }        
    }
    async onThis_activated() {
        window.geoos.events.on("userObject", "added", this.userObjectAddedListener)
        window.geoos.events.on("userObject", "rename", this.userObjectRenameListener)
        window.geoos.events.on("userObject", "deleted", this.userObjectDeleteListener)
        this.edAdded.view.ondblclick = () => this.onCmdRemove_click();
        this.edAvailable.view.ondblclick = () => this.onCmdAdd_click();
        window.geoos.getActiveGroup().getUserObjectsLayer().setPainters(uoVisualizer => this.prePaintPath(uoVisualizer), null);
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
    }
    async onThis_deactivated() {
        window.geoos.events.remove(this.userObjectAddedListener)
        window.geoos.events.remove(this.userObjectRenameListener)
        window.geoos.events.remove(this.userObjectDeleteListener)
        window.geoos.getActiveGroup().getUserObjectsLayer().setPainters(null, null);
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
    }

    refresh(select) {
        let allPoints = window.geoos.getActiveGroup().layers.reduce((points, layer) => {
            if (layer instanceof GEOOSUserObjectsLayer) {
                for (let uo of layer.getUserObjects()) {
                    if (uo.type == "point") {
                        points.map[uo.id] = uo;
                        points.list.push(uo);
                    }
                }                
            }
            return points;
        }, {map:{}, list:[]})
        let rows = [], used = {}, oldSelection = this.edAdded.value;
        for (let pointId of this.points) {
            let uo = allPoints.map[pointId];
            rows.push(uo);
            used[pointId] = true;
        }
        this.edAdded.setRows(rows, select ? select:oldSelection);
        rows = [], oldSelection = this.edAvailable.value;
        for (let uo of allPoints.list) {
            if (!used[uo.id]) rows.push(uo);
        }
        this.edAvailable.setRows(rows, oldSelection);
        this.enableAdders();
    }

    onEdAdded_change() {this.enableAdders()}
    onEdAvailable_change() {this.enableAdders()}

    enableAdders() {
        if (this.edAdded.value) this.cmdRemove.enable();
        else this.cmdRemove.disable();
        if (this.edAvailable.value) this.cmdAdd.enable();
        else this.cmdAdd.disable();
        let pId = this.edAdded.value;
        if (!pId) {
            this.cmdUp.disable();
            this.cmdDown.disable();
        } else {
            let idx = this.points.indexOf(pId);
            if (idx < 0) {
                console.log("idx", idx);
                console.log("pId", pId);
                console.log("points", this.points);
            }
            if (idx > 0) this.cmdUp.enable(); else this.cmdUp.disable();
            if (idx < (this.points.length - 1)) this.cmdDown.enable(); else this.cmdDown.disable();
        }
    }
    
    onCmdAdd_click() {
        let id = this.edAvailable.value;
        this.points.push(id);
        this.triggerEvent("change");
        this.refresh(id);
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
    }
    onCmdRemove_click() {
        let id = this.edAdded.value;
        let idx = this.points.indexOf(id);
        if (idx >= 0) this.points.splice(idx,1);
        this.triggerEvent("change");
        this.refresh();
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
    }

    onCmdUp_click() {
        let idx = this.points.indexOf(this.edAdded.value);
        if (idx <= 0) return;
        let id = this.points[idx];
        this.points.splice(idx, 1);
        this.points.splice(idx - 1, 0, id);
        this.triggerEvent("change");
        this.refresh();
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
    }

    onCmdDown_click() {
        let idx = this.points.indexOf(this.edAdded.value);
        if (idx < 0 || idx > (this.points.length - 2)) return;
        let id = this.points[idx];
        this.points.splice(idx, 1);
        this.points.splice(idx + 1, 0, id);
        this.triggerEvent("change");
        this.refresh();
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
    }

    isValid() {return this.points.length > 1}
    getCreateOptions() {
        return {points:this.points}
    }

    onCmdNewPoint_click() {
        window.geoos.toolsPanel.ignoreNextToggle = true;
        window.geoos.addObjectPanel.addRequest("point");
    }

    prePaintPath(uoVisualizer) {
        let kl = uoVisualizer.konvaLayer;
        for (let i=0; i<this.points.length - 1; i++) {

            let uoId = this.points[i];
            let uo = window.geoos.getUserObject(uoId);
            if (!uo) {console.error("User object " + uoId + " not found"); return;}
            let p0 = uoVisualizer.toCanvas({lat:uo.lat, lng:uo.lng});

            uoId = this.points[i + 1];
            uo = window.geoos.getUserObject(uoId);
            if (!uo) {console.error("User object " + uoId + " not found"); return;}
            let p1 = uoVisualizer.toCanvas({lat:uo.lat, lng:uo.lng});

            let xm = (p0.x + p1.x) / 2, ym = (p0.y + p1.y) / 2;
            let arrow = new Konva.Arrow({
                x: 0, y:0,
                points:[p0.x, p0.y, xm, ym],
                pointerLength: 10,
                pointerWidth: 10,
                fill: 'blue',
                stroke: 'black',
                strokeWidth: 1
            })
            kl.add(arrow);
            kl.add(new Konva.Line({
                points:[xm, ym, p1.x, p1.y],
                stroke: 'black',
                strokeWidth: 1
            }))
        }
    }
}
ZVC.export(ToolPathSelector);