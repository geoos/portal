class SelectRasterVariable extends ZCustomController {
    async onThis_init(options) {
        this.tool = options.tool;
        await this.refresh();
    }

    async refresh() {
        if (!this.tool.variable) {
            let selector = GEOOSQuery.newEmptySelector("Seleccionar Variable", null, null, true);
            this.edVariable.html = await selector.getHTML(true);
            selector.registerListeners(this.edVariable, {
                singleSelection:true,
                onSelect:variables => {
                    let q = GEOOSQuery.fromSearchItem(variables[0]);
                    this.tool.variable = q;
                    this.refresh();
                }
            });
        } else {
            this.edVariable.html = await this.tool.variable.getHTML(true);
            this.tool.variable.registerListeners(this.edVariable, {
                singleSelection:true,
                onSelect:variables => {
                    let q = GEOOSQuery.fromSearchItem(variables[0]);
                    this.tool.variable = q;
                    this.refresh();
                },
                onChange:_ => {
                    this.tool.variable = this.tool.variable; // update serialized config
                    this.refresh();
                },
                onDelete:w => {
                    this.tool.variable = null;
                    this.refresh();
                }
            })
        }
    }
}
ZVC.export(SelectRasterVariable);