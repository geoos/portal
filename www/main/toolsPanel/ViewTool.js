class ViewTool extends ZCustomController {
    async onThis_init(options) {
        this.viewWorking.hide();
        await this.refresh(options.idToSelect)
        this.doResize();
        this.selectionChangeListener = sel => this.selectionChange(sel);
        this.toolAddedListener = tool => this.toolAdded(tool);
        this.toolRemovedListener = tool => this.toolRemoved(tool);
        this.toolRenamedListener = tool => this.refreshCaption(tool);
        this.toolPropertyChangeListener = tool => {if (tool.id == window.geoos.getSelectedTool().id) this.refreshPropertyPanels();}
        this.toolResultsListener = tool => {if (tool.id == window.geoos.getSelectedTool().id) this.refreshMainPanel();}
        this.showingProperties = false;
        this.panels = [];
        await this.refreshMainPanel();
    }
    onThis_activated() {
        window.geoos.events.on("tools", "selectionChange", this.selectionChangeListener)
        window.geoos.events.on("tools", "toolAdded", this.toolAddedListener)
        window.geoos.events.on("tools", "toolRemoved", this.toolRemovedListener)
        window.geoos.events.on("tools", "renamed", this.toolRenamedListener);
        window.geoos.events.on("tools", "propertyChange", this.toolPropertyChangeListener);
        window.geoos.events.on("tools", "results", this.toolResultsListener);
    }
    onThis_deactivated() {
        window.geoos.events.remove(this.selectionChangeListener);
        window.geoos.events.remove(this.toolAddedListener);
        window.geoos.events.remove(this.toolRemovedListener);
        window.geoos.events.remove(this.toolRenamedListener);
        window.geoos.events.remove(this.toolPropertyChangeListener);
        window.geoos.events.remove(this.toolResultsListener);
    }
    doResize() {
        let size = this.size;
        this.viewContainer.size = {width:this.size.width, height:this.size.height}
        this.viewHeader.view.style.width = size.width + "px";
        if (this.showingProperties) {
            this.toolPropertyPanelsContainer.show();
            this.toolPropertyPanelsContainer.view.style.left = "0";
            this.toolPropertyPanelsContainer.view.style.height = (size.height - 120) + "px";            
            this.viewLoader.view.style.left = "310px";
            this.viewLoader.view.style.width = (size.width - 310) + "px";
            this.viewLoader.view.style.height = (size.height - 120) + "px";
            this.viewWorking.view.style.left = "310px";
            this.viewWorking.view.style.width = (size.width - 310) + "px";
            this.viewWorking.view.style.height = (size.height - 120) + "px";
        } else {
            this.toolPropertyPanelsContainer.hide();
            this.viewLoader.view.style.left = "0";
            this.viewLoader.view.style.width = (size.width) + "px";
            this.viewLoader.view.style.height = (size.height - 120) + "px";
            this.viewWorking.view.style.left = "0";
            this.viewWorking.view.style.width = (size.width) + "px";
            this.viewWorking.view.style.height = (size.height - 120) + "px";
        }
        this.toolCaptionPanel.view.style.width = (size.width) + "px";
        this.toolCaptionPanel.find("#toolCaption").style["max-width"] = (size.width - 85) + "px";
        this.resizeToolsPanel();
        if (this.viewLoader.content.doResize) this.viewLoader.content.doResize();
    }

    async refresh() {
        let tools = window.geoos.getTools();
        let selected = window.geoos.getSelectedTool();
        let html = tools.reduce((html, tool) => {
            html += `<td><button type="button" class="btn btn-secondary tool-selector mx-1 ${(selected && selected.id == tool.id)?"selected":""}" data-tool-id="${tool.id}">${tool.name}</button></td>`
            return html;
        }, "")
        this.toolsContainer.html = `<table id="toolsContainerTable"><tr id="toolsRow">${html}</tr></table>`;
        $(this.toolsContainer.view).find(".tool-selector").click(e => {
            let toolId = $(e.currentTarget).data("tool-id");
            window.geoos.selectTool(toolId);            
        });
        this.resizeToolsPanel()
    }

    resizeToolsPanel() {
        let maxW = this.size.width - 50;
        let content = $(this.toolsContainer.find("#toolsContainerTable"));
        let w = content.width();
        content.css("margin-left", 0);
        if (!maxW || !w) return;
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
            this.cmdToolsRight.disable();
        } else {
            this.cmdToolsRight.enable();
        }
        if (ml >= 0) {
            this.cmdToolsLeft.disable();
        } else {
            this.cmdToolsLeft.enable();
        }
    }

    onCmdToolsRight_click() {        
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
    onCmdToolsLeft_click() {        
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
        const selected = window.geoos.getSelectedTool();
        this.triggerEvent("addTool", selected ? selected.type : null);
    }

    async selectionChange(sel) {
        this.refresh()
        await this.refreshMainPanel();
        if (this.showingProperties) await this.refreshPropertyPanels();
    }
    toolAdded(tool) {
        this.refresh()
    }
    toolRemoved(tool) {
        if (!window.geoos.getTools().length) this.triggerEvent("addTool");
        else this.refresh()
    }

    async refreshMainPanel() {
        let tool = window.geoos.getSelectedTool();
        if (!tool) {
            this.triggerEvent("addTool");
            return;
        }
        this.refreshCaption(tool);
        if (!this.viewLoader.content.tool || this.viewLoader.content.tool.id != tool.id) {
            await this.viewLoader.load(tool.mainPanelPath, {tool:tool});
            if (this.viewLoader.content.doResize) this.viewLoader.content.doResize();
        }
        if (this.viewLoader.content.refresh) {
            await this.viewLoader.content.refresh();
        }
    }

    async toggleConfigureTool() {
        if (this.showingProperties) {
            this.showingProperties = false;
            this.cmdConfigureTool.removeClass("configure-selected");
            await this.destroyPanels();
            this.doResize();
            return;
        }
        this.showingProperties = true;
        this.cmdConfigureTool.addClass("configure-selected");
        await this.refreshPropertyPanels();
        if (window.geoos.toolsPanel.status != "max") {
            await window.geoos.toolsPanel.toggle("max");
        }
        this.doResize();
    }
    async onCmdConfigureTool_click() {this.toggleConfigureTool()}

    async destroyPanels() {
        for (let panel of this.panels || []) {
            await panel.deactivate();
        }        
    }
    async refreshPropertyPanels() {
        let tool = window.geoos.getSelectedTool();
        this.destroyPanels();
        let panelDefs = tool.getPropertyPanels();
        let html = "";
        for (let panelDef of panelDefs) {
            let panelConfig = tool.config[panelDef.code];
            if (!panelConfig) {
                panelConfig = {expanded:html.length?false:true};
                tool.config[panelDef.code] = panelConfig;
            }
            html += `
                <div class="prop-panel pl-2" data-panel-code="${panelDef.code}" >
                    <div class="prop-caption">
                        <i class="panel-expander fas fa-lg fa-chevron-right ${panelConfig.expanded?" expanded":""} mr-2 float-left"></i>
                        <div>${panelDef.name}</div>
                    </div>
                    <div id="${panelDef.code}" class="prop-panel-content"></div>
                </div>
            `;
        }
        this.toolPropertyPanelsContainer.html = html;
        this.panels = [];
        for (let panelDef of panelDefs) {
            let domPanel = this.toolPropertyPanelsContainer.find("#" + panelDef.code);
            let panel = await ZVC.loadComponent(domPanel, this, panelDef.path);
            panel.panelCode = panelDef.code;
            this.panels.push(panel);
            await panel.init({tool:tool});
            await panel.activate();
            
            let panelConfig = tool.config[panelDef.code];
            if (!panelConfig.expanded) {
                panel.savedHeight = $(domPanel).height();
                $(domPanel).hide();
            }
        }
        $(this.toolPropertyPanelsContainer.view).find(".prop-caption").click(e => {
            let panelCode = $(e.currentTarget).parent().data("panel-code");
            let panel = this.panels.find(p => p.panelCode == panelCode);
            let $panel = $(panel.view);
            let panelConfig = tool.config[panelCode];
            if (panelConfig.expanded) {
                panel.savedHeight = $panel.height();
                $(e.currentTarget).parent().find("i").removeClass("expanded");
                $panel.animate({height:0}, 200, _ => {
                    panelConfig.expanded = false;
                    $panel.hide();
                })
            } else {
                $panel.height(0);
                $panel.show();
                $(e.currentTarget).parent().find("i").addClass("expanded");
                $panel.animate({height:panel.savedHeight}, 200, _ => {
                    panelConfig.expanded = true;
                    panel.view.style.removeProperty("height");
                })
            }
        })
    }

    refreshCaption(tool) {
        if (tool.id != window.geoos.getSelectedTool().id) return;
        this.find("#toolCaption").textContent = window.geoos.getSelectedTool().caption;
    }

    onCmdDeleteTool_click() {
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea eliminar el análisis '" + window.geoos.getSelectedTool().name + "'?"}, _ => {
            window.geoos.removeTool(window.geoos.getSelectedTool().id)
        });
    }

    onCmdInfoTool_click() {
        this.showDialog("common/WInfo", {
            subtitle:"ADVERTENCIA", 
            message:"Si no logras visualizar el analisis generado, puedes probar activando la 'aceleración de hardware' en tu navegador.",
            message2:"Para más información visita las preguntas frequentes." 
        });
    }

    onViewLoader_startWorking() {this.viewWorking.show()}
    onViewLoader_finishWorking() {this.viewWorking.hide()}
}
ZVC.export(ViewTool);