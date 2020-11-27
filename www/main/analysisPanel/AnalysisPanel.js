class AnalysisPanel extends ZCustomController {    
    onThis_init() {
        window.geoos.analysisPanel = this;
        this.open = false;
        this.status = "normal"; // min, normal, max

        window.geoos.events.on("map", "objectSelected", async o => await this.objectSelected(o))
        window.geoos.events.on("map", "objectUnselected", async o => await this.objectUnselected(o))
        window.geoos.events.on("map", "selectedObjectReplaced", async o => await this.objectSelected(o))

        this._selectedObject = null;
        this.doResize();
    }

    get selectedObject() {return this._selectedObject}
    get selectedLayer() {return this.selectedObject?this.selectedObject.layer:null}
    get selectedAnalyzerCode() {
        if (!this.selectedLayer || !this.selectedLayer.analysisConfig) return null;
        return this.selectedLayer.analysisConfig.analyzerCode;
    }
    get selectedAnalyzerDefinition() {
        let code = this.selectedAnalyzerCode;
        if (!code) return null;
        return GEOOSAnalyzer.getAnalyzerConfig(code);
    }
    get analyzerConfig() {
        let cfg = this.selectedLayer.analysisConfig[this.selectedAnalyzerCode];
        if (!cfg) {
            cfg = {};
            this.selectedLayer.analysisConfig[this.selectedAnalyzerCode] = cfg;
        }
        return cfg;
    }

    getPanelHeight() {
        if (!this.open) return 0;
        if (this.status == "min") return 36;
        if (!this.selectedLayer || !this.selectedLayer.analysisConfig || !this.selectedLayer.analysisConfig.analyzerCode) return 0;
        let aDef = this.selectedAnalyzerDefinition;
        return aDef?aDef.height:0;
    }    

    doResize() {
        if (!this.open) {
            this.analysisContainer.hide();
            return;
        }
        if (this.status == "min") {
            this.analysisContainer.view.style.height = "36px";
        } else if (this.status == "normal") {
            this.analysisContainer.view.style.height = this.getPanelHeight() + "px";
        } else {
            let size = window.geoos.size;
            let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
            let height = size.height - (topMenuRect.top + topMenuRect.height);
            this.analysisContainer.view.style.height = (height - 15) + "px";
        }
        this.analysisContainer.show("flex");
        if (this.status != "min") {
            this.analysisPropPanelsContainer.view.style["max-height"] = ($(this.analysisContainer.view).height() -77) + "px";
        }
        if (this.mainPanel && this.mainPanel.doResize) this.mainPanel.doResize()
    }

    async objectSelected(o) {
        this.analyzers = GEOOSAnalyzer.getAnalyzersForObject(o);
        if (!this.analyzers.length) return this.objectUnselected();
        this._selectedObject = o;
        this.lblObjectName.text = o.layer.name + " / " + o.name;
        let oldHeight = 0, newHeight;
        if (this.open) {
            oldHeight = $(this.analysisContainer.view).height();
        } else {
            window.geoos.closeFloatingPanels();
        }        
        if (!this.selectedLayer.analysisConfig) this.selectedLayer.analysisConfig = {};
        if (!this.selectedLayer.analysisConfig.analizerCode) {
            let initialAnalyzerCode = this.analyzers[0].code, initialAnalyzerConfig = {};
            if (this.selectedLayer.minZDimension == "rie.estacion") {
                let estacion = this.selectedLayer.points.find(p => p.id == this.selectedObject.code).station;
                initialAnalyzerCode = "time-serie";
                let v0 = estacion.server.variables.find(v => v.code == estacion.variables[0]);
                let accum = v0.options && v0.options.defaults && v0.options.defaults.accum?v0.options.defaults && v0.options.defaults.accum:"avg";
                let q = new MinZQuery(estacion.server, v0, null, {ruta:"estacion", valor:"${codigo-objeto}"}, [], accum);
                await q.construyeDescripcionFiltros();
                initialAnalyzerConfig = {watcher1:q.serialize()}
            } else {
                if (this.selectedLayer.options && this.selectedLayer.options.defaults && this.selectedLayer.options.defaults.analyzerCode) {
                    initialAnalyzerCode = this.selectedLayer.options.defaults.analyzerCode;
                    if (this.selectedLayer.options.defaults.analyzers) {
                        initialAnalyzerConfig = this.selectedLayer.options.defaults.analyzers.find(c => c.code == initialAnalyzerCode) || {}
                    }
                }
            }
            this.selectedLayer.analysisConfig.analizerCode = initialAnalyzerCode;
            this.selectedLayer.analysisConfig[initialAnalyzerCode] = initialAnalyzerConfig;
            newHeight = this.analyzers.find(a => a.code == initialAnalyzerCode).height;
        } else {
            newHeight = GEOOSAnalyzer.getAnalyzerConfig(this.selectedLayer.analysisConfig.analyzerCode).height;
        }
        if (this.status == "max") {
            let size = window.geoos.size;
            let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
            newHeight = size.height - (topMenuRect.top + topMenuRect.height) - 15;
        }

        this.open = true;
        if (this.status != "min") {
            await this.animate(oldHeight, newHeight);
        } else {
            window.geoos.triggerResize();
        }
        this.analysisContent.show("flex");
        this.doResize();
        await this.refreshAnalyzers();
    }
    async objectUnselected(o) {
        if (this.analyzer) this.analyzer.destroy();
        this.analyzer = null;
        this._selectedObject = null;
        if (!this.open) return;
        let oldHeight = $(this.analysisContainer.view).height(), newHeight = 0;
        this.open = false;
        await this.animate(oldHeight, newHeight);
        this.analysisContainer.hide();
        this.doResize();
    }

    animate(fromHeight, toHeight) {
        window.geoos.timePanel.hide();
        this.analysisContent.hide();
        this.analysisContainer.show("flex");
        let $v = $(this.analysisContainer.view);
        $v.css({height:fromHeight + "px"});
        return new Promise(resolve => {
            $v.animate({"height": toHeight}, 300, _ => {
                window.geoos.triggerResize()
                window.geoos.timePanel.doResize();
                window.geoos.timePanel.show();
                resolve();
            });
        })
    }

    async onCmdUp_click() {
        if (this.status == "normal") {
            let size = window.geoos.size;
            let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
            let oldHeight = $(this.analysisContainer.view).height();
            let newHeight = size.height - (topMenuRect.top + topMenuRect.height) - 15;
            this.status = "max";
            await this.animate(oldHeight, newHeight);
            this.analysisContent.show("flex");
            $(this.cmdUp.view).addClass("disabled");
        } else if (this.status == "min") {
            this.status = "normal";
            let oldHeight = 36;
            let newHeight = this.getPanelHeight();
            await this.animate(oldHeight, newHeight);
            this.analysisContent.show("flex");
        }
        $(this.cmdDown.view).removeClass("disabled");
    }
    async onCmdDown_click() {
        if (this.status == "normal") {
            let oldHeight = $(this.analysisContainer.view).height();
            let newHeight = 36;
            this.status = "min";
            await this.animate(oldHeight, newHeight);
            this.analysisContent.show("flex");
            $(this.cmdDown.view).addClass("disabled");
        } else if (this.status == "max") {
            this.status = "normal";
            let oldHeight = $(this.analysisContainer.view).height();            
            let newHeight = this.getPanelHeight();
            await this.animate(oldHeight, newHeight);
            this.analysisContent.show("flex");
        }
        $(this.cmdUp.view).removeClass("disabled");
    }

    async refreshAnalyzers() {
        this.edAnalysisPanel.setRows(this.analyzers, this.selectedAnalyzerCode);
        await this.refreshAnalyzer();
    }
    async onEdAnalysisPanel_change() {
        await this.refreshAnalyzer();
    }
    async refreshAnalyzer() {
        let code = this.edAnalysisPanel.value;
        this.selectedLayer.analysisConfig.analyzerCode = code;
        if (!this.selectedLayer.analysisConfig[code]) this.selectedLayer.analysisConfig[code] = {};
        if (this.analyzer) this.analyzer.destroy();
        this.analyzer = this.selectedAnalyzerDefinition.factory(this.selectedObject);
        await this.analyzer.initDefaults();
        await this.refreshPropertyPanels();
        await this.refreshMainPanel();
    }

    async refreshPropertyPanels() {
        for (let panel of this.panels || []) {
            await panel.deactivate();
        }
        let panelDefs = this.analyzer.getPropertyPanels();
        let config = this.analyzerConfig;
        let html = "";
        for (let panelDef of panelDefs) {
            let panelConfig = config[panelDef.code];
            if (!panelConfig) {
                panelConfig = {expanded:html.length?false:true};
                config[panelDef.code] = panelConfig;
            }
            html += `
                <div class="prop-panel" data-panel-code="${panelDef.code}" >
                    <div class="prop-caption">
                        <i class="panel-expander fas fa-lg fa-chevron-right ${panelConfig.expanded?" expanded":""} mr-2 float-left"></i>
                        <div>${panelDef.name}</div>
                    </div>
                    <div id="${panelDef.code}" class="prop-panel-content"></div>
                </div>
            `;
        }
        this.analysisPropPanelsContainer.html = html;
        this.panels = [];
        for (let panelDef of panelDefs) {
            let domPanel = this.analysisPropPanelsContainer.find("#" + panelDef.code);
            let panel = await ZVC.loadComponent(domPanel, this, panelDef.path);
            panel.panelCode = panelDef.code;
            this.panels.push(panel);
            await panel.init({analyzer:this.analyzer, listeners:{
                onChange:_ => {console.log("nalyzer change")}
            }});
            await panel.activate();
            
            let panelConfig = config[panelDef.code];
            if (!panelConfig.expanded) {
                panel.savedHeight = $(domPanel).height();
                $(domPanel).hide();
            }
        }
        $(this.analysisPropPanelsContainer.view).find(".prop-caption").click(e => {
            let panelCode = $(e.currentTarget).parent().data("panel-code");
            let panel = this.panels.find(p => p.panelCode == panelCode);
            let $panel = $(panel.view);
            let panelConfig = this.analyzerConfig[panelCode];
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

    async refreshMainPanel() {
        if (!this.analyzer) {
            this.mainPanel = null;
            await this.analyzerLoader.load("common/Empty");
            return;
        }
        this.mainPanel = await this.analyzerLoader.load(this.analyzer.getMainPanel(), {analyzer:this.analyzer})
        await this.analyzer.attachMainPanel(this.mainPanel)
    }
}
ZVC.export(AnalysisPanel);