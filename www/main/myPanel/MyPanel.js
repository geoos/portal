class MyPanel extends ZCustomController {
    onThis_init() {
        window.geoos.myPanel = this;
        this.open = false;
        this.hide();
        window.geoos.events.on("top", "clickMyPanel", _ => this.toggle())
    }

    doResize(size) {
        if (!this.open) return;
        this.applySize();
    }
    applySize() {
        let size = window.geoos.size;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let height = size.height - (topMenuRect.top + topMenuRect.height);
        let width = 402;
        this.myPanelContainer.view.style.left = "0";
        this.myPanelContainer.view.style.top = (size.height - height - 5) + "px";
        this.myPanelContainer.view.style.width = width + "px";
        this.myPanelContainer.view.style.height = height + "px";
    }

    toggle() {
        this.myPanelContent.hide();
        this.applySize();
        if (this.open) {
            this.myPanelContainer.view.style["margin-left"] = "-2px";
            $(this.myPanelContainer.view).animate({"margin-left": -402}, 300, _ => {
                this.hide();
                this.open = false;
                window.geoos.topPanel.deactivateOption("opMyPanel");
            });
        } else {
            window.geoos.closeFloatingPanels();
            this.show();
            this.myPanelContainer.view.style["margin-left"] = "-302px";
            $(this.myPanelContainer.view).animate({"margin-left": -2}, 300, _ => {
                this.myPanelContent.show();
                this.open = true;
                window.geoos.topPanel.activateOption("opMyPanel");
            });
        }
    }

    onCmdCloseMyPanel_click() {this.toggle()}
}
ZVC.export(MyPanel);