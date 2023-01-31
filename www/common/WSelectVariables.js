class WSelectVariables extends ZDialog {
    async onThis_init(options) {
        console.log("select", options);
        this.dimCode = options.dimCode;
        this.layerName = options.layerName;
        this.singleSelection = options.singleSelection;
        this.selectedIcon = options.singleSelection?"fa-dot-circle":"fa-check-square";
        this.unselectedIcon = options.singleSelection?"fa-circle":"fa-square";
        this.monstationsLayerCode = options.monstationsLayerCode;
        
        this.infoVarCode = null;
        this.infoContent.hide();
        this.infoPanel.hide();        
        if (this.dimCode) {
            if (this.dimCode != "rie.estacion") {
                this.edLayerType.setRows([{
                    code:"variables", name:"Variables en Centro"
                }, {
                    code:"minz", name:"Asociadas a " + this.layerName
                }], "variables")
            } else {
                this.edLayerType.setRows([{
                    code:"stations", name:"Medidas por las Estaciones"
                }, {
                    code:"variables", name:"Otras Variables en el mismo Punto"
                }], "stations")
            }
        } else if (this.monstationsLayerCode) {
            this.edLayerType.setRows([{
                code:"monstations", name:"Monitoreadas en la Estaciones"
            }, {
                code:"variables", name:"Otras Variables en el mismo Punto"
            }], "stations")

        } else {
            this.edLayerType.setRows([{
                code:"variables", name:"Variables en Centro"
            }], "variables")
        }
        this.sections = [{
            code:"subjects", name:"Filtrar por Tema", data:window.geoos.subjects
        }, {
            code:"providers", name:"Filtrar por Proveedor o Agencia", data:window.geoos.providers
        }, {
            code:"types", name:"Filtrar por Tipo de Información", data:window.geoos.types
        }]
        await this.refreshLayerType();        
    }

    async onEdLayerType_change() {await this.refreshLayerType()}

    async refreshLayerType() {
        let layerType = this.edLayerType.value;
        this.filters = {};
        this.sections.forEach(section => this.filters[section.code] = [])
        this.layers = await window.geoos.getAvailableLayers(layerType, this.dimCode, this.monstationsLayerCode);
        this.refresh();
    }

    filterLayers(excludeSection, textFilter) {
        let filtered = [];
        for (let layer of this.layers) {
            let passFilter = true;
            for (let section of this.sections) {
                if (passFilter && (!excludeSection || excludeSection != section.code)) {
                    let filters = this.filters[section.code];
                    if (filters.length) {
                        let hasSomeFilter = false;
                        filters.forEach(f => {
                            if (f == "no") {
                                if (!layer[section.code].length) hasSomeFilter = true;
                            } else if (layer[section.code].indexOf(f) >= 0) {
                                hasSomeFilter = true;
                            }
                        })
                        if (!hasSomeFilter) passFilter = false;
                    }
                }
            }
            if (passFilter) filtered.push(layer);
        }
        if (textFilter) filtered = filtered.filter(l => (l.name.toLowerCase().indexOf(textFilter.toLowerCase()) >= 0))
        return filtered;
    }
    refresh() {
        let htmlSections = "";
        for (let section of this.sections) {
            let firstSection = !htmlSections;
            let layers = this.filterLayers(section.code);
            section.data.forEach(r => r.nLayers = 0);
            layers.forEach(layer => {
                let sectionCodes = layer[section.code];
                if (!sectionCodes.length) {
                    if (!section.data.find(r => r.code == "no")) console.error("NO nLayers", section.code, layer[section.code], "Revisar provider, es obligatorio");
                    section.data.find(r => r.code == "no").nLayers++;
                } else {
                    sectionCodes.forEach(code => {
                        let r = section.data.find(r => r.code == code);
                        if (!r) console.error("No data with code '" + code + "' found in secton '" + section.code + "' declared in layer ", layer);
                        else r.nLayers++;
                    })
                }
            })
            let filteredRows = section.data.filter(r => r.nLayers > 0);
            section.filteredData = filteredRows;
            htmlSections += `
                <div class="section-filter ${firstSection?"":"border-top"}" data-section="${section.code}">
                    <div class="section-filter-caption">
                        <i class="fas fa-chevron-right float-left mr-2 ${section.open?" expanded":""}"></i>
                        ${section.name}
                    </div>
                    <div class="section-filter-items">
            `;
            filteredRows.forEach(row => {
                let selected = this.filters[section.code].indexOf(row.code) >= 0;
                htmlSections += `
                    <div class="section-filter-item" data-section="${section.code}" data-code="${row.code}">
                        <i class="far fa-lg ${selected?"fa-check-square":"fa-square"} float-left mr-2"></i>
                        ${row.name + " (" + row.nLayers + ")"}
                    </div>
                `;
            });
            htmlSections += `
                    </div>
                </div>
            `;
        }
        this.accordion.html = htmlSections;
        let accordion = $(this.accordion.view);
        accordion.find(".section-filter").each((idx, div) => {
            let code = $(div).data("section");
            let section = this.sections.find(s => s.code == code)
            if (!section.open) $(div).find(".section-filter-items").hide();
        });
        accordion.find(".section-filter-caption").click(e => {
            let caption = $(e.currentTarget);
            let code = caption.parent().data("section");
            let section = this.sections.find(s => s.code == code)
            let items = caption.parent().find(".section-filter-items");
            if (section.open) {
                caption.find("i").removeClass("expanded");
                items.animate({height:0}, 300, _ => {
                    items.hide();
                    section.open = false;
                    //caption.find("i").removeClass("fa-chevron-up").addClass("fa-chevron-down")
                })
            } else {
                items.css({height:0});
                items.show();
                caption.find("i").addClass("expanded");
                items.animate({height:section.filteredData.length * 22}, 300, _ => {
                    section.open = true;
                    //caption.find("i").removeClass("fa-chevron-down").addClass("fa-chevron-up")
                })
            }
        })
        accordion.find(".section-filter-item").click(e => {
            let item = $(e.currentTarget);
            console.log("item", item);
            let sectionCode = item.data("section");
            let rowCode = item.data("code");            
            let idx = this.filters[sectionCode].indexOf(rowCode);
            if (idx < 0) {
                this.filters[sectionCode].push(rowCode);                
            } else {
                this.filters[sectionCode].splice(idx, 1);
            }
            this.refresh();
        })

        // Filters
        let htmlFilters = "";
        for (let section of this.sections) {
            let filters = this.filters[section.code];
            for (let code of filters) {
                htmlFilters += `
                    <div class="add-panel-filter">
                        ${section.data.find(r => r.code == code).name}
                        <i class="closer fas fa-times ml-2" data-section="${section.code}" data-code="${code}"></i>
                    </div>
                `;
            }
        }
        if (htmlFilters.length) {
            this.filterPills.html = "<b style='margin-left: 6px;'>Filtros Activos: </b>" + htmlFilters + "<a href='#' class='filters-cleaner'>Limpiar Filtros</a>";
            this.filterPills.show();
            $(this.filterPills.view).find(".add-panel-filter i").click(e => {
                let item = $(e.currentTarget);
                let sectionCode = item.data("section");
                let rowCode = item.data("code");
                console.log(sectionCode, rowCode)
                let idx = this.filters[sectionCode].indexOf(rowCode);
                this.filters[sectionCode].splice(idx, 1);
                this.refresh();
            })
            $(this.filterPills.view).find(".filters-cleaner").click(_ => this.refreshLayerType());
        } else {
            this.filterPills.html = "";
            this.filterPills.hide();
        }

        // Results
        this.filteredLayers = this.filterLayers(null, this.edNameFilter.value);
        let name = this.edLayerType.value == "variables"?"Variables":"Capas";
        this.lblResume.text = name + ": (Encontradas " + this.filteredLayers.length + ")";
        let activeGroup = window.geoos.getActiveGroup();
        let htmlVars = "";
        for (let layer of this.filteredLayers) {
            htmlVars += `
                <div class="add-panel-variable" data-code="${layer.code}">
                    <i class="far fa-lg ${layer.selected?this.selectedIcon:this.unselectedIcon} float-left mr-2"></i>
                    ${layer.name}
                    <img class="add-panel-variable-icon info" style="height: 16px;" src="img/icons/info${this.infoVarCode==layer.code?"-active":""}.svg" />
                    <img class="add-panel-variable-icon favo" style="height: 16px;" src="img/icons/favo.svg" />
                    <img class="add-panel-variable-icon ${(activeGroup && activeGroup.containsLayer(layer))?"":"inactive"} added" style="height: 16px;" src="img/icons/variable-added.svg" />
                </div>
            `;
        }
        this.variablesContainer.html = htmlVars;
        if (this.infoOpen && this.filteredLayers.findIndex(l => (l.code == this.infoVarCode)) < 0) this.closeInfo();
        $(this.variablesContainer.view).find(".info").click(e => {
            $(this.variablesContainer.view).find(".info").each((idx, i) => $(i).attr("src", "img/icons/info.svg"));
            let img = $(e.currentTarget);
            let div = img.parent();
            let code = div.data("code");
            let layer = this.filteredLayers.find(v => v.code == code);
            if (this.infoOpen) {
                if (this.infoVarCode == layer.code) {
                    this.closeInfo();
                } else {
                    this.refreshInfo(layer);
                    img.attr("src", "img/icons/info-active.svg");
                }
            } else {
                img.attr("src", "img/icons/info-active.svg");
                this.openInfo()
                    .then(_ => this.refreshInfo(layer));
            }
            return false;           
        });
        $(this.variablesContainer.view).find(".added").click(e => (false))
        $(this.variablesContainer.view).find(".favo").click(e => {
            let img = $(e.currentTarget);
            let code = img.parent().data("code");
            let variable = this.filteredLayers.find(v => v.code == code);
            console.log("favo-variable", variable);
            return false;
        });
        $(this.variablesContainer.view).find(".add-panel-variable").click(e => {
            let div = $(e.currentTarget);
            let code = div.data("code");
            let variable = this.filteredLayers.find(v => v.code == code);
            if (this.singleSelection) {
                this.filteredLayers.forEach(v => v.selected = false)
                variable.selected = true;
            } else {
                variable.selected = !variable.selected;
            }
            this.refresh();
        })
        this.refreshResume();
    }

    refreshResume() {
        let nSelected = this.filteredLayers.reduce((sum, l) => (l.selected?(sum+1):sum), 0);
        let name = "Variables";
        let name1 = "Variable";
        if (!nSelected) {
            this.lblCountResume.text = "No hay " + name + " seleccionadas";
            this.cmdAddLayers.disable();
        } else if (nSelected == 1) {
            this.lblCountResume.text = "Una " + name1 + " seleccionada";
            this.cmdAddLayers.enable();
        } else {
            this.lblCountResume.text = nSelected + " " + name + " seleccionadas";
            this.cmdAddLayers.enable();
        }
    }

    onEdNameFilter_change() {
        this.refresh();
    }

    onCmdCancelLayers_click() {this.cancel()}
    onCmdAddLayers_click(){
        this.close(this.filteredLayers.filter(l => (l.selected)))
    }

    openInfo() {
        return new Promise(resolve => {
            this.infoContent.hide();
            this.infoPanel.view.style.height = "0";
            this.infoPanel.show();
            $(this.infoPanel.view).animate({height:200}, 300, _ => {
                this.infoOpen = true;
                this.addPanelTabContentVars.view.style.height = "150px";
                this.infoContent.show();
                resolve();
            });
        })
    }
    closeInfo() {
        return new Promise(resolve => {
            this.infoContent.hide();
            this.infoPanel.view.style.height = "200px";
            $(this.infoPanel.view).animate({height:0}, 300, _ => {
                this.infoOpen = false;
                this.infoVarCode = null;
                this.infoPanel.hide();
                resolve()
            })
        })
    }

    onCmdCloseInfoPanel_click() {
        $(this.variablesContainer.view).find(".info").each((idx, i) => $(i).attr("src", "img/icons/info.svg"));
        this.closeInfo()
    }

    refreshInfo(layer) {
        console.log("variable", layer);
        this.infoVarCode = layer.code;
        this.lblVarName.text = layer.name;
        let provider = window.geoos.providers.find(p => p.code == layer.providers[0]);
        this.logoProvider.view.src = provider.logo;
        this.providerUrl.view.setAttribute("href", provider.url);
        this.providerUrl.text = provider.name;
        if (layer.type == "raster") {
            this.layerDescription.html = layer.variable.options.description || "<p>No hay descripción de la Capa</p>";
            this.layerDetails.html = layer.variable.options.details || "<p>No hay detalles de la Capa</p>";
            this.layerAvailability.html = layer.variable.options.availability || "<p>No hay detalles de la disponibilidad en GEOOS para la Capa</p>";
        }
    }


    onCmdCloseWindow_click() {this.cancel()}
}
ZVC.export(WSelectVariables);