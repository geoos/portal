class FavGroups extends ZCustomController {
    async onThis_init() {
        this.layers = await window.geoos.getLayers();
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

    refresh() {
        this.groups = this.config.groups;
        let html = ``;
        for (let serializedGroup of this.groups) {
            let group = GEOOSGroup.deserialize(serializedGroup);
            
            //console.log("group", window.geoos.groups);
            //let layerSelected = selection.type == "layer" && selection.element.id == layer.id;
            let groupName = group.config.name;
            html += `  <div class="row fav-panel-group"  style="max-width:420px;">`;
            html += `    <div class="col-1"><i  class="group-activator fas mr-2 float-left"></i></div>`;
            html += `    <div class="col-9"><span class="favorite-selected-name"}><h5>${groupName}</h5></span></div>`;
            html += `    <div class="col" data-group-id="${group.id}">`;
            //html += `    <div class="col" data-group-id="${group.id}">`;
            html += `      <i class=" group-deleter far fa-trash-alt ml-1 float-right" style="cursor: pointer;"></i>`;
            html += `      <i class=" group-activator fas fa-layer-group ml-1 float-right" style="cursor: pointer;"></i>`;
            html += `    </div>`;
            for (let layer of group.layers) {
                let layerName = layer.name;
                //let layerId = layer.config.dataSet.code + "." + layer.variable.code;
                let layerId = layer.id;
                html += `    <div class="col-1"><i  class="layer-activator fas ml-3 float-left"></i></div>`;
                html += `    <div class="col-9"><span class="favorite-selected-name"}>${layerName}</span></div>`;
                html += `    <div class="col" data-layer-id="${layerId}" data-group-id="${group.id}">`;
                html += `      <i class=" layer-deleter far fa-trash-alt ml-1 float-right" style="cursor: pointer;"></i>`;
                html += `      <i class=" layer-activator fas fa-layer-group ml-1 float-right" style="cursor: pointer;"></i>`;
                html += `  </div>`;
            }
            html += `  </div>`;
        }
        this.myFavContainer.html = html;
        let $myFavContainer = $(this.myFavContainer.view);        

        //$myFavContainer.find(".group-activator").click(e => this.groupActivator_click(e));
        $myFavContainer.find(".group-deleter").click(e => this.groupDeleter_click(e));
        $myFavContainer.find(".layer-activator").click(e => this.layerActivator_click(e));
        $myFavContainer.find(".layer-deleter").click(e => this.layerDeleter_click(e));
    }
     async groupActivator_click(e){ 
        let activator = $(e.currentTarget);
        let stationDiv = activator.parent();
        let stationId = stationDiv.data("station-id");
        window.geoos.openMyPanel();
        this.refresh();

    }

    async layerActivator_click(e){ 
        let activator = $(e.currentTarget);
        let div = activator.parent();
        let layerId = div.data("layer-id");
        console.log("layerId", layerId);
        let variable = this.layers.find(v => v.code == layerId);
        console.log("var:", variable);
        window.geoos.addLayer(variable);
        window.geoos.openMyPanel();
    }

    async groupDeleter_click(e){
        let activator = $(e.currentTarget);
        let div = activator.parent();
        console.log("div: ", div);
        let groupId = div.data("group-id");
        console.log("groupId: ", groupId);
        window.geoos.deleteFavGroups(groupId);
        this.refresh();
    }

    async layerDeleter_click(e){
        let activator = $(e.currentTarget);
        let div = activator.parent();
        let layerId = div.data("layer-id");
        let groupId = div.data("group-id");
        console.log("layerId: ", layerId, " groupId: ", groupId);
        window.geoos.deleteFavLayerGroups(groupId, layerId);
        this.refresh();
    }


    applyConfig(onlyShow) {
        window.geoos.mapPanel.resetGrid();
        if (!onlyShow) window.geoos.user.saveConfig();
    }
}

ZVC.export(FavGroups);