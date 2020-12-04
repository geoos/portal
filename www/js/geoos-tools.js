class GEOOSTool {
    static register(code, name, factories) {
        if (!GEOOSTool.tools) GEOOSTool.tools = [];
        GEOOSTool.tools.push({code, name, factories});
    }

    constructor(type, id, name, config) {
        this.type = type;
        if (!id) id = "TO_" + parseInt(Math.random() * 99999999);
        this.id = id;
        this._name = name;
        this.config = config || {};
    }

    get name() {return this._name}
    set name(n) {
        this._name = n;
        window.geoos.events.trigger("tools", "renamed", this);
    }
    get caption() {return this.name}    
}