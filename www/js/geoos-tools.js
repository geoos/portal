class GEOOSTool {
    static register(code, name, factories) {
        if (!GEOOSTool.tools) GEOOSTool.tools = [];
        GEOOSTool.tools.push({code, name, factories});
    }

    constructor(type, id, name, config) {
        this.type = type;
        if (!id) id = "TO_" + parseInt(Math.random() * 99999999);
        this.name = name;
        this.config = config || {};
    }
}