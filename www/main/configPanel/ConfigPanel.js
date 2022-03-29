class ConfigPanel extends ZCustomController {
    onThis_init() {
        window.geoos.configPanel = this;
        this.open = false;
        this.elementType = null;
        this.element = null;
        this.panels = [];
        this.hide();
        this.doResize(window.geoos.size)
        window.geoos.events.on("portal", "selectionChange", ({oldSelection, newSelection}) => this.selectionChange(oldSelection, newSelection));       
        window.geoos.events.on("portal", "layerDeleted", async layer => this.layerDeleted(layer));
        
    }

    doResize(size) {
        if (!this.open) return;
        this.applySize()
    }

    applySize() {
        let h = Math.max(window.geoos.size.height - 150 - 50, 100);
        this.configPanelContent.view.style.height = h + "px";
    }

    toggle() {
        return new Promise(resolve => {
            this.configPanels.html = "";
            this.applySize();
            if (this.open) {                
                this.configPanelContent.view.style["margin-left"] = "0";
                this.configPanelContent.view.style["opacity"] = "1";
                this.closing = true;
                $(this.configPanelContent.view).animate({"margin-left": -400, opacity: 0}, 200, _ => {
                    this.hide();
                    this.open = false;
                    this.closing = false
                    resolve();
                });
            } else {
                this.show();
                this.configPanelContent.view.style["margin-left"] = "-400px";
                this.configPanelContent.view.style["opacity"] = "0";
                this.openning = true;
                $(this.configPanelContent.view).animate({"margin-left": 0, opacity: 1}, 200, _ => {
                    this.open = true;
                    this.openning = false;
                    resolve();
                });
            }
        })        
    }

    async onCmdCloseConfigPanel_click() {
        await this.close();
    }

    async selectionChange(oldSelection, newSelection) {
        if (!this.open) return;
        if (!newSelection.type) {
            await this.close();
            return;
        }
        await this.refresh(newSelection);
    }

    async refresh(newSelection) {
        await this.destroy();
        await this.create(newSelection.type, newSelection.element);
    }

    async close() {
        if (this.open) await this.toggle();
        await this.destroy();
    }

    async create(type, element) {
        this.type = type;
        this.element = element;
        if (!this.element.panelsConfig) this.element.panelsConfig = {};
        let panelDefs = element.getPropertyPanels() || [];
        let html = "";
        for (let panelDef of panelDefs) {
            let panelConfig = element.panelsConfig[panelDef.code];
            if (!panelConfig) {
                panelConfig = {
                    expanded:html.length?false:true
                }
                element.panelsConfig[panelDef.code] = panelConfig;
            }
            html += `
                <div class="prop-panel" data-panel-code="${panelDef.code}" >
                    <div class="prop-caption">
                        <i class="panel-expander fas fa-lg fa-chevron-right ${panelConfig.expanded?" expanded":""} mr-2 float-left"></i>
                        <div>${panelDef.name}</div>
                    </div>
                    <div id="${panelDef.code}" class="prop-panel-content"></div>
                </div>
            `
        }
        this.configPanels.view.style.opacity = "0";
        this.configPanels.html = html
        this.panels = [];
        for (let panelDef of panelDefs) {
            let domPanel = this.configPanels.find("#" + panelDef.code);
            let panel = await ZVC.loadComponent(domPanel, this, panelDef.path);
            panel.panelCode = panelDef.code;
            this.panels.push(panel);
            await panel.init(element);
            await panel.activate();
            let panelConfig = element.panelsConfig[panelDef.code];
            if (!panelConfig.expanded) {
                panel.savedHeight = $(domPanel).height();
                $(domPanel).hide();
            }
        }
        $(this.configPanels.view).animate({opacity:1}, 200);
        $(this.configPanels.view).find(".prop-caption").click(e => {
            let panelCode = $(e.currentTarget).parent().data("panel-code");
            let panel = this.panels.find(p => p.panelCode == panelCode);
            let $panel = $(panel.view);
            let panelConfig = element.panelsConfig[panelCode];
            if (panelConfig.expanded) {
                panel.savedHeight = $panel.height();
                $(e.currentTarget).parent().find("i").removeClass("expanded");
                $panel.animate({height:0}, 200, _ => {
                    panelConfig.expanded = false;
                    $panel.hide();
                    //$(e.currentTarget).parent().find("i").removeClass("fa-chevron-up").addClass("fa-chevron-down");
                })
            } else {
                $panel.height(0);
                $panel.show();
                $(e.currentTarget).parent().find("i").addClass("expanded");
                $panel.animate({height:panel.savedHeight}, 200, _ => {
                    panelConfig.expanded = true;
                    panel.view.style.removeProperty("height");
                    //$(e.currentTarget).parent().find("i").removeClass("fa-chevron-down").addClass("fa-chevron-up");
                })
            }
        })
    }
    async destroy() {
        for (let panel of this.panels) {
            await panel.deactivate();
        }
        this.panels = [];
    }

    async layerDeleted(layer) {
        if (!this.type) return;
        if (this.type == "layer" && layer.id == this.element.id) {
            window.geoos.unselect();
            return;
        }
        if (this.type == "visualizer" && layer.id == this.element.layer.id) {
            window.geoos.unselect();
            return;
        }
    }

    async selectColorScale() {
        let pScale = $(this.configPanels.view).find(".prop-panel[data-panel-code='color-scale'] .prop-caption");
        let panelConfig = this.element.panelsConfig["color-scale"];
        if (panelConfig && !panelConfig.expanded) $(pScale).trigger("click");
    }
}
ZVC.export(ConfigPanel);