class AddStationsPanel extends ZCustomController {
    onThis_init() {
        window.geoos.addStationsPanel = this;
        this.open = false;
        this.infoOpen = false;
        this.infoStationCode = null;
        this.stationsInfoContent.hide();
        this.stationsInfoPanel.hide();
        this.hide();
        window.geoos.events.on("top", "clickStations", _ => this.toggle())
        let dataProveedores = Object.keys(window.geoos.estaciones.proveedores)
            .reduce((lista, p) => [...lista, window.geoos.estaciones.proveedores[p]], [])
            .map(p => window.geoos.providers
                .find(gp => gp.code == p.code) || p)
            .sort((p1, p2) => (p1.name > p2.name?1:-1));
        let dataTipos = Object.keys(window.geoos.estaciones.tipos).reduce((lista, t) => {
            lista.push(window.geoos.estaciones.tipos[t]);
            return lista;
        }, []).sort((t1, t2) => (t1.name > t2.name?1:-1));
        let dataVariables = Object.keys(window.geoos.estaciones.variables).reduce((lista, v) => {
            lista.push(window.geoos.estaciones.variables[v]);
            return lista;
        }, []).sort((v1, v2) => (v1.name > v2.name?1:-1));
        this.sections = [{
            code:"providers", name:"Filtrar por Proveedor o Agencia", data:dataProveedores
        }, {
            code:"types", name:"Filtrar por Tipo de Estación", data:dataTipos
        }, {
            code:"variables", name:"Filtrar por Sensor / Variable Monitoreada", data:dataVariables
        }]
        this.filters = {};
        this.sections.forEach(section => this.filters[section.code] = [])
        this.stations = window.geoos.getAvailableStations();
        this.refresh();
    }

    doResize(size) {
        if (!this.open) return;
        this.applySize();
    }
    applySize() {
        let size = window.geoos.size;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let height = size.height - (topMenuRect.top + topMenuRect.height);
        let width = size.width - 38;
        this.addStationsPanelContainer.view.style.left = "-2px";
        this.addStationsPanelContainer.view.style.top = (size.height - height - 5) + "px";
        this.addStationsPanelContainer.view.style.width = width + "px";
        this.addStationsPanelContainer.view.style.height = height + "px";
        this.stationsContentRow.view.style.height = (height - 50) + "px";
    }

    toggle() {
        this.addStationsPanelContent.hide();
        this.applySize();
        if (this.open) {
            this.addStationsPanelContainer.view.style["margin-left"] = "0";
            $(this.addStationsPanelContainer.view).animate({"margin-left": (- window.geoos.size.width + 30)}, 300, _ => {
                this.hide();
                this.open = false;
                window.geoos.topPanel.deactivateOption("opStations");
            });
        } else {
            window.geoos.closeFloatingPanels();
            this.show();
            this.addStationsPanelContainer.view.style["margin-left"] = (- window.geoos.size.width + 30) + "px";
            $(this.addStationsPanelContainer.view).animate({"margin-left": 0}, 300, _ => {
                this.addStationsPanelContent.show();
                this.refresh();
                this.open = true;
                this.edStationsNameFilter.focus();
                window.geoos.topPanel.activateOption("opStations");
            });
        }
    }

    onCmdCloseAddStationsPanel_click() {this.toggle()}

    filterStations(excludeSection, textFilter) {
        let filtered = [];
        for (let station of this.stations) {
            let passFilter = true;
            for (let section of this.sections) {
                if (passFilter && (!excludeSection || excludeSection != section.code)) {
                    let filters = this.filters[section.code];
                    if (filters.length) {
                        let hasSomeFilter = false;
                        filters.forEach(f => {
                            if (f == "no") {
                                if (!station[section.code].length) hasSomeFilter = true;
                            } else if (station[section.code].indexOf(f) >= 0) {
                                hasSomeFilter = true;
                            }
                        })
                        if (!hasSomeFilter) passFilter = false;
                    }
                }
            }
            if (passFilter) filtered.push(station);
        }
        if (textFilter) {
            textFilter = window.geoos.neutralizaTildes(textFilter);
            filtered = filtered.filter(l => (window.geoos.neutralizaTildes(l.name).indexOf(textFilter) >= 0));
        }
        return filtered;
    }
    refresh() {
        let htmlSections = "";
        for (let section of this.sections) {
            let firstSection = !htmlSections;
            let stations = this.filterStations(section.code);
            section.data.forEach(r => r.nStations = 0);
            stations.forEach(station => {
                let sectionCodes = station[section.code];
                if (!sectionCodes.length) {
                    section.data.find(r => r.code == "no").nStations++;
                } else {
                    sectionCodes.forEach(code => {
                        let r = section.data.find(r => r.code == code);
                        if (!r) console.error("No data with code '" + code + "' found in secton '" + section.code + "' declared in station ", station);
                        else r.nStations++;
                    })
                }
            })
            let filteredRows = section.data.filter(r => r.nStations > 0);
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
                        ${row.name + " (" + row.nStations + ")"}
                    </div>
                `;
            });
            htmlSections += `
                    </div>
                </div>
            `;
        }
        this.stationsAccordion.html = htmlSections;
        let accordion = $(this.stationsAccordion.view);
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
                })
            } else {
                items.css({height:0});
                items.show();
                caption.find("i").addClass("expanded");
                items.animate({height:section.filteredData.length * 22}, 300, _ => {
                    section.open = true;
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
            this.stationsFilterPills.html = "<b style='margin-left: 6px;'>Filtros Activos: </b>" + htmlFilters + "<a href='#' class='filters-cleaner btn btn-sm btn-secondary geoos-panel-ok'>Limpiar Filtros</a>";
            this.stationsFilterPills.show();
            $(this.stationsFilterPills.view).find(".add-panel-filter i").click(e => {
                let item = $(e.currentTarget);
                let sectionCode = item.data("section");
                let rowCode = item.data("code");
                let idx = this.filters[sectionCode].indexOf(rowCode);
                this.filters[sectionCode].splice(idx, 1);
                this.refresh();
            })
            $(this.stationsFilterPills.view).find(".filters-cleaner").click(_ => {
                this.filters = {};
                this.sections.forEach(section => this.filters[section.code] = [])
                this.refresh()
            });
        } else {
            this.stationsFilterPills.html = "";
            this.stationsFilterPills.hide();
        }

        // Results
        this.filteredStations = this.filterStations(null, this.edStationsNameFilter.value);
        this.lblStationsResume.text = this.filteredStations.length + " estaciones encontradas";
        let providers = this.filteredStations.reduce((map, s) => {
            map[s.proveedor] = true;
            return map;
        }, {})
        let providersList = Object.keys(providers).reduce((list, p) => {
            let geoosProvider = window.geoos.providers.find(gp => (gp.code == p));
            if (geoosProvider) list.push({code:p, name:geoosProvider.name});
            else list.push({code:p, name:p});
            return list;
        }, []);
        
        let htmlStations = "";
        for (let provider of providersList) {
            let {nStationsProvider, nSelected} = this.filteredStations.reduce((map, s) => {
                if (s.proveedor == provider.code) {
                    map.nStationsProvider++;
                    //if (window.geoos.isStationAdded(s.code)) map.nSelected++;
                    if (window.geoos.isStationSelected(s.code)) map.nSelected++;
                }
                return map;
            }, {nStationsProvider:0, nSelected:0});
            htmlStations += `
            <div class="add-panel-proveedor" data-code="${provider.code}">
                <i class="far fa-lg ${nStationsProvider == nSelected?"fa-check-square":"fa-square"} float-left mr-2"></i>
                ${provider.name}
            </div>`;
            for (let station of this.filteredStations.filter(s => s.proveedor == provider.code)) {
                let isFav = window.geoos.isFavStation(station.code);
                /* <i class="far fa-lg ${window.geoos.isStationAdded(station.code)?"fa-check-square":"fa-square"} float-left mr-2"></i> */
                htmlStations += `
                    <div class="add-panel-variable ml-4" data-code="${station.code}">
                        <i class="far fa-lg ${window.geoos.isStationSelected(station.code)?"fa-check-square":"fa-square"} float-left mr-2"></i>
                        ${station.name}
                        <img class="add-panel-variable-icon info" style="height: 16px;" src="img/icons/info${this.infoStationCode==station.code?"-active":""}.svg" />
                        <img class="add-panel-variable-icon favo" style="height: 16px;" src="img/icons/favo${isFav?"-active":""}.svg" />
                        <img class="add-panel-variable-icon download" style="height: 16px; filter: invert(1); " src="img/icons/download.svg" />
                    </div>
                `;
            }
        }
        this.stationsContainer.html = htmlStations;
        if (this.infoOpen && this.filteredStations.findIndex(l => (l.code == this.infoStationCode)) < 0) this.closeInfo();
        
        $(this.stationsContainer.view).find(".info").click(e => {
            $(this.stationsContainer.view).find(".info").each((idx, i) => $(i).attr("src", "img/icons/info.svg"));
            let img = $(e.currentTarget);
            let div = img.parent();
            let code = div.data("code");
            let station = this.filteredStations.find(v => v.code == code);
            if (this.infoOpen) {
                if (this.infoStationCode == station.code) {
                    this.closeInfo();
                } else {
                    this.refreshInfo(station);
                    img.attr("src", "img/icons/info-active.svg");
                }
            } else {
                img.attr("src", "img/icons/info-active.svg");
                this.openInfo()
                    .then(_ => this.refreshInfo(station));
            }
            return false;           
        });
        $(this.stationsContainer.view).find(".added").click(e => (false))
        $(this.stationsContainer.view).find(".favo").click(e => {
            let img = $(e.currentTarget);
            let code = img.parent().data("code");
            //agregar a favoritos
            if (!window.geoos.isFavStation(code)){
                let station = this.filteredStations.find(v => v.code == code);
                img.attr("src", "img/icons/favo-active.svg");
                window.geoos.addFavStation(station);                
            }else{
                window.geoos.deleteFavStation(code)
                img.attr("src", "img/icons/favo.svg");
            }
            return false;
        });
        $(this.stationsContainer.view).find(".download").click(e => {
            $(this.stationsContainer.view).find(".info").each((idx, i) => $(i).attr("src", "img/icons/info.svg"));
            let img = $(e.currentTarget);
            let div = img.parent();
            let code = div.data("code");
            let station = this.filteredStations.find(v => v.code == code);
            this.toggle();
            window.geoos.rightHelper.loadContent("main/rightHelper/exportStationData/Exporter", "Descargar Datos de Estación", "fas fa-download", {station});
            return false;           
        });
        $(this.stationsContainer.view).find(".add-panel-variable").click(e => {
            let div = $(e.currentTarget);
            let code = div.data("code");
            window.geoos.selectStation(code);
            this.refresh();
            this.refreshResume();
        })
        $(this.stationsContainer.view).find(".add-panel-proveedor").click(e => {
            let div = $(e.currentTarget);
            let code = div.data("code");
            let provider = providersList.find(p => p.code == code);
            let {toSelect, toUnselect} = this.filteredStations.reduce((map, s) => {
                if (s.proveedor == provider.code) {
                    if (window.geoos.isStationAdded(s.code)) {
                        map.toUnselect.push(s.code);
                    } else {
                        map.toSelect.push(s.code);
                    }
                }
                return map;
            }, {toSelect:[], toUnselect:[]});
            //console.log('select', toSelect);
            if (!toSelect.length) {
                for (const sel of toUnselect){
                    window.geoos.selectStation(sel);
                }
            } else {
                //window.geoos.addStations(toSelect);
                for (const sel of toSelect){
                    window.geoos.selectStation(sel);
                }
                
            }
            //console.log("seleccionadas", window.geoos.stationSelected);            
            this.refresh();
        })
        this.refreshResume();        
    }

    refreshResume() {
        let nSelected = window.geoos.stationSelected.length;
        if (!nSelected) {
            this.lblStationsCountResume.text = "No hay estaciones seleccionadas";
            if(window.geoos.getAddedStations().length < 1) this.cmdAccept.disable();
            else  this.cmdAccept.enable();
        } else if (nSelected == 1) {
            this.lblStationsCountResume.text = "Una estación seleccionada";
            this.cmdAccept.enable();
        } else {
            this.lblStationsCountResume.text = nSelected + " estaciones seleccionadas";
            this.cmdAccept.enable();
        }
    }

    onCmdCancelStations_click() {this.toggle()}

    onCmdAccept_click(){
        let sel = window.geoos.stationSelected;
        if (sel.length) {
            for(let i=0; i<sel.length; i++){
                if(!window.geoos.isStationAdded(sel[i])) window.geoos.addStation(sel[i]);
            } 
        }
        let unSel = window.geoos.stationUnselected;
        if (unSel.length) {
            for (let un of unSel){
                if(window.geoos.isStationAdded(un)){
                    window.geoos.removeStation(un);
                }
            }
        }

        window.geoos.stationUnselected = [];
        window.geoos.openMyPanel();
    }

    onEdStationsNameFilter_change() {
        this.refresh();
    }

    openInfo() {
        return new Promise(resolve => {
            this.stationsInfoContent.hide();
            this.stationsInfoPanel.view.style.height = "0";
            this.stationsInfoPanel.show();
            $(this.stationsInfoPanel.view).animate({height:200}, 300, _ => {
                this.infoOpen = true;
                this.addStationsPanelTabContent.view.style.height = "150px";
                this.stationsInfoContent.show();
                resolve();
            });
        })
    }
    closeInfo() {
        return new Promise(resolve => {
            this.stationsInfoContent.hide();
            this.stationsInfoPanel.view.style.height = "200px";
            $(this.stationsInfoPanel.view).animate({height:0}, 300, _ => {
                this.infoOpen = false;
                this.infoVarCode = null;
                this.stationsInfoPanel.hide();
                resolve()
            })
        })
    }

    onCmdStationsCloseInfoPanel_click() {
        $(this.stationsContainer.view).find(".info").each((idx, i) => $(i).attr("src", "img/icons/info.svg"));
        this.closeInfo()
    }

    refreshInfo(layer) {
        this.infoVarCode = layer.code;
        this.lblStationName.text = layer.name;
        let provider = window.geoos.providers.find(p => p.code == layer.providers[0]);
        this.stationsLogoProvider.view.src = provider.logo;
        this.stationsProviderUrl.view.setAttribute("href", provider.url);
        this.stationsProviderUrl.text = provider.name;
        if (layer.type == "raster") {
            this.layerDescription.html = layer.variable.options.description || "<p>No hay descripción de la Capa</p>";
            this.layerDetails.html = layer.variable.options.details || "<p>No hay detalles de la Capa</p>";
            this.layerAvailability.html = layer.variable.options.availability || "<p>No hay detalles de la disponibilidad en GEOOS para la Capa</p>";
        }
    }
}
ZVC.export(AddStationsPanel);