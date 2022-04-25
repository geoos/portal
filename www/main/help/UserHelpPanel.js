class UserHelpPanel extends ZCustomController {
    onThis_init() {
        window.geoos.userHelpPanel = this;
        this.open = false;
        this.hide();
        window.geoos.events.on("top", "activateAction", action => {
            if (action == "help" && !this.open) this.toggle();
        })
        window.geoos.events.on("top", "deactivateAction", action => {
            if (action == "help" && this.open) this.toggle();
        })
    }
    doResize() {        
        if (!this.open) return;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let top = (topMenuRect.top + topMenuRect.height - 6);
        this.updates.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        this.aboutPage.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        this.faqPage.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        this.colabPage.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
    }

    onCmdCloseUserConfig_click() {window.geoos.topPanel.deactivateAction("help")}
    close() {
        if (this.open) window.geoos.topPanel.deactivateAction("help")
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
ZVC.export(UserHelpPanel);