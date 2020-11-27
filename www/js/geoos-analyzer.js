class GEOOSAnalyzer {
    static register(code, name, selector, factory, height) {
        if (!GEOOSAnalyzer.analyzers) GEOOSAnalyzer.analyzers = [];
        GEOOSAnalyzer.analyzers.push({code, name, selector, factory, height});
    }

    static getAnalyzersForObject(o) {
        return GEOOSAnalyzer.analyzers.filter(p => p.selector(o));
    }
    static getAnalyzerConfig(code) {
        return GEOOSAnalyzer.analyzers.find(p => p.code == code);
    }

    constructor(o, code) {
        this.object = o;
        this.code = code;
        this.mainPanel = null;
    }
    destroy() {}
    get layer() {return this.object.layer}
    get config() {
        let ac = this.layer.analysisConfig[this.code];
        if (!ac) {
            ac = {};
            this.layer.analysisConfig[this.code] = ac;
        }
        return ac;
    }

    getPropertyPanels() {return []}
    getMainPanel() {return "common/Empty"}
    async initDefaults() {}
    async attachMainPanel(panel) {
        this.mainPanel = panel;
        await this.mainPanelAttached();
    }
    async mainPanelAttached() {}
    async refreshMainPanel() {
        if (this.mainPanel && this.mainPanel.refresh) {
            await this.mainPanel.refresh();
        }
    }
}