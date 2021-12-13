class MyPanel extends ZCustomController {
    onThis_init() {
        window.geoos.myPanel = this;
        this.open = false;
        $(this.view).find("div, i, img, span").disableSelection();
        this.hide();
        window.geoos.events.on("top", "clickMyPanel", _ => this.toggle())
        window.geoos.events.on("portal", "groupActivated", _ => this.refresh())
        window.geoos.events.on("portal", "groupDeleted", group => this.groupDeleted(group))
        window.geoos.events.on("portal", "layersAdded", _ => this.refresh())
        window.geoos.events.on("portal", "layersRemoved", _ => this.refresh())
        window.geoos.events.on("layer", "startWorking", layer => this.layerStartWorking(layer))
        window.geoos.events.on("layer", "finishWorking", layer => this.layerFinishWorking(layer))
        window.geoos.events.on("layer", "layerItemsChanged", layer => this.refresh())
        window.geoos.events.on("portal", "selectionChange", ({oldSelection, newSelection}) => this.refreshSelection(oldSelection, newSelection))
        window.geoos.events.on("group", "rename", group => this.groupRename(group))
        window.geoos.events.on("layer", "rename", layer => this.layerRename(layer))
        window.geoos.events.on("userObject", "rename", userObject => this.userObjectRename(userObject))
    }

    doResize(size) {
        if (!this.open) return;
        this.applySize();
    }
    applySize() {
        let size = window.geoos.size;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let height = size.height - (topMenuRect.top + topMenuRect.height);
        let width = 402;
        this.myPanelContainer.view.style.left = "0";
        this.myPanelContainer.view.style.top = (size.height - height - 5) + "px";
        this.myPanelContainer.view.style.width = width + "px";
        this.myPanelContainer.view.style.height = height + "px";
        this.myPanelContent.view.style.height = (height - 20) + "px";
    }

    toggleAndWait() {
        return new Promise(resolve => {
            this.toggle(_ => resolve())
        })
    }
    toggle(cb) {
        this.myPanelContent.hide();
        this.applySize();
        if (this.open) {
            if (window.geoos.configPanel.open) window.geoos.configPanel.close();
            this.myPanelContainer.view.style["margin-left"] = "-2px";
            $(this.myPanelContainer.view).animate({"margin-left": -402}, 300, _ => {
                this.hide();
                this.open = false;
                window.geoos.topPanel.deactivateOption("opMyPanel");
                if (cb) cb();
            });
        } else {
            window.geoos.closeFloatingPanels();
            this.show();
            this.myPanelContainer.view.style["margin-left"] = "-402px";
            $(this.myPanelContainer.view).animate({"margin-left": -2}, 300, _ => {
                this.myPanelContent.show();
                this.open = true;
                window.geoos.topPanel.activateOption("opMyPanel");
                this.refresh();
                if (cb) cb();
            });
        }
    }

    onCmdCloseMyPanel_click() {this.toggle()}

    onCmdAddGroup_click() {
        let baseName = "Nuevo Grupo de Capas";
        let name = baseName, idx=1;
        while(window.geoos.groups.find(g => g.name == name)) {
            name = baseName + " (" + (idx++) + ")";
        }
        window.geoos.addGroup({name});
        this.refresh();
    }

    refresh() {
        if (!this.open) return;
        let selection = window.geoos.selection;
        let html = ``;
        for (let group of window.geoos.groups) {
            let groupSelected = selection.type == "group" && selection.element.id == group.id;
            html += `<div class="my-panel-group ${group.active?"group-active":"group-inactive"}" data-group-id="${group.id}">`;
            //html += `  <i class="group-expander fas fa-lg fa-chevron-right${group.expanded?" -open":""} mr-2 float-left" style="width:24px;"></i>`;
            html += `  <i class="group-expander fas fa-lg fa-chevron-right ${group.expanded?" expanded":""} mr-2 float-left"></i>`;
            html += `  <i class="group-activator far fa-lg fa-${group.active?"dot-circle":"circle"} mr-2 float-left"></i>`;
            html += `  <div class="group-name"><span ${groupSelected?" class='my-panel-selected-name'":""}>${group.name}</span></div>`;
            html += `  <i class="group-context details-menu-icon fas fa-ellipsis-h ml-2 float-right"></i>`;
            html += `  <div class="my-panel-layers" ${group.expanded?"":" style='display:none; '"}>`;   
            for (let layer of group.layers) {
                let layerSelected = selection.type == "layer" && selection.element.id == layer.id;
                let layerItems = layer.getItems();
                let layerName = layer.name;
                if (layer.variable && layer.variable.levels && layer.variable.levels.length) {
                    layerName += " [" + layer.variable.levels[layer.level] + "]";
                }
                let layerState = "";
                if (layer instanceof GEOOSRasterLayer) {
                    layerState = `<div class="layer-state">${layer.getDataState()}</div>`;
                }
                html += `<div class="my-panel-layer" data-layer-id="${layer.id}" data-group-id="${group.id}">`;
                if (layerItems) {
                    html += `  <i class="layer-expander fas fa-lg fa-chevron-right ${layer.expanded?" expanded":""} mr-2 float-left"></i>`;
                } else {
                    html += `  <i class="layer-icon fas fa-lg fa-minus mr-2 float-left"></i>`;
                }
                html += `  <i  class="layer-activator far fa-lg fa-${layer.active?"check-square":"square"} mr-2 float-left"></i>`;
                html += `  <div class="layer-name"><span ${layerSelected?" class='my-panel-selected-name'":""}>${layerName}</span>${layerState}</div>`;
                html += `  <i class="layer-context details-menu-icon fas fa-ellipsis-h ml-2 float-right"></i>`;
                html += `  <i class="fas fa-spinner fa-spin ml-2 float-right" style="margin-top: -10px; display: none;"></i>`;
                if (layerItems) {
                    html += `<div class="my-panel-layer-items" ${layer.expanded?" style='display:grid; '":" style='display:none; '"} data-layer-id="${layer.id}" data-group-id="${group.id}">`;
                    for (let layerItem of layerItems) {
                        if (layerItem.type == "visualizer") {
                            html += `<div class="my-panel-visualizer" data-code="${layerItem.code}">`;
                            html += `  <img class="visualizer-activator" src="/img/icons/switch${layerItem.active?"-active":""}.svg" />`;
                            html += `  <div class="visualizer-name">${layerItem.name}</div>`;
                            html += `</div>`;
                        } else if (layerItem.type == "user-object") {
                            let objectSelected = selection.type == "user-object" && selection.element.id == layerItem.code;
                            html += `<div class="my-panel-user-object" data-code="${layerItem.code}" style="padding-left:${(20 * layerItem.level)}px;">`;
                            html += `  <img class="user-object-icon" src="${layerItem.icon}" style="filter:invert(1);" />`;
                            html += `  <div class="user-object-name"><span ${objectSelected?" class='my-panel-selected-name'":""}>${layerItem.name}</span></div>`;
                            if (layerItem.level == 0) {
                                html += `  <i class="user-object-deleter far fa-trash-alt ml-2 float-right" style="cursor: pointer; margin-top:-12px; font-size:12px; margin-right:6px; "></i>`;
                            }
                            html += `</div>`;
                        }
                    }
                    html += `</div>`;
                }
                html += `</div>`;
            }
            html += `  </div>`;
            html += `</div>`;
        }

        this.myContainer.html = html;
        let $myContainer = $(this.myContainer.view);        

        $myContainer.find(".group-expander").click(e => this.groupExpander_click(e));
        $myContainer.find(".group-activator").click(e => this.groupActivator_click(e));
        $myContainer.find(".layer-expander").click(e => this.layerExpander_click(e));
        $myContainer.find(".layer-activator").click(e => this.layerActivator_click(e));
        $myContainer.find(".visualizer-activator").click(e => this.visualizerActivator_click(e));
        $myContainer.find(".visualizer-name").click(e => this.visualizerName_click(e));
        $myContainer.find(".user-object-name").click(e => this.userObjectName_click(e));
        $myContainer.find(".user-object-deleter").click(e => this.userObjectDeleter_click(e));
        $myContainer.find(".group-context").click(e => this.groupContext_click(e));
        $myContainer.find(".layer-context").click(e => this.layerContext_click(e));
        $myContainer.find(".group-name").click(e => this.groupName_click(e));
        $myContainer.find(".layer-name").click(e => this.layerName_click(e));

        $myContainer.find(".layer-name").draggable({
            scroll: false,            
            containment:$(this.myContainer.view),
            appendTo:$(this.myPanelContainer.view),
            axis: "y",
            helper: "clone",
            revert: "invalid",
            start: e => {
                let span = $(e.currentTarget);
                let layerDiv = span.parent();
                let layer = window.geoos.getGroup(layerDiv.data("group-id")).getLayer(layerDiv.data("layer-id"));
                this.dragInfo = {type:"layer", layer:layer};
            }
        })
        $myContainer.find(".my-panel-layer").droppable({
            over:e => {
                if (!this.dragInfo) return;
                this.dropInfo = null;
                let layerDiv = $(e.target);
                let layer = window.geoos.getGroup(layerDiv.data("group-id")).getLayer(layerDiv.data("layer-id"));
                if (this.dragInfo.type == "layer") {
                    if (this.dragInfo.layer.group.id == layer.group.id) {
                        let srcLayerIndex = this.dragInfo.layer.index;
                        let tgtLayerIndex = layer.index;
                        if (srcLayerIndex == tgtLayerIndex || srcLayerIndex == (tgtLayerIndex + 1)) return;
                    }
                    this.dropInfo = {
                        type:"layer", layer:layer, target:layerDiv
                    }
                }
                if (this.dropInfo) layerDiv.addClass("target");
            },
            out:_ => {
                if (this.dropInfo && this.dropInfo.target) this.dropInfo.target.removeClass("target");
                this.dropInfo = null;
            },
            drop:e => {
                if (this.dragInfo && this.dropInfo) this.handleDrop(e);
            }
        })
        $myContainer.find(".group-name").droppable({
            over:e => {
                if (!this.dragInfo) return;
                this.dropInfo = null;
                let span = $(e.target);
                let groupDiv = span.parent();
                let group = window.geoos.getGroup(groupDiv.data("group-id"));
                let targetDiv = groupDiv.find(".my-panel-layers");
                if (this.dragInfo.type == "layer") {
                    if (this.dragInfo.layer.group.id == group.id) {
                        let srcLayerIndex = this.dragInfo.layer.index;
                        if (srcLayerIndex == 0) return;
                    }
                    this.dropInfo = {
                        type:"group", group:group, target:targetDiv
                    }
                }
                if (this.dropInfo) targetDiv.addClass("target");
            },
            out:_ => {
                if (this.dropInfo && this.dropInfo.target) this.dropInfo.target.removeClass("target");
                this.dropInfo = null;
            },
            drop:e => {
                if (this.dragInfo && this.dropInfo) this.handleDrop(e);
            }
        })

    }

    groupExpander_click(e) {
        let expander = $(e.currentTarget);
        let groupDiv = expander.parent();
        let groupId = groupDiv.data("group-id");
        let layersDiv = groupDiv.find(".my-panel-layers");
        let group = window.geoos.getGroup(groupId);
        if (group.expanded) {
            group.savedHeight = layersDiv.height();
            $(groupDiv.children()[0]).removeClass("expanded");
            layersDiv.animate({height:0}, 200, _ => {
                group.expanded = false;
                layersDiv.hide();
                //$(groupDiv.children()[0]).removeClass("fa-folder-open").addClass("fa-folder");
                //$(groupDiv.children()[0]).removeClass("fa-folder-expanded").addClass("fa-folder");
            })
        } else {
            layersDiv.show();
            layersDiv.height(0);
            $(groupDiv.children()[0]).addClass("expanded");
            layersDiv.animate({height:group.savedHeight}, 200, _ => {
                group.expanded = true;
                layersDiv.css({height:""})
                //$(groupDiv.children()[0]).removeClass("fa-folder").addClass("fa-folder-open");
            })
        }
    }
    
    async groupActivator_click(e) {
        let activator = $(e.currentTarget);
        let groupDiv = activator.parent();
        let groupId = groupDiv.data("group-id");
        window.geoos.activateGroup(groupId);
    }

    layerExpander_click(e) {
        let expander = $(e.currentTarget);
        let layerDiv = expander.parent();
        let groupId = layerDiv.data("group-id");
        let layerId = layerDiv.data("layer-id");
        let itemsDiv = layerDiv.find(".my-panel-layer-items");
        let group = window.geoos.getGroup(groupId);
        let layer = group.getLayer(layerId);
        if (layer.expanded) {
            layer.savedHeight = itemsDiv.height();
            expander.removeClass("expanded");
            itemsDiv.animate({height:0}, 200, _ => {
                layer.expanded = false;
                itemsDiv.hide();
            })
        } else {
            itemsDiv.show();
            itemsDiv.height(0);
            expander.addClass("expanded");
            itemsDiv.animate({height:layer.savedHeight}, 200, _ => {
                layer.expanded = true;
                itemsDiv.css({height:""})
            })
        }
    }

    async layerActivator_click(e) {
        let activator = $(e.currentTarget);
        let layerDiv = activator.parent();
        let groupId = layerDiv.data("group-id");
        let layerId = layerDiv.data("layer-id");
        let layer = window.geoos.getGroup(groupId).getLayer(layerId);
        await layer.toggleActive();
        if (layer.active) {
            activator.removeClass("fa-square").addClass("fa-check-square");
        } else {
            activator.removeClass("fa-check-square").addClass("fa-square");
        }
    }

    async visualizerActivator_click(e) {
        let activator = $(e.currentTarget);
        let visualizerDiv = activator.parent();
        let visualizerCode = visualizerDiv.data("code");
        let layerItemsDiv = visualizerDiv.parent();
        let groupId = layerItemsDiv.data("group-id");
        let layerId = layerItemsDiv.data("layer-id");
        let layer = window.geoos.getGroup(groupId).getLayer(layerId);
        let visualizer = layer.getVisualizer(visualizerCode);
        await this.toggleVisualizer(visualizer);
    }
    async visualizerName_click(e) {
        let visNameDiv = $(e.currentTarget);
        let visualizerDiv = visNameDiv.parent();
        let visualizerCode = visualizerDiv.data("code");
        let layerItemsDiv = visualizerDiv.parent();
        let groupId = layerItemsDiv.data("group-id");
        let layerId = layerItemsDiv.data("layer-id");
        let layer = window.geoos.getGroup(groupId).getLayer(layerId);
        let visualizer = layer.getVisualizer(visualizerCode);
        if (!visualizer.active) await this.toggleVisualizer(visualizer);
        await window.geoos.selectElement("visualizer", visualizer);
    }
    async userObjectName_click(e) {
        let uoNameDiv = $(e.currentTarget);
        let uoDiv = uoNameDiv.parent();
        let uoCode = uoDiv.data("code");
        let uo = window.geoos.getUserObject(uoCode);
        if (uo) {
            let opener = $(e.currentTarget);
            opener.find("span").addClass("my-panel-selected-name");
            await window.geoos.selectElement("user-object", uo);
        }
    }
    async userObjectDeleter_click(e) {
        let uoNameDiv = $(e.currentTarget);
        let uoDiv = uoNameDiv.parent();
        let uoCode = uoDiv.data("code");
        let uo = window.geoos.getUserObject(uoCode);
        if (uo) {
            this.showDialog("common/WConfirm", {message:"¿Confirma que desea eliminar el objeto '" + uo.name + "'?"}, 
                _ => window.geoos.removeUserObject(uo.id));
        }
    }
    async toggleVisualizer(visualizer) {
        let query = ".my-panel-layer-items[data-group-id='" + visualizer.layer.group.id + "'][data-layer-id='" + visualizer.layer.id + "'] .my-panel-visualizer[data-code='" + visualizer.code + "'] img";
        let activator = $(this.myContainer.view).find(query)
        await visualizer.toggleActive();
        if (visualizer.active) {
            activator.attr("src", "img/icons/switch-active.svg");
        } else {
            activator.attr("src", "img/icons/switch.svg");
        }
    }

    async handleDrop(e) {
        if (this.dragInfo.type == "layer") {
            let layer = this.dragInfo.layer;
            await layer.group.removeLayer(layer.id, true); // dont check tools availability, to avoid then to be removed
            if (this.dropInfo.type == "layer") {
                await this.dropInfo.layer.group.insertLayerAfter(layer, this.dropInfo.layer);
            } else if (this.dropInfo.type == "group") {
                await this.dropInfo.group.insertLayerAt0(layer);
            }
            this.refresh();        }
        this.dragInfo = null;
        this.dropInfo = null;
    }

    groupDeleted(group) {
        $(this.myContainer.view).find(".my-panel-group[data-group-id='" + group.id + "']").remove();
    }

    async groupContext_click(e) {
        let opener = $(e.currentTarget);
        let groupDiv = opener.parent();
        let groupId = groupDiv.data("group-id");
        let group = window.geoos.getGroup(groupId);
        let z = new ZPop(opener, [{
            code:"duplicate", icon:"far fa-copy", label:"Duplicar Grupo", 
        }, {
            code:"sep", icon:"-", label:"-", 
        }, {
            code:"favo", icon:"fas fa-star", label:"Agregar a Favoritos", 
        }, {
            code:"share", icon:"fas fa-share-square", label:"Compartir", 
        }, {
            code:"sep", icon:"-", label:"-", 
        }, {
            code:"delete", icon:"far fa-trash-alt", label:"Eliminar el Grupo", 
        }, {
            code:"sep", icon:"-", label:"-", 
        }, {
            code:"scalesPanel", icon:"fas fa-palette", label:"Escalas de Colores", 
        }], {
            vMargin:10,
            onClick:async (code, item) => {
                if (code == "delete") {
                    this.showDialog("common/WConfirm", {
                        subtitle:"Eliminar grupo de Capas",
                        message:"¿Confirma que desea eliminar el Grupo de Capas '" + group.name + "'?"
                    }, async _ => {
                        try {
                            await window.geoos.deleteGroup(groupId);
                        } catch(error) {
                            console.log("error")
                            this.showDialog("common/WError", {
                                subtitle:"Advertencia",
                                message:error.toString()
                            });    
                        }
                    })
                } else if (code == "share") {
                    let s = group.serialize();
                    s.mapView = window.geoos.mapPanel.serialize();
                    s.toolsStatus = window.geoos.toolsPanel.status;
                    //console.log("grupo map:", s);
                    let linkToken = await zPost("createLink.geoos", {content:s});
                    let url = window.location.href.split('?')[0] + "?group=" + linkToken;
                    const el = document.createElement('textarea');
                    el.value = url;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                    this.showDialog("common/WInfo", {message:"Se ha copiado al portapapeles un enlace con el grupo exportado", subtitle:"Compartir Grupo de Capas"})
                } else if (code == "favo") {
                    //let groupName = group.config.name;
                    //let s = group.serialize();
                    //agregar a favoritos
                    if(!window.geoos.isFavorite(groupId, "group")){
                        console.log("group add", group);
                        let s = group.serialize();
                        window.geoos.addFavGroups(s);
                        window.geoos.openFavorites();
                    }else{
                        window.geoos.deleteFavGroups(s);
                        window.geoos.openFavorites();
                    }
                    return false;

                } else if (code == "duplicate") {
                    this.groupDuplicate(group);
                } else if (code == "scalesPanel") {
                    window.geoos.infoBarPanel.toggle();
                }
            }
        })
        z.show();
    }

    async groupName_click(e) {
        let opener = $(e.currentTarget);
        opener.find("span").addClass("my-panel-selected-name")
        let groupDiv = opener.parent();
        let groupId = groupDiv.data("group-id");
        let group = window.geoos.getGroup(groupId);
        await window.geoos.selectElement("group", group);
    }
    async layerName_click(e) {
        let opener = $(e.currentTarget);
        opener.find("span").addClass("my-panel-selected-name")
        let layerDiv = opener.parent();
        let groupId = layerDiv.data("group-id");
        let group = window.geoos.getGroup(groupId);
        let layerId = layerDiv.data("layer-id");
        let layer = group.getLayer(layerId);
        await window.geoos.selectElement("layer", layer);
    }    

    async layerContext_click(e) {
        let opener = $(e.currentTarget);
        let layerDiv = opener.parent();
        let groupId = layerDiv.data("group-id");
        let group = window.geoos.getGroup(groupId);
        let layerId = layerDiv.data("layer-id");
        let layer = group.getLayer(layerId);
        let items = [{
                code:"duplicate", icon:"far fa-copy", label:"Duplicar Capa", 
            }, {
                code:"sep", icon:"-", label:"-", 
            }, {
                code:"favo", icon:"fas fa-star", label:"Agregar a Favoritos", 
            }, {
                code:"sep", icon:"-", label:"-", 
            }, {
                code:"delete", icon:"far fa-trash-alt", label:"Eliminar la Capa", 
            }
        ];
        if (layer instanceof GEOOSStationsLayer) {
            // La capa de estaciones no se puede duplicar
            items.splice(0,2);
        }
        let z = new ZPop(opener, items, {
            vMargin:10,
            onClick:(code, item) => {
                if (code == "delete") {
                    this.showDialog("common/WConfirm", {
                        subtitle:"Eliminar Capa",
                        message:"¿Confirma que desea eliminar la Capa '" + layer.name + "'?"
                    }, async _ => {
                        try {
                            await group.removeLayer(layerId);
                            await window.geoos.events.trigger("portal", "layerDeleted", layer);
                            this.refresh();
                        } catch(error) {
                            console.log("error")
                            this.showDialog("common/WError", {
                                subtitle:"Advertencia",
                                message:error.toString()
                            });    
                        }
                    })
                } else if (code=="favo") {   
                    let name = "Capas de Mi Panel";
                    let found = window.geoos.user.config.favorites.groups.find(g => g.config.name == name);
                    if(found) {
                        let desGroup = GEOOSGroup.deserialize(found);
                        desGroup.addLayer(layer);
                        let s = desGroup.serialize();
                        window.geoos.deleteFavGroups(s.id);
                        window.geoos.addFavGroups(s);
                        window.geoos.openFavorites();
                        
                    }else{
                        //codName = name, idx=Math.random();
                        let g = new GEOOSGroup(name);
                        g = GEOOSGroup.deserialize(g);
                        g.name="Capas de Mi Panel";
                        g.addLayer(layer);
                        let s = g.serialize();
                        window.geoos.addFavGroups(s);
                        window.geoos.openFavorites();
                    }                 
                } else if (code == "duplicate") {
                    this.layerDuplicate(layer);
                }
            }
        })
        z.show();
    }

    refreshLayerState(layer) {
        $(this.myContainer.view).find(".my-panel-layer[data-layer-id='" + layer.id + "'] .layer-name .layer-state").text(layer.getDataState());
    }
    layerStartWorking(layer) {
        $(this.myContainer.view).find(".my-panel-layer[data-layer-id='" + layer.id + "'] .fa-spin").show();
        this.refreshLayerState(layer);
    }
    layerFinishWorking(layer) {
        $(this.myContainer.view).find(".my-panel-layer[data-layer-id='" + layer.id + "'] .fa-spin").hide();
        this.refreshLayerState(layer);
    }

    clearSelection() {
        let $myContainer = $(this.myContainer.view);
        $myContainer.find(".group-name span").removeClass("my-panel-selected-name");
        $myContainer.find(".layer-name span").removeClass("my-panel-selected-name");
        $myContainer.find(".user-object-name span").removeClass("my-panel-selected-name");
    }
    async refreshSelection(oldSelection, newSelection) {
        this.clearSelection();
        let $myContainer = $(this.myContainer.view);
        if (newSelection.type) {
            if (newSelection.type == "group") {
                $myContainer.find(".my-panel-group[data-group-id='" + newSelection.element.id + "'] .group-name span").addClass("my-panel-selected-name");
            } else if (newSelection.type == "layer") {
                $myContainer.find(".my-panel-layer[data-group-id='" + newSelection.element.group.id + "'][data-layer-id='" + newSelection.element.id + "'] .layer-name span").addClass("my-panel-selected-name");
            } else if (newSelection.type == "user-object") {
                $myContainer.find(".my-panel-user-object[data-code='" + newSelection.element.id + "'] .user-object-name span").addClass("my-panel-selected-name");
            }    
            if (!window.geoos.configPanel.open) {
                await window.geoos.configPanel.toggle();
                await window.geoos.configPanel.refresh(newSelection);
            }
        }
    }

    groupRename(group) {
        $(this.myContainer.view).find(".my-panel-group[data-group-id='" + group.id + "'] .group-name span").text(group.name);
    }
    layerRename(layer) {
        let layerName = layer.name;
        if (layer.variable && layer.variable.levels && layer.variable.levels.length) {
            layerName += " [" + layer.variable.levels[layer.level] + "]";
        }
        $(this.myContainer.view).find(".my-panel-layer[data-group-id='" + layer.group.id + "'][data-layer-id='" + layer.id + "'] .layer-name span").text(layerName);
    }
    userObjectRename(userObject) {
        $(this.myContainer.view).find(".my-panel-user-object[data-code='" + userObject.id + "'] .user-object-name span").text(userObject.name);
    }
    layerDuplicate(layer) {
        let s = layer.serialize();
        s.id = generateId();
        let n = 0, name;
        do {
            n++;
            name = s.name + " [" + n + "]";
        } while(window.geoos.getActiveGroup().layers.find(l => l.name == name));
        s.name = name;
        let newLayer = GEOOSLayer.deserialize(s);
        window.geoos.getActiveGroup().addLayer(newLayer);
        this.refresh();
    }
    groupDuplicate(group) {
        let s = group.serialize();
        console.log("s", s);
        s.id = generateId();
        let n = 0, name;
        do {
            n++;
            name = s.name + " [" + n + "]";
        } while(window.geoos.getActiveGroup().layers.find(l => l.name == name));
        s.name = name;
        // Regenerar id de las capas
        s.layers.forEach(layer => {
            layer.id = generateId();
        })
        let newGroup = GEOOSGroup.deserialize(s);
        newGroup.active = false;
        console.log("newGroup", newGroup);
        window.geoos.addExistingGroup(newGroup);
        this.refresh();
    }    

    async selectScaleConfig(layer, visualizer) {
        await window.geoos.selectElement("visualizer", visualizer);
        await window.geoos.configPanel.selectColorScale();
    }
}
ZVC.export(MyPanel);