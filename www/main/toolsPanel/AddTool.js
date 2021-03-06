class AddTool extends ZCustomController {
    async onThis_init(options) {
        if (!window.geoos.getActiveGroup().tools.length) this.cmdCancelAddTool.hide();
        else this.cmdCancelAddTool.show();
        this.edToolType.setRows(GEOOSTool.tools, options?options.initialToolCode:null)
        this.cmdGenerateTool.disable();
        await this.refreshTool()
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
    async refreshTool() {
        let tool = this.edToolType.selectedRow;
        this.iconTool.view.src = tool.factories.icon;
        await this.toolAddLoader.load(tool.factories.creationPanelPath, tool.factories.creationPanelOptions);
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
        let tool = this.edToolType.selectedRow.factories.factory(this.edNewToolName.value.trim(), this.toolAddLoader.content.getCreateOptions());
        window.geoos.addTool(tool);
    }
    onCmdCancelAddTool_click() {
        this.triggerEvent("cancelAdd");
    }
}
ZVC.export(AddTool);