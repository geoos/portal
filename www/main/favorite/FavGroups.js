class FavGroups extends ZCustomController {
    async onThis_init() {
        window.geoos.events.on("portal", "userConfigChanged", _ => {
            this.refresh();
            this.applyConfig(true);
        });
    }

    get config() {
        return window.geoos.user.config.favorites
    }

    async refresh() {
        this.groups = this.config.groups;
        let html = ``;
        for (let serializedGroup of this.groups) {
            let group = GEOOSGroup.deserialize(serializedGroup);
            let isInitial = this.config.initialGroup == group.id;
            let groupName = group.config.name;
            html += `   <div class="row fav-panel-group mt-3" data-group-id="${group.id}"  style="max-width:420px;">
                            <div class="col-1 mt-2"data-layer-num="${group.layers}"><img style="cursor: pointer; " class="group-default float-left"  src="/img/icons/default${isInitial?"-active":""}.svg"/> </div>
                            <div class="col-9 mt-2"><span class="favorite-selected-group"><h5>${groupName}</h5></span></div>
                            <div class="col mt-2">
                                <i class=" group-deleter far fa-trash-alt ml-1 float-right" style="cursor: pointer;"></i>
                                <i class=" group-activator fas fa-layer-group ml-1 float-right" style="cursor: pointer;"></i>
                            </div>`;
            for (let layer of group.layers) {
                let layerName = layer.config.name;
                html += `<div class="col-1 mt-1"></div>
                        <div class="col-9 mt-1"><span class="favorite-selected-layer">${layerName}</span></div>
                        <div class="col mt-1" data-layer-id="${layer.id}" data-group-id="${group.id}">
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
        $myFavContainer.find(".group-default").click(e => this.groupInitial(e));

    }
    async groupInitial(e){
        let activator = $(e.currentTarget);
        let div = activator.parent().parent();
        let groupId = div.data("group-id");
        await window.geoos.toggleInitialGroup(groupId);
        this.refresh();
    }

    async groupActivator_click(e){ 
        let activator = $(e.currentTarget);
        let div = activator.parent().parent();
        let groupId = div.data("group-id");
        let group = window.geoos.getFavoriteGroup(groupId);
        let newGroup = GEOOSGroup.deserialize(group);
        newGroup.regenerateIds();
        window.geoos.addExistingGroup(newGroup);
        await window.geoos.activateGroup(newGroup.id);
        window.geoos.openMyPanel();
    }

    async layerActivator_click(e){ 
        let activator = $(e.currentTarget);
        let div = activator.parent();
        let layerId = div.data("layer-id");
        let groupId = div.data("group-id");
        let group = window.geoos.getFavoriteGroup(groupId);
        if (!group) return;
        let serializedLayer = group.layers.find(l => l.id == layerId);
        console.log(groupId, layerId, serializedLayer);
        let layer = GEOOSLayer.deserialize(serializedLayer);
        geoos.getActiveGroup().addLayer(layer);
        window.geoos.openMyPanel();
    }

    async groupDeleter_click(e){
        let activator = $(e.currentTarget);
        let div = activator.parent().parent();
        let groupId = div.data("group-id");
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea eliminar el Grupo?"}, async _ => {
            await window.geoos.deleteFavGroup(groupId);
        })        
        // this.refresh();
    }

    async layerDeleter_click(e){
        let activator = $(e.currentTarget);
        let div = activator.parent();
        let layerId = div.data("layer-id");
        let groupId = div.data("group-id");
        //console.log("layerId: ", layerId, " groupId: ", groupId);
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea eliminar la Capa?"}, async _ => {
            await window.geoos.deleteFavLayerInGroup(groupId, layerId);
        });
        //this.refresh();
    }


    applyConfig(onlyShow) {
        window.geoos.mapPanel.resetGrid();
        if (!onlyShow) window.geoos.user.saveConfig();
    }

}

ZVC.export(FavGroups);