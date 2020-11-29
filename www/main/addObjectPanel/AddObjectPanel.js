class AddObjectPanel extends ZCustomController {
    onThis_init() {
        window.geoos.addObjectPanel = this;
        this.open = false;
        this.hide();
        this.activeOption = "point";
        window.geoos.events.on("top", "clickObjects", _ => this.toggle())
        window.geoos.events.on("map", "click", p => this.handleMapClick(p))
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

    toggle() {
        this.addObjectPanelContent.hide();
        this.applySize();
        if (this.open) {
            this.stopAdding();
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

    selectOption(op) {
        this.findAll(".add-object-title").forEach(d => d.classList.remove("active"))
        this.find(".add-object-title[data-option='" + op + "']").classList.add("active");
        this.activeOption = op;
    }

    startAdding() {
        this.listenning = true;
        window.geoos.mapPanel.mapContainer.view.style.cursor = "crosshair";
    }
    stopAdding() {
        this.listenning = false;
        window.geoos.mapPanel.mapContainer.view.style.removeProperty("cursor");
    }
    handleMapClick(p) {
        if (!this.listenning) return;
        if (this.activeOption == "point") {
            window.geoos.addUserObject(new GEOOSUserObjectPoint(null, null, p.lat, p.lng));
            this.toggle();
        }
    }
}
ZVC.export(AddObjectPanel);