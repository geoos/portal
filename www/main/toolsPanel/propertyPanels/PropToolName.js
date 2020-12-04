class PropToolName extends ZCustomController {
    onThis_init(options) {
        this.tool = options.tool;
        this.edToolName.value = this.tool.name;
    }

    onEdToolName_change() {
        if (this.edToolName.value.trim()) {
            this.tool.name =this.edToolName.value.trim();
        }            
    }
}
ZVC.export(PropToolName);