class Portal extends ZCustomController {
    onThis_init() {
        window.geoos.events.on("portal", "resize", size => {
            this.top.doResize(size);
            this.addPanel.doResize(size);
            this.myPanel.doResize(size);
            this.configPanel.doResize(size);
            this.map.doResize(size);
            this.analysisPanel.doResize(size);
            this.time.doResize(size);
            this.toolsPanel.doResize(size);
            this.userConfigPanel.doResize(size);
            this.userAccountPanel.doResize(size);
            this.userHelpPanel.doResize(size);
            this.userMarksPanel.doResize(size);
            this.rightHelper.doResize(size);
            this.infoBarPanel.doResize(size);
        });
    }
}
ZVC.export(Portal);