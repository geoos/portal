class AddPanel extends ZCustomController {
    async onThis_init() {
        window.geoos.addPanel = this;
        this.open = false;
        this.infoOpen = false;
        this.infoVarCode = null;
        this.infoContent.hide();
        this.infoPanel.hide();
        this.hide();
        window.geoos.events.on("top", "clickAddVariables", _ => this.toggle())
        this._layerType = "variables";
        // Clonar proveedores y agregar "no" (capas erspeciales)
        let providers = JSON.parse(JSON.stringify(window.geoos.providers));
        providers.splice(0,0,{code:"no", name:"Capa Especial|"})
        this.sections = [{
            code:"subjects", name:"Filtrar por Tema", data:window.geoos.subjects
        }, {
            code:"providers", name:"Filtrar por Proveedor o Agencia", data:providers
        }, {
            code:"types", name:"Filtrar por Tipo de Información", data:window.geoos.types
        }, {
            code:"regions", name:"Filtrar por Zona o Región", data:window.geoos.regions
        }]
        await this.refreshLayerType();
    }
    
    get layerType() {return this._layerType}
    set layerType(t) {
        $(this.typeContainer.view).find("I").removeClass("fa-dot-circle");
        this._layerType = t;
        if (t == "variables") $(this.tVariables.find("I")).addClass("fa-dot-circle");
        else $(this.tVariables.find("I")).addClass("fa-circle");
        if (t == "vector") $(this.tVector.find("I")).addClass("fa-dot-circle");
        else $(this.tVector.find("I")).addClass("fa-circle");
        if (t == "tiles") $(this.tTiles.find("I")).addClass("fa-dot-circle");
        else $(this.tTiles.find("I")).addClass("fa-circle");
        if (t == "multimedia") $(this.tMultimedia.find("I")).addClass("fa-dot-circle");
        else $(this.tMultimedia.find("I")).addClass("fa-circle");
        if (t == "special") $(this.tSpecial.find("I")).addClass("fa-dot-circle");
        else $(this.tSpecial.find("I")).addClass("fa-circle");
        if (t == "monstations") $(this.tMonStations.find("I")).addClass("fa-dot-circle");
        else $(this.tMonStations.find("I")).addClass("fa-circle");
    }
    async onTVariables_click() {this.layerType = "variables"; await this.refreshLayerType();}
    async onTVector_click() {this.layerType = "vector"; await this.refreshLayerType();}
    async onTMonStations_click() {this.layerType = "monstations"; await this.refreshLayerType();}
    async onTTiles_click() {this.layerType = "tiles"; await this.refreshLayerType();}
    async onTMultimedia_click() {this.layerType = "multimedia"; await this.refreshLayerType();}
    async onTSpecial_click() {this.layerType = "special"; await this.refreshLayerType();}

    doResize(size) {
        if (!this.open) return;
        this.applySize();
    }
    applySize() {
        let size = window.geoos.size;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let height = size.height - (topMenuRect.top + topMenuRect.height);
        let width = size.width - 38;
        this.addPanelContainer.view.style.left = "-2px";
        this.addPanelContainer.view.style.top = (size.height - height - 5) + "px";
        this.addPanelContainer.view.style.width = width + "px";
        this.addPanelContainer.view.style.height = height + "px";
        this.contentRow.view.style.height = (height - 50) + "px";
    }

    toggle() {
        this.addPanelContent.hide();
        this.applySize();
        if (this.open) {
            this.addPanelContainer.view.style["margin-left"] = "0";
            $(this.addPanelContainer.view).animate({"margin-left": (- window.geoos.size.width + 30)}, 300, _ => {
                this.hide();
                this.open = false;
                window.geoos.topPanel.deactivateOption("opAddVariables");
            });
        } else {
            window.geoos.closeFloatingPanels();
            this.show();
            this.addPanelContainer.view.style["margin-left"] = (- window.geoos.size.width + 30) + "px";
            $(this.addPanelContainer.view).animate({"margin-left": 0}, 300, _ => {
                this.addPanelContent.show();
                this.refreshLayerType();
                this.open = true;
                this.edNameFilter.focus();
                window.geoos.topPanel.activateOption("opAddVariables");
            });
        }
    }

    onCmdCloseAddPanel_click() {this.toggle()}


    async refreshLayerType() {
        let layerType = this.layerType;
        this.filters = {};
        this.sections.forEach(section => this.filters[section.code] = [])
        this.layers = await window.geoos.getAvailableLayers(layerType);
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
        if (textFilter) {
            textFilter = window.geoos.neutralizaTildes(textFilter);
            filtered = filtered.filter(l => (window.geoos.neutralizaTildes(l.name).indexOf(textFilter) >= 0))
        }
        return filtered;
    }

    async refresh() {
        let htmlSections = "";
        for (let section of this.sections) {
            let firstSection = !htmlSections;
            let layers = this.filterLayers(section.code);
            section.data.forEach(r => r.nLayers = 0);
            layers.forEach(layer => {
                let sectionCodes = layer[section.code];
                if (!sectionCodes) {
                    console.error("Capa ", layer);
                    throw "La capa no contiene la seccion " + section.code; 
                }
                if (!sectionCodes.length) {
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
            this.filterPills.html = "<b style='margin-left: 6px;'>Filtros Activos: </b>" + htmlFilters + "<a href='#' class='filters-cleaner btn btn-sm btn-secondary geoos-panel-ok'>Limpiar Filtros</a>";
            this.filterPills.show();
            $(this.filterPills.view).find(".add-panel-filter i").click(e => {
                let item = $(e.currentTarget);
                let sectionCode = item.data("section");
                let rowCode = item.data("code");
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
        let name = this.layerType == "variables"?"Variables":"Capas";
        this.lblResume.text = name + ": (Encontradas " + this.filteredLayers.length + ")";
        let activeGroup = window.geoos.getActiveGroup();
        let htmlVars = "";
        for (let layer of this.filteredLayers) {
            //console.log("layer",layer)
            htmlVars += `
                <div class="add-panel-variable" data-code="${layer.code}">
                    <i class="far fa-lg ${layer.selected?"fa-check-square":"fa-square"} float-left mr-2"></i>
                    ${layer.name + (layer.providers.length?" - [" + layer.providers[0] +"]":"")}
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
            if (code == "rasterFormula") {
                this.showDialog("common/WError", {message: "Las capas especiales se deben configurar y agregar a favoritos sólo desde 'Mi Panel'"});
                return;
            }
            let variable = this.filteredLayers.find(v => v.code == code);
            if(!window.geoos.isFavorite(code, "layer")){
                console.log("favo-variable", variable);
                img.attr("src", "img/icons/favo-active.svg");
                //se traspasa a la otra vista
                console.log("codigo: ", code);
                window.geoos.addFavLayers(code)

            }else{
                window.geoos.deleteFavLayers(code)
                img.attr("src", "img/icons/favo.svg");
            }
            return false;
        });
        $(this.variablesContainer.view).find(".add-panel-variable").click(e => {
            let div = $(e.currentTarget);
            let code = div.data("code");
            let variable = this.filteredLayers.find(v => v.code == code);
            variable.selected = !variable.selected;
            this.refresh();
        })
        this.refreshResume();
    }

    

    refreshResume() {
        //let nSelected = this.filteredLayers.reduce((sum, l) => (l.selected?(sum+1):sum), 0);
        let nSelected = this.layers.reduce((sum, l) => (l.selected?(sum+1):sum), 0);
        let name = this.layerType == "variables"?"Variables":"Capas";
        let name1 = this.layerType == "variables"?"Variable":"Capa";
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

    onCmdCancelLayers_click() {this.toggle()}
    onCmdAddLayers_click(){
        this.toggle();
        window.geoos.addLayers(this.layers.filter(l => (l.selected)));
        //console.log("sel", this.layers.filter(l => (l.selected)));
        window.geoos.openMyPanel();
    }

    openInfo() {
        return new Promise(resolve => {
            this.infoContent.hide();
            this.infoPanel.view.style.height = "0";
            this.infoPanel.show();
            $(this.infoPanel.view).animate({height:200}, 300, _ => {
                this.infoOpen = true;
                this.addPanelTabContent.view.style.height = "150px";
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

    async onCmdCloseInfoPanel_click() {
        //$(this.variablesContainer.view).find(".info").each((idx, i) => $(i).attr("src", "img/icons/info.svg"));
        await this.closeInfo();
    }

    refreshInfo(layer) {
        console.log("variable", layer);
        if (layer.type == "rasterFormula") {
            this.showDialog("common/WError", {message: "Las capas especiales no tienen información adicional"});
            return;
        }
        this.infoVarCode = layer.code;
        console.log("lblVarName", this.lblVarName);
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
}
ZVC.export(AddPanel);