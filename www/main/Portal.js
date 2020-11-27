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
        });
    }
}
ZVC.export(Portal);