class Stations extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.refresh();
    }

    refresh(){
        let html_n = "";
        let html_c = "";
        let html_s = "";
        let html_a = "";

        for(let i of this.layer.points){
            //console.log("estaciones:", i);
            if(i.lat > -33){
                //html_n += `<i class='layer-activator far fa-lg fa-${this.layer.active?"check-square":"square"} mr-2 float-left'></i> <div> ${i.station.name} </div>`;
                html_n += `<div class='mt-2'>${i.station.name} </div>`;
                //html_n += "<i class='layer-activator far fa-lg fa-check-square mr-2 float-left'></i> <div>" +i.station.name+ "</div>";
            }else if(i.lat <= -33 && i.lat > -38){
                html_c += `<div class='mt-2'>${i.station.name} </div>`;
            }else if(i.lat <= -38 && i.lat > -43){
                html_s += `<div class='mt-2'>${i.station.name} </div>`;
            }else{
                html_a += `<div class='mt-2'>${i.station.name} </div>`;
            }
        }
        this.cont_norte.html = html_n;
        this.cont_centro.html = html_c;
        this.cont_sur.html = html_s;
        this.cont_austral.html = html_a;

        //this.content.find(".layer-activator").click(e => this.layerActivator_click(e));
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
}
ZVC.export(Stations)