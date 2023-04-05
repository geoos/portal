class ToolPathSelector extends ZCustomController {
    async onThis_init(options) {
        this.defaultDelimiter = ",";
        this.numberRegex = new RegExp(/^[+-]?((\d+(\.\d*)?)|(\.\d+))$/);
        this.headersDefault = ["name", "latitude", "longitude"];

        if (!window.geoos.getActiveGroup().getUserObjectsLayer()) {
            window.geoos.getActiveGroup().createUserObjectsLayer();
        }

        if (options.caption) {
            this.find("#lblSelectCaption").textContent = options.caption;
            this.points = [];
        }
        if (options.toolEdited){
            this.points = [...options.toolEdited.points];
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

        let $edAdded = $(this.edAdded.view);
        let rows = [], used = {}, oldSelection = $edAdded.find(".list-point-item.active") && $edAdded.find(".list-point-item.active").length > 0? $edAdded.find(".list-point-item.active")[0].id: null, html = ``;
        for (let pointId of this.points) {
            let uo = allPoints.map[pointId];
            let hasActive = select?select==uo.id:oldSelection==uo.id;
            html += `<div id="${uo.id}" class="drag row full-width list-point-item ${hasActive?"active": ""}">`;
            html += `   <img class="point-icon" src="img/icons/point.svg" style="filter:invert(1);" /><p class="ml-1">${uo.name}</p><i class="fa fa-ellipsis-v ml-3 float-right" style="cursor: grab; margin-top:2px; font-size:10px; "></i>`;
            html += `</div>`;
            used[pointId] = true;
        }

        this.edAdded.html = html;

        rows = [], oldSelection = this.edAvailable.value;
        for (let uo of allPoints.list) {
            if (!used[uo.id]) rows.push(uo);
        }

        $edAdded.find(".drag").draggable({ 
            handle: "i",
            cancel: "p, img",        
            scroll: false,            
            containment:$(this.edAdded.view),
            appendTo:$(this.edAdded.view),
            axis: "y",
            helper: "clone",
            revert: "invalid",
            start: e => {
                let pointInfo = $(e.currentTarget);
                this.dragInfo = pointInfo && pointInfo.length > 0 ? { pointId: pointInfo[0].id }: null;
            }
        })
        $edAdded.find(".drag").droppable({ 
            over:e => {
                if (!this.dragInfo) return;
                let pointInfo = $(e.target);
                this.dropInfo = pointInfo && pointInfo.length > 0 ? { pointId: pointInfo[0].id }: null;
            },
            out:_ => {
                this.dropInfo = null;
            },
            drop:e => {
                if (this.dragInfo && this.dropInfo) this.handleDrop();
            }
        })

        $edAdded.find(".list-point-item").click(e => {         
            let isActive = Array.from(e.currentTarget.classList).find(c => c == 'active')
            if (isActive) return;
            else {
                $edAdded.find(".list-point-item.active").toggleClass("active")
                e.currentTarget.classList.toggle("active");
            } 
            this.enableAdders();
        })


        this.edAvailable.setRows(rows, oldSelection);
        this.enableAdders();
    }

    async handleDrop() {
        let idxFrom = this.points.indexOf(this.dragInfo.pointId);
        let idxTo = this.points.indexOf(this.dropInfo.pointId);
        if (idxTo < 0 || idxTo > (this.points.length - 1)) return;
        const fromPoint = this.points.splice(idxFrom, 1)[0];
        this.points.splice(idxTo, 0, fromPoint);
        this.triggerEvent("change");
        this.refresh();
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
        this.dragInfo = null;
        this.dropInfo = null;
    }

    onEdAdded_change() {this.enableAdders()}
    onEdAvailable_change() {this.enableAdders()}

    enableAdders() {
        let $edAdded = $(this.edAdded.view);
        let addedSelected = $edAdded.find(".list-point-item.active");
        if (addedSelected && addedSelected.length > 0) this.cmdRemove.enable();
        else this.cmdRemove.disable();
        if (this.edAvailable.value) this.cmdAdd.enable();
        else this.cmdAdd.disable();
        let pId = addedSelected && addedSelected.length > 0 ? addedSelected[0].id : null;
        if (!pId) {
            this.pointPropertiesInfo.hide();
            this.pointPropertiesLoader.load("common/Empty");
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
            let pointInfo = window.geoos.getActiveGroup().layers.reduce((pointInfo, layer) => {
                if (layer instanceof GEOOSUserObjectsLayer) {
                    for (let uo of layer.getUserObjects()) {
                        if (uo.type == "point") {
                            if (uo.id == pId) pointInfo.push(uo) ;
                        }
                    }                
                }
                return pointInfo;
            }, []);
            if (idx >= 0) {
                this.pointPropertiesInfo.show();
                this.pointPropertiesLoader.load("main/configPanel/userObjects/PointObjectProperties", pointInfo[0]);
            }else{
                this.pointPropertiesInfo.hide();
                this.pointPropertiesLoader.load("common/Empty");
            }
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
        let $edAdded = $(this.edAdded.view);
        let addedSelected = $edAdded.find(".list-point-item.active");
        let id = addedSelected && addedSelected.length > 0 ? addedSelected[0].id : null;
        let idx = this.points.indexOf(id);
        if (idx >= 0) this.points.splice(idx,1);
        this.triggerEvent("change");
        this.refresh();
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
    }

    onCmdUp_click() {
        let $edAdded = $(this.edAdded.view);
        let addedSelected = $edAdded.find(".list-point-item.active");
        let idSelected = addedSelected && addedSelected.length > 0 ? addedSelected[0].id : null;
        let idx = this.points.indexOf(idSelected);
        if (idx <= 0) return;
        let id = this.points[idx];
        this.points.splice(idx, 1);
        this.points.splice(idx - 1, 0, id);
        this.triggerEvent("change");
        this.refresh();
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
    }

    onCmdDown_click() {
        let $edAdded = $(this.edAdded.view);
        let addedSelected = $edAdded.find(".list-point-item.active");
        let idSelected = addedSelected && addedSelected.length > 0 ? addedSelected[0].id : null;
        let idx = this.points.indexOf(idSelected);
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

    onCmdNewPoint_click() {
        window.geoos.toolsPanel.ignoreNextToggle = true;
        window.geoos.addObjectPanel.addRequest("point");
    }

    onCmdImportPoint_click() {
        this.importPointFile();
    }

    importPointFile() {
        this.selectFile(file => {
            let reader = new FileReader();
            reader.onload = async event => {
                try {
                    let str = event.target.result;                
                    console.log(str);
                    let csvArray = this.csvToArray(str);
                    console.log(csvArray);
                    csvArray.map(p => {
                        window.geoos.addUserObject(new GEOOSUserObjectPoint(null, p.name, parseFloat(p.latitude), parseFloat(p.longitude)));
                    })
                    this.refresh();
                } catch(error) {
                    console.error(error);
                    this.showDialog("common/WError", {message:error.toString()})
                    this.edFilePointSelector.view.value = null;
                }
            }
            reader.readAsText(file);
        })
    }

    selectFile(callback) {
        this.edFilePointSelector.view.value = null;
        this.fileSelectedCallback = callback;
        this.edFilePointSelector.view.click();
    }

    onEdFilePointSelector_change() {
        let files = this.edFilePointSelector.view.files;
        if (!files || !files.length) return;
        this.fileSelectedCallback(files[0]);
    }

    csvToArray(str, delimiter = this.defaultDelimiter){
        const rows = str.split("\r\n");
        let arr = rows.reduce((arr, row) => {
            const values = row.split(delimiter);
            const el = this.headersDefault.reduce(function (object, header, index) {
                object[header] = values[index];
                return object;
            }, {});
            if (this.isValidPointAndCoordinates(el)){
                arr.push(el);
            }
            return arr;
        }, []);
        return arr;
    }

    isValidPointAndCoordinates(point) {
        //Name
        if (!point[this.headersDefault[0]]) return false;
        //Latitud
        if (!point[this.headersDefault[1]] || !this.numberRegex.test(point[this.headersDefault[1]])) return false;
        //Longitud
        if (!point[this.headersDefault[2]] || !this.numberRegex.test(point[this.headersDefault[2]])) return false;
        return (parseFloat(point[this.headersDefault[1]])>-90 && parseFloat(point[this.headersDefault[1]])<90 && parseFloat(point[this.headersDefault[2]])>-180 && parseFloat(point[this.headersDefault[2]])<180);
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