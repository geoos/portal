class FavLayers extends ZCustomController {
    async onThis_init() {
        //this.layers = window.geoos.favLayers;
        this.layers = await window.geoos.getLayers();
        //console.log("todas:", this.layers);
    }

    refresh() {
        //if (!this.open) return;
        let selection = window.geoos.selection;
        let html = ``;
        for (let layer of window.geoos.favLayers) { 
            //let layerSelected = selection.type == "layer" && selection.element.id == layer.id;
            let layerName = layer.name;
            html += `  <div class="row"  style="max-width:420px;">`;
            html += `    <div class="col-1"><i  class="layer-activator fas fa-star mr-2 float-left"></i></div>`;
            html += `    <div class="col-9"><span class="favorite-selected-name"}>${layerName}</span></div>`;
            html += `    <div class="col" data-layer-id="${layer.code}">`;
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
        let variable = this.layers.find(v => v.code == layerId);
        window.geoos.addLayer(variable);
        window.geoos.openMyPanel();
    }

    async layerDeleter_click(e){
        let activator = $(e.currentTarget);
        let layerDiv = activator.parent();
        let layerId = layerDiv.data("layer-id");
        console.log("layerId: ", layerId);
        window.geoos.deleteFavLayers(layerId);
        this.refresh();
    }

}
ZVC.export(FavLayers);