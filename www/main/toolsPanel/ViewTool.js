class ViewTool extends ZCustomController {
    async onThis_init(options) {
        await this.refresh(options.idToSelect)
        this.doResize();
    }
    onThis_activated() {

    }
    onThis_deactivated() {

    }
    doResize() {
        let size = this.size;
        this.viewContainer.size = {width:this.size.width, height:this.size.height}
        this.viewHeader.view.style.width = size.width + "px";
        this.viewLoader.view.style.width = size.width + "px";
        this.viewLoader.view.style.height = (size.height - 190) + "px";
        this.resizeToolsPanel();
    }

    async refresh(idToSelect) {
        let html = window.geoos.getActiveGroup().tools.reduce((html, tool) => {
            for (let i=0; i<5; i++) {
                html += `<td><button type="button" class="btn btn-secondary tool-selector mx-1" data-id="${tool.id}">${tool.name}</button></td>`
            }
            return html;
        }, "")
        this.toolsContainer.html = `<table id="toolsContainerTable"><tr>${html}</tr></table>`;
        this.resizeToolsPanel()
    }

    resizeToolsPanel() {
        let maxW = this.size.width - 50;
        let content = $(this.toolsContainer.find("#toolsContainerTable"));
        let w = content.width();
        content.css("margin-left", 0);
        if (!maxW || !w) return;
        console.log("w", w); 
        if (w <= maxW) {
            this.toolsContainer.view.style.width = w + "px";
            this.toolsContainer.view.style.left = "0";
            this.cmdToolsLeft.hide();
            this.cmdToolsRight.hide();
            this.cmdToolsAdd.view.style.left = (w + 10) + "px";
        } else {
            this.toolsContainer.view.style.width = (maxW - 70) + "px";
            this.toolsContainer.view.style.left = "30px";
            this.cmdToolsLeft.show();
            this.cmdToolsRight.view.style.left = (maxW - 30) + "px";
            this.cmdToolsRight.show();
            this.cmdToolsAdd.view.style.left = (maxW + 20) + "px";
            this.checkToolScrollersEnabled();
        }
    }

    checkToolScrollersEnabled() {
        let content = $(this.toolsContainer.find("#toolsContainerTable"));
        let ml = parseInt(content.css("margin-left"));
        let contentWidth = content.width();
        let containerWidth = this.toolsContainer.size.width;
        if (contentWidth + ml < containerWidth) {
            this.cmdToolsLeft.disable();
        } else {
            this.cmdToolsLeft.enable();
        }
        if (ml >= 0) {
            this.cmdToolsRight.disable();
        } else {
            this.cmdToolsRight.enable();
        }
    }

    onCmdToolsLeft_click() {        
        return new Promise(resolve => {
            let content = $(this.toolsContainer.find("#toolsContainerTable"));
            let ml = parseInt(content.css("margin-left"));
            let newMl = ml - 100;

            content.animate({"margin-left": newMl}, 100, _ => {
                this.checkToolScrollersEnabled();
                resolve();
            });
        })   
    }
    onCmdToolsRight_click() {        
        return new Promise(resolve => {
            let content = $(this.toolsContainer.find("#toolsContainerTable"));
            let ml = parseInt(content.css("margin-left"));
            let newMl = ml + 100;
            if (newMl > 0) newMl = 0;

            content.animate({"margin-left": newMl}, 100, _ => {
                this.checkToolScrollersEnabled();
                resolve();
            });
        })   
    }

    onCmdToolsAdd_click() {
        this.triggerEvent("addTool");
    }
}
ZVC.export(ViewTool);