class ZoomPanel extends ZCustomController {
    onThis_init() {
        this.find("#cmdZoomIn").onclick = _ => window.geoos.mapPanel.zoomIn();
        this.find("#cmdZoomOut").onclick = _ => window.geoos.mapPanel.zoomOut();
    }
}
ZVC.export(ZoomPanel);