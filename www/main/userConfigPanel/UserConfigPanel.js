class UserConfigPanel extends ZCustomController {
    onThis_init() {
        window.geoos.userConfigPanel = this;
        this.open = false;
        this.hide();
        window.geoos.events.on("top", "activateAction", action => {
            if (action == "configure" && !this.open) this.toggle();
        })
        window.geoos.events.on("top", "deactivateAction", action => {
            if (action == "configure" && this.open) this.toggle();
        })
    }
    doResize() {        
        if (!this.open) return;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        //let top = (topMenuRect.top + topMenuRect.height - 6);
        let top = (topMenuRect.top + topMenuRect.height + 10);
        this.mapTypePage.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        this.gridPage.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
    }

    onCmdCloseUserConfig_click() {
        window.geoos.topPanel.deactivateAction("configure")
    }
    close() {
        if (this.open) window.geoos.topPanel.deactivateAction("configure")
    }

    toggle() {
        if (!this.open) {
            window.geoos.closeFloatingPanels();
            this.open = true;
            this.doResize();
            this.show();
        } else {
            this.open = false;
            this.hide();
        }
    }


}
ZVC.export(UserConfigPanel);