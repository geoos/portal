class FavLayers extends ZCustomController {
    async onThis_init() {
        this.layers = await window.geoos.getLayers();
        window.geoos.events.on("portal", "userConfigChanged", _ => {
            this.refresh();
            this.applyConfig(true);
        });
    }

    get config() {return window.geoos.user.config.favorites}

    async refresh() {        
        let html = ``;
        for (let layer of this.config.layers) {
            html += `  <div class="row"  style="max-width:420px;">`;
            html += `    <div class="col-1 mt-2"><i  class="layer-activator fas fa-star float-left"></i></div>`;
            html += `    <div class="col-9 mt-2"><span class="favorite-selected-name"}>${layer.name}</span></div>`;
            html += `    <div class="col mt-2" data-layer-id="${layer.id}">`;
            html += `      <i class=" layer-deleter far fa-trash-alt ml-1 float-right" style="cursor: pointer;"></i>`;
            html += `      <i class=" layer-activator fas fa-layer-group ml-1 float-right" style="cursor: pointer;"></i>`;
            html += `    </div>`;
            html += `  </div>`;
        }
        this.myFavContainer.html = html;
        let $myFavContainer = $(this.myFavContainer.view);        

        $myFavContainer.find(".layer-activator").click(e => this.layerActivator_click(e));
        $myFavContainer.find(".layer-deleter").click(e => this.layerDeleter_click(e));
        
    }

    async layerActivator_click(e){ 
        let activator = $(e.currentTarget);
        let layerDiv = activator.parent();
        let layerId = layerDiv.data("layer-id");
        let serializedLayer = this.config.layers.find(l => l.id == layerId);
        if (!serializedLayer) return;
        let layer = GEOOSLayer.deserialize(serializedLayer);
        geoos.getActiveGroup().addLayer(layer);
        window.geoos.openMyPanel();
    }

    async layerDeleter_click(e){
        let activator = $(e.currentTarget);
        let div = activator.parent();
        let layerId = div.data("layer-id");
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea eliminar la Capa?"}, async _ => {
            await window.geoos.deleteFavLayer(layerId);
        });
    }

    applyConfig(onlyShow) {
        if (!onlyShow) window.geoos.user.saveConfig();
    }

}
ZVC.export(FavLayers);