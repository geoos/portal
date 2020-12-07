class GEOOSTool {
    static register(code, name, factories) {
        if (!GEOOSTool.tools) GEOOSTool.tools = [];
        GEOOSTool.tools.push({code, name, factories});
    }
    static getToolDef(code) {return GEOOSTool.tools.find(t => t.code == code)}

    constructor(type, id, name, config) {
        this.type = type;
        if (!id) id = "TO_" + parseInt(Math.random() * 99999999);
        this.id = id;
        this._name = name;
        this.config = config || {};
        this._mainPanel = null; // assigned on "activated" from MainPanel through property
    }

    get name() {return this._name}
    set name(n) {
        this._name = n;
        window.geoos.events.trigger("tools", "renamed", this);
    }
    get caption() {return this.name}   
    
    get mainPanel() {return this._mainPanel}
    set mainPanel(p) {
        this._mainPanel = p;
        if (p) {
            this.refresh();
        }
    }

    startWorking() {
        if (this.mainPanel) this.mainPanel.triggerEvent("startWorking");
    }
    finishWorking() {
        window.geoos.events.trigger("tools", "results", this);
        window.geoos.events.trigger("tools", "renamed", this);
        if (this.mainPanel) this.mainPanel.triggerEvent("finishWorking");
    }

    async refresh() {throw "refresh not overwriten in tool " + this.code}

    async activate() {}
    async deactivate() {}

    async isValid() {return true}
}