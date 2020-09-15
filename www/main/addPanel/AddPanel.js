class AddPanel extends ZCustomController {
    onThis_init() {
        window.geoos.addPanel = this;
        this.open = false;
        this.hide();
        window.geoos.events.on("top", "clickAddVariables", _ => this.toggle())
        this.edLayerType.setRows([{
            code:"raster", name:"Capas con Variables"
        }, {
            code:"vector", name:"Puntos o Áreas de Interés"
        }, {
            code:"tiles", name:"Imágenes Satelitales o Precalculadas"
        }], "raster")
        this.sections = [{
            code:"subjects", name:"Filtrar por Tema", data:window.geoos.subjects
        }, {
            code:"providers", name:"Filtrar por Proveedor o Agencia", data:window.geoos.providers
        }, {
            code:"types", name:"Filtrar por Tipo de Información", data:window.geoos.types
        }, {
            code:"regions", name:"Filtrar por Zona o Región", data:window.geoos.regions
        }]
        this.refreshLayerType();
    }

    doResize(size) {
        if (!this.open) return;
        this.applySize();
    }
    applySize() {
        let size = window.geoos.size;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let height = size.height - (topMenuRect.top + topMenuRect.height);
        let width = size.width - 28;
        this.addPanelContainer.view.style.left = "30px";
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
            $(this.addPanelContainer.view).animate({"margin-left": (window.geoos.size.width - 30)}, 300, _ => {
                this.hide();
                this.open = false;
                window.geoos.topPanel.deactivateOption("opAddVariables");
            });
        } else {
            window.geoos.closeFloatingPanels();
            this.show();
            this.addPanelContainer.view.style["margin-left"] = (window.geoos.size.width - 30) + "px";
            $(this.addPanelContainer.view).animate({"margin-left": 0}, 300, _ => {
                this.addPanelContent.show();
                this.open = true;
                window.geoos.topPanel.activateOption("opAddVariables");
            });
        }
    }

    onCmdCloseAddPanel_click() {this.toggle()}

    onEdLayerType_change() {this.refreshLayerType()}

    refreshLayerType() {
        let layerType = this.edLayerType.value;        
        this.filters = {};
        this.sections.forEach(section => this.filters[section.code] = [])
        this.layers = window.geoos.getAvailableLayers(layerType);
        this.refresh();
    }

    filterLayers(excludeSection) {
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
        return filtered;
    }
    refresh() {
        let htmlFilters = "";
        let htmlSections = "";
        for (let section of this.sections) {
            let firstSection = !htmlSections;
            let layers = this.filterLayers(section.code);
            section.data.forEach(r => r.nLayers = 0);
            layers.forEach(layer => {
                let sectionCodes = layer[section.code];
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
                        ${section.name}
                        <i class="fas fa-chevron-down float-right mr-2"></i>
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
                items.animate({height:0}, 300, _ => {
                    items.hide();
                    section.open = false;
                    caption.find("i").removeClass("fa-chevron-up").addClass("fa-chevron-down")
                })
            } else {
                items.css({height:0});
                items.show();
                items.animate({height:section.filteredData.length * 22}, 300, _ => {
                    section.open = true;
                    caption.find("i").removeClass("fa-chevron-down").addClass("fa-chevron-up")
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
            console.log("idx", idx, this.filters)
            this.refresh();
        })
    }
}
ZVC.export(AddPanel);