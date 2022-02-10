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

    constructor(o, code, listeners) {
        this.object = o;
        this.code = code;
        this.listeners = listeners;
        this.mainPanel = null;
        this.nWorking = 0;
    }
    destroy() {}
    get layer() {return this.object.layer}
    get userObject() {
        if (this._userObject) return this._userObject;
        this._userObject = window.geoos.getUserObject(this.object.code);
        return this._userObject;
    }
    get config() {
        if (this.object.type == "user-object") {
            let ac = this.userObject.analysisConfig[this.code];
            if (!ac) {
                ac = {};
                this.userObject.analysisConfig[this.code] = ac;
            }
            return ac;
        } else {
            let ac = this.layer.analysisConfig[this.code];
            if (!ac) {
                ac = {};
                this.layer.analysisConfig[this.code] = ac;
            }
            return ac;
        }
    }
    get objectPoint() {
        if (this.object.type == "user-object") {
            return this.userObject.getCenter();
        } else {
            return {lat:this.object.lat, lng:this.object.lng}
        }
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

    async triggerChange() {
        if (this.listeners.onChange) await this.listeners.onChange();
    }
    async startWorking() {
        this.nWorking++;
        if (this.nWorking == 1 && this.listeners.onStartWorking) await this.listeners.onStartWorking(); 
    }
    async finishWorking() {
        this.nWorking--;
        if (!this.nWorking && this.listeners.onFinishWorking) await this.listeners.onFinishWorking();
    }
}