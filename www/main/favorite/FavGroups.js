class FavGroups extends ZCustomController {
    async onThis_init() {
        this.layers = await window.geoos.getLayers();
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
            //console.log("groupDef", group.config.name, this.groupDef);
            let groupName = group.config.name;
            html += `   <div class="row fav-panel-group" data-group-id="${group.id}"  style="max-width:420px;">
                            <div class="col-1 mt-2"><img  class="group-default float-left"  src="/img/icons/default${this.groupDef?"-active":""}.svg"/> </div>
                            <div class="col-9 mt-2"><span class="favorite-selected-name"}><h5>${groupName}</h5></span></div>
                            <div class="col mt-2">
                                <i class=" group-deleter far fa-trash-alt ml-1 float-right" style="cursor: pointer;"></i>
                                <i class=" group-activator fas fa-layer-group ml-1 float-right" style="cursor: pointer;"></i>
                            </div>`;
            for (let layer of group.layers) {
                let layerName = layer.name;
                let layerId = layer.config.dataSet.code + "." + layer.variable.code;
                //let layerId = layer.id;
                html += `<div class="col-1 mt-1"></div>
                        <div class="col-9 mt-1"><span class="favorite-selected-name"}>${layerName}</span></div>
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
        let div = activator.parent().parent();
        let groupId = div.data("group-id");
        let group = window.geoos.getFavoriteGroup(groupId);
        //let newGroup = GEOOSGroup.deserialize(group);
        window.geoos.addDefault(group);
        this.refresh();
    }

    async groupActivator_click(e){ 
        let activator = $(e.currentTarget);
        let div = activator.parent().parent();
        let groupId = div.data("group-id");
        let group = window.geoos.getFavoriteGroup(groupId);
        console.log("group", group);
        //this.groupDuplicate(group);
        let newGroup = GEOOSGroup.deserialize(group);
        console.log("newGroup", newGroup);
        window.geoos.addExistingGroup(newGroup);

        window.geoos.openMyPanel();
    }

    async layerActivator_click(e){ 
        let activator = $(e.currentTarget);
        let div = activator.parent();
        let layerId = div.data("layer-id");
        console.log("layerId", layerId);
        let variable = this.layers.find(v => v.code == layerId);
        console.log("layers", this.layers);
        console.log("var:", variable);
        window.geoos.addLayer(variable);
        window.geoos.openMyPanel();
    }

    async groupDeleter_click(e){
        let activator = $(e.currentTarget);
        let div = activator.parent().parent();
        console.log("div: ", div);
        let groupId = div.data("group-id");
        console.log("groupId: ", groupId);
        window.geoos.deleteFavGroups(groupId);
        window.geoos.deleteDefault(groupId);
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