class AddTool extends ZCustomController {
    async onThis_init(options) {
        if (!window.geoos.getActiveGroup().tools.length) this.cmdCancelAddTool.hide();
        else this.cmdCancelAddTool.show();
        this.edToolType.setRows(GEOOSTool.tools, options?options.initialToolCode:null);
        this.cmdGenerateTool.disable();
        await this.refreshTool(options)
    }

    doResize() {
        let size = this.size;
        this.addContainer.size = {width:this.size.width, height:this.size.height}
        this.toolAddHeader.view.style.width = size.width + "px";
        this.toolAddLoader.view.style.width = size.width + "px";
        this.toolAddLoader.view.style.height = (size.height - 190) + "px";
        this.toolAddFooter.view.style.width = size.width + "px";
    }

    async refresh() {await this.refreshTool()}
    onEdToolType_change() {this.refreshTool()}
    async refreshTool(options) {
        let tool = this.edToolType.selectedRow;
        this.iconTool.view.src = tool.factories.icon;
        let optionsToLoad = tool.factories.creationPanelOptions;
        this.toolEditedId = null;
        if (options && options.toolEdited) {
            optionsToLoad = {...tool.factories.creationPanelOptions, ...options};
            this.edNewToolName.value = options.toolEdited.caption;
            this.toolEditedId = options.toolEdited.id;
            this.cmdGenerateTool.enable();
        }
        await this.toolAddLoader.load(tool.factories.creationPanelPath, optionsToLoad);
    }

    onToolAddLoader_change() {this.checkIsValid()}
    onEdNewToolName_change() {this.checkIsValid()}

    checkIsValid() {
        if (!this.edNewToolName.value.trim()) {
            this.edNewToolName.addClass("error");
            this.cmdGenerateTool.disable();
            return;
        }
        this.edNewToolName.removeClass("error");
        if (!this.toolAddLoader.content.isValid()) {
            this.edNewToolName.addClass("error");
            this.cmdGenerateTool.disable();
            return;
        }
        this.cmdGenerateTool.enable();
    }

    onCmdGenerateTool_click() {
        let tool = this.edToolType.selectedRow.factories.factory(this.toolEditedId ? this.toolEditedId: null, this.edNewToolName.value.trim(), this.toolAddLoader.content.getCreateOptions());
        if (!this.toolEditedId) window.geoos.addTool(tool);
        else window.geoos.editTool(tool);
    }
    onCmdCancelAddTool_click() {
        this.triggerEvent("cancelAdd");
    }
}
ZVC.export(AddTool);