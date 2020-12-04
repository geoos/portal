class Main3DChart extends ZCustomController {
    async onThis_init(options) {
        this.tool = options.tool;
    }

    onThis_activated() {this.tool.mainPanel = this;}
    onThis_deactivated() {this.tool.mainPanel = null;}

    doResize() {
        let size = this.size;
        this.mainPanelContainer.size = size;
    }
    async refresh() {

    }
}
ZVC.export(Main3DChart);