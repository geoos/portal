class AddObjectPanel extends ZCustomController {
    onThis_init() {
        window.geoos.addObjectPanel = this;
        this.open = false;
        this.hide();
        this.activeOption = "point";
        window.geoos.events.on("top", "clickObjects", _ => this.toggle())
        window.geoos.events.on("map", "click", p => this.handleMapClick(p))
        window.geoos.events.on("map", "move", p => this.handleMapMove(p))
        this.listenning = false;
    }

    doResize(size) {
        if (!this.open) return;
        this.applySize();
    }
    applySize() {
        let size = window.geoos.size;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let height = size.height - (topMenuRect.top + topMenuRect.height);
        let width = 352;
        this.addObjectPanelContainer.view.style.left = "-2px";
        this.addObjectPanelContainer.view.style.top = (size.height - height - 5) + "px";
        this.addObjectPanelContainer.view.style.width = width + "px";
        this.addObjectPanelContainer.view.style.height = height + "px";
    }

    addRequest(type) {
        this.requestType = type;
        this.selectOption(type, true);
        if (!this.open) this.toggle();
    }

    toggle() {
        this.addObjectPanelContent.hide();
        this.applySize();
        if (this.open) {            
            this.stopAdding();
            this.enableAllOptions();
            this.addObjectPanelContainer.view.style["margin-left"] = "-2";
            $(this.addObjectPanelContainer.view).animate({"margin-left": "-352px"}, 300, _ => {
                this.hide();
                this.open = false;
                window.geoos.topPanel.deactivateOption("opObjects");
            });
        } else {
            window.geoos.closeFloatingPanels();
            this.show();
            this.addObjectPanelContainer.view.style["margin-left"] = "-302px";
            $(this.addObjectPanelContainer.view).animate({"margin-left": "-2px"}, 300, _ => {
                this.addObjectPanelContent.show();
                this.open = true;
                window.geoos.topPanel.activateOption("opObjects");
                this.startAdding();
            });
        }
    }

    onCmdCloseAddObjectPanel_click() {this.toggle()}

    onOpArea_click() {this.selectOption("area")}
    onOpPoint_click() {this.selectOption("point")}

    selectOption(op, exclusive) {
        this.findAll(".add-object-title").forEach(d => d.classList.remove("active"))
        this.find(".add-object-title[data-option='" + op + "']").classList.add("active");
        this.activeOption = op;
        this.stopAdding(); this.startAdding();
        if (exclusive) {
            this.disableOption(this.opPoint)
            this.disableOption(this.opArea)
            if (this.requestType == "point") this.enableOption(this.opPoint);
            else if (this.requestType == "area") this.enableOption(this.opArea);
        } else {
            this.enableOption(this.opPoint);
            this.enableOption(this.opArea);
        }
    }

    enableOption(opPanel) {
        opPanel.view.style.cursor = "pointer";
        opPanel.view.style["pointer-events"] = "auto";
        opPanel.view.style.opacity = "1";
    }
    disableOption(opPanel) {
        opPanel.view.style.cursor = "default";
        opPanel.view.style["pointer-events"] = "none";
        opPanel.view.style.opacity = "0.5";
    }
    enableAllOptions() {
        this.enableOption(this.opPoint);
        this.enableOption(this.opArea);
    }

    startAdding() {
        if (this.listenning) return;
        this.listenning = true;
        window.geoos.mapPanel.mapContainer.view.style.cursor = "crosshair";
        this.points = [];
        this.interactionElements = {}
        this.creatingState = {}
    }
    stopAdding() {
        if (!this.listenning) return;
        this.listenning = false;
        window.geoos.mapPanel.mapContainer.view.style.removeProperty("cursor");
        this.points = [];
        window.geoos.interactions.clearShapes("add-panel");
        this.interactionElements = {}
        this.creatingState = {}
        window.geoos.interactions.redraw();        
    }
    handleMapClick(p) {
        if (!this.listenning) return;
        if (this.activeOption == "point") {
            window.geoos.addUserObject(new GEOOSUserObjectPoint(null, null, p.lat, p.lng));
            this.toggle();
        } else if (this.activeOption == "area") {
            if (!this.creatingState.p0) {
                this.creatingState.p0 = p;
                this.creatingState.poly = new Konva.Line({
                    points: [p.x, p.y, p.x, p.y, p.x, p.y, p.x, p.y],
                    fill: 'rgba(0,0,0,0.05)',
                    stroke: 'black',
                    strokeWidth: 1,
                    closed: true,
                    listening:false
                });
                window.geoos.interactions.addObservableShape("add-panel", this.creatingState.poly);
                this.creatingState.poly.opacity(1);
            } else {
                window.geoos.addUserObject(new GEOOSUserObjectArea(null, null, this.creatingState.p0, this.creatingState.p1));
                this.toggle();
            }
        }
    }
    handleMapMove(p) {
        if (!this.listenning) return;
        if (this.activeOption == "area") {
            if (this.creatingState.p0) {
                let p0 = this.creatingState.p0, p1 = p;
                let points = [p0.x,p0.y, p1.x,p0.y, p1.x,p1.y, p0.x, p1.y];
                this.creatingState.poly.points(points);
                window.geoos.interactions.redraw();
                this.creatingState.p1 = p;
            }
        }
    }
}
ZVC.export(AddObjectPanel);