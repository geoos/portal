class FavPanel extends ZCustomController {
    async onThis_init() {
        this.refresh();
    }

    refresh() {
        let html = ``;
        for (let group of window.geoos.favGroups) { 
            //let layerSelected = selection.type == "layer" && selection.element.id == layer.id;
            let groupName = group.config.name;
            html += `  <div class="row fav-panel-group"  style="max-width:420px;">`;
            html += `    <div class="col-1"><i  class="group-activator fas fa-star mr-2 float-left"></i></div>`;
            html += `    <div class="col-9"><span class="favorite-selected-name"}><h5>${groupName}</h5></span></div>`;
            html += `    <div class="col" data-group-id="${group.id}">`;
            html += `      <i class=" group-deleter far fa-trash-alt ml-1 float-right" style="cursor: pointer;"></i>`;
            html += `      <i class=" group-activator fas fa-layer-group ml-1 float-right" style="cursor: pointer;"></i>`;
            html += `    </div>`;
            for (let layer of group.layers) {
                let layerName = layer.name;
                //html += `  <div class="row">`;
                html += `    <div class="col-1"><i  class="layer-activator fas fa-star ml-3 float-left"></i></div>`;
                html += `    <div class="col-9"><span class="favorite-selected-name"}>${layerName}</span></div>`;
                html += `    <div class="col" data-layer-id="${layer.id}" data-group-id="${group.id}">`;
                html += `      <i class=" layer-deleter far fa-trash-alt ml-1 float-right" style="cursor: pointer;"></i>`;
                html += `      <i class=" layer-activator fas fa-layer-group ml-1 float-right" style="cursor: pointer;"></i>`;
                //html += `    </div>`;
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
        window.geoos.toggleStation(stationId);
        this.refresh();

    }

    async layerActivator_click(e){ 
        let activator = $(e.currentTarget);
        let layerDiv = activator.parent();
        let layerId = layerDiv.data("layer-id");
        let variable = this.layers.find(v => v.code == layerId);
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

}
ZVC.export(FavPanel);