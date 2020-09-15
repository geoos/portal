class Portal extends ZCustomController {
    onThis_init() {
        window.geoos.events.on("portal", "resize", size => {
            this.top.doResize(size);
            this.addPanel.doResize(size);
            this.myPanel.doResize(size);
        });
    }
}
ZVC.export(Portal);