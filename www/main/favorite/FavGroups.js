class FavGroups extends ZCustomController {
    async onThis_init() {
        this.layers = await window.geoos.getLayers();
        //this.groups = [];
        //this.groupDef = false;
        window.geoos.events.on("portal", "userConfigChanged", _ => {
            this.refresh();
            this.applyConfig(true);
        });
    }

    get config() {
        if (!window.geoos.user.config.favorites) window.geoos.user.config.favorites = {
            groups:[], layers:[], stations:[]
        }; 
        return window.geoos.user.config.favorites
    }

    async refresh() {
        this.groups = this.config.groups;
        let html = ``;
        for (let serializedGroup of this.groups) {
            let group = GEOOSGroup.deserialize(serializedGroup);
            this.groupDef = window.geoos.isDefault(group);
            console.log("group", group);
            let groupName = group.config.name;
            html += `   <div class="row fav-panel-group" data-group-id="${group.id}"  style="max-width:420px;">
                            <div class="col-1 mt-2"data-layer-num="${group.layers}"><img  class="group-default float-left"  src="/img/icons/default${this.groupDef?"-active":""}.svg"/> </div>
                            <div class="col-9 mt-2"><span class="favorite-selected-group"><h5>${groupName}</h5></span></div>
                            <div class="col mt-2">
                                <i class=" group-deleter far fa-trash-alt ml-1 float-right" style="cursor: pointer;"></i>
                                <i class=" group-activator fas fa-layer-group ml-1 float-right" style="cursor: pointer;"></i>
                            </div>`;
            for (let layer of group.layers) {
                //console.log("layer", layer, layer instanceof GEOOSRasterLayer);
                if (layer instanceof GEOOSRasterLayer){
                    var layerName = layer.config.name;
                    var layerId = layer.config.dataSet.code + "." + layer.variable.code;
                }
                else if (layer instanceof GEOOSStationsLayer){
                    var layerName = layer.config.name;
                    var layerId = [];
                    for(let i of layer.points){
                        layerId.push(i.id);
                    }
                }

                //let layerId = layer.id;
                html += `<div class="col-1 mt-1"></div>
                        <div class="col-9 mt-1"><span class="favorite-selected-layer">${layerName}</span></div>
                        <div class="col mt-1" data-layer-id="${layerId}" data-group-id="${group.id}">
                            <i class=" layer-deleter far fa-trash-alt ml-1 float-right" style="cursor: pointer;"></i>
                            <i class=" layer-activator fas fa-layer-group ml-1 float-right" style="cursor: pointer;"></i>
                        </div>`;
            }
            html += `</div>`;
        }
        this.myFavContainer.html = html;
        let $myFavContainer = $(this.myFavContainer.view);

        $myFavContainer.find(".group-activator").click(e => this.groupActivator_click(e));
        $myFavContainer.find(".group-deleter").click(e => this.groupDeleter_click(e));
        $myFavContainer.find(".layer-activator").click(e => this.layerActivator_click(e));
        $myFavContainer.find(".layer-deleter").click(e => this.layerDeleter_click(e));
        $myFavContainer.find(".group-default").click(e => this.groupDefault(e));

    }
    async groupDefault(e){
        let activator = $(e.currentTarget);
        let layers = activator.parent().data("layer-num");
        let div = activator.parent().parent();
        let groupId = div.data("group-id");
        let group = window.geoos.getFavoriteGroup(groupId);
        window.geoos.addDefault(group);
        this.refresh();
    }

    async groupActivator_click(e){ 
        let activator = $(e.currentTarget);
        let div = activator.parent().parent();
        let groupId = div.data("group-id");
        let group = window.geoos.getFavoriteGroup(groupId);
        let ds = GEOOSGroup.deserialize(group);
        //console.log("group", group);

        let newGroup = await window.geoos.addGroup(ds);
        let allLayers = await window.geoos.getLayers();
        for (let layer of ds.layers){
            //console.log("layer", layer);
            let code = [];
            if (layer instanceof GEOOSRasterLayer){
                code = layer.config.dataSet.code + "." + layer.config.variable.code;
                let newLayer = allLayers.find(element => element.code === code);
                window.geoos.addLayer(newLayer, newGroup);
            }else if (layer instanceof GEOOSStationsLayer){
                //console.log("caso 2");
 
                for(let i of layer.points){
                    //layerId.push(i.id);
                    window.geoos.addStation(i.id, newGroup);
                }
                //console.log("layerId",layerId);
            }
        }
        window.geoos.openMyPanel();
    }

    async layerActivator_click(e){ 
        let activator = $(e.currentTarget);
        let div = activator.parent();
        let layerId = div.data("layer-id");
        //console.log("layerId", layerId);
        let cadena = layerId.split(",")
        //console.log("cadena", cadena);
        if(cadena.length == 1) {
            let variable = this.layers.find(v => v.code == layerId);
            //console.log("var:", variable);
            window.geoos.addLayer(variable);
            window.geoos.openMyPanel();
        }else {
            for(let i in cadena){
                //console.log("i:", i);
                window.geoos.addStation(cadena[i]);
            }
            window.geoos.openMyPanel();
        }
    }

    async groupDeleter_click(e){
        let activator = $(e.currentTarget);
        let div = activator.parent().parent();
        console.log("div: ", div);
        let groupId = div.data("group-id");
        console.log("groupId: ", groupId);
        await window.geoos.deleteFavGroups(groupId);
        await window.geoos.deleteDefault(groupId);
        this.refresh();
    }

    async layerDeleter_click(e){
        let activator = $(e.currentTarget);
        let div = activator.parent();
        let layerId = div.data("layer-id");
        let groupId = div.data("group-id");
        console.log("layerId: ", layerId, " groupId: ", groupId);
        await window.geoos.deleteFavLayerGroups(groupId, layerId);
        this.refresh();
    }


    applyConfig(onlyShow) {
        window.geoos.mapPanel.resetGrid();
        if (!onlyShow) window.geoos.user.saveConfig();
    }

    groupDuplicate(group) {
        let s = group;
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
}

ZVC.export(FavGroups);