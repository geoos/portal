class FavLayers extends ZCustomController {
    async onThis_init() {
        this.layers = window.geoos.favLayers;
        console.log("lay en layers: ",this.layers);
    }

    refresh() {
        console.log("parte 1");
        //if (!this.open) return;
        let selection = window.geoos.selection;
        console.log("parte 2", selection);
        let html = ``;
        for (let layer of window.geoos.favLayers) { 
            let layerSelected = selection.type == "layer" && selection.element.id == layer.id;
            //let layerItems = layer.getItems();
            let layerName = layer.name;
            if (layer.variable && layer.variable.levels && layer.variable.levels.length) {
                layerName += " [" + layer.variable.levels[layer.level] + "]";
            }
            html += `<div class="favorite-layer" data-layer-id="${layer.id}">`;
            html += `  <i  class="layer-activator far fa-lg fa-${layer.active?"dot-circle":"circle"} mr-2 float-left"></i>`;
            html += `  <div class="layer-name"><span ${layerSelected?" class='favorite-selected-name'":""}>${layerName}</span></div>`;
            html += `  <i class="fas fa-spinner fa-spin ml-2 float-right" style="margin-top: -10px; display: none;"></i>`;
            html += `  <i class="user-object-deleter far fa-trash-alt ml-2 float-right" style="cursor: pointer; margin-top:-12px; font-size:12px; margin-right:6px; "></i>`;
           /*  if (layerItems) {
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
            } */
            html += `</div>`;
        }
        html += `  </div>`;
        html += `</div>`;
        this.myFavContainer.html = html;
    }

    

}
ZVC.export(FavLayers);