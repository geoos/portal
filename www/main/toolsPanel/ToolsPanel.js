class ToolsPanel extends ZCustomController {
    async onThis_init() {
        window.geoos.toolsPanel = this;
        this.status = "min";     
        this.doResize();
        this.contenType = null; // new, view
        //await this.loadNewTool();
        this.toolsMain.hide();
        this.checkEnabled();   
        //setTimeout(_ => this.toggle("normal"), 300);
        window.geoos.events.on("portal", "groupActivated", async _ => await this.refresh());
        window.geoos.events.on("tools", "toolAdded", async tool => await this.loadViewTools(tool.id));
    }    

    get width() {
        if (this.status == "min") return 30;
        if (this.status == "normal") return 600;
        return parseInt(window.geoos.size.width * 85 / 100);
    }

    doResize() {
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let top = (topMenuRect.top + topMenuRect.height - 6);
        this.toolsPanelContainer.view.style.right = "-2px";
        this.toolsPanelContainer.view.style.top = top + "px";
        this.toolsPanelContainer.view.style.width = (this.width + 2) + "px";
        this.toolsPanelContainer.view.style.bottom = "0";

        this.toolsMain.view.style.width = (this.width - 30) + "px";
        this.toolsMainLoader.view.style.height = (window.geoos.size.height - top - 30) + "px";
        if (this.toolsMainLoader.content.doResize) this.toolsMainLoader.content.doResize();
    }

    async openAddTool(toolCode) {
        await this.loadNewTool(toolCode)
    }
    async refresh() {
        if (!this.contenType) return;
        if (window.geoos.getActiveGroup().tools.length) {
            await this.loadViewTools();
        } else {
            await this.loadNewTool();
        }
    }

    async destroyContent() {
        this.contenType = null;
        await this.loadEmpty();
    }

    toggle(newStatus, initialToolCode) {  
        if (this.ignoreNextToggle) {
            this.ignoreNextToggle = false;
            return;
        }      
        if (newStatus == this.status) return;
        if (newStatus == "min" && this.contenType) {
            return new Promise(resolve => {
                this.destroyContent().then(resolve(this.toggle(newStatus)));
            })            
        }
        this.status = newStatus;
        this.toolsMain.hide();
        return new Promise(resolve => {
            $(this.toolsPanelContainer.view).animate({"width": this.width}, 300, _ => {
                if (this.status != "min") {
                    this.toolsMain.show();
                }
                this.checkEnabled();
                this.doResize();
                if (this.status == "normal" && this.contenType == "view" && this.toolsMainLoader.content.showingProperties) {
                    this.toolsMainLoader.content.toggleConfigureTool().then(resolve());
                } else if (!this.contenType && this.status !="min") {
                    if (!initialToolCode) {
                        this.contenType = "view";
                        this.refresh().then(resolve())
                    } else {
                        this.toolsMainLoader.load("./AddTool", {initialToolCode})
                            .then(_ => {
                                this.doResize();
                                this.checkEnabled();
                                resolve();
                            })

                    }                        
                } else {
                    resolve();
                }
            });
        })        
    }

    checkEnabled() {
        this.find("#vertCaption").style.opacity = "0";
        if (this.status == "min") {
            this.cmdCloseTools.addClass("disabled");
            this.cmdOpenTools.removeClass("disabled");
            this.find("#vertCaption").style.opacity = "1";
        } else if (this.status == "normal") {
            this.cmdCloseTools.removeClass("disabled");
            if (this.contenType == "view") {
                this.cmdOpenTools.removeClass("disabled");
            } else {
                this.cmdOpenTools.addClass("disabled");
            }
        } else if (this.status == "max") {
            this.cmdCloseTools.removeClass("disabled");
            this.cmdOpenTools.addClass("disabled");
            
        }        
    }
    async onCmdOpenTools_click() {
        const element = document.querySelector("#cmdOpenTools");
        if(!element.classList.contains("disabled")){
            console.log("enabled");
            if (this.status == "min") await this.toggle("normal");
            else if (this.status == "normal") await this.toggle("max");
        }
        
    }
    async onCmdCloseTools_click() {
        if (this.status == "max") await this.toggle("normal");
        else if (this.status == "normal") {
            window.geoos.topPanel.deactivateOption("opWizard1");
            window.geoos.topPanel.deactivateOption("opWizard2");
            window.geoos.topPanel.deactivateOption("opWizard3");
            await this.toggle("min");
        }
    }

    async loadEmpty() {
        await this.toolsMainLoader.load("common/Empty");
    }
    async loadNewTool(toolCode) {
        if (this.status == "min") {
            await this.toggle("normal", toolCode);
            return;
        }
        if (this.status == "max") await this.toggle("normal");
        this.contenType = "new";
        await this.toolsMainLoader.load("./AddTool", {initialToolCode:toolCode});
        this.doResize();
        this.checkEnabled();
    }

    async loadViewTools(idToSelect) {
        if (this.status == "min") await this.toggle("normal");
        this.contenType = "view";
        await this.toolsMainLoader.load("./ViewTool", {idToSelect});
        this.doResize();
        this.checkEnabled();
    }

    async onToolsMainLoader_addTool(toolCode) {
        await this.loadNewTool(toolCode);
    }  
    async onToolsMainLoader_cancelAdd() {
        await this.loadViewTools();
    }    
}
ZVC.export(ToolsPanel);