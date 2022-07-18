class FavStations extends ZCustomController {
    async onThis_init() {
        this.stations = await window.geoos.getStations();
        window.geoos.events.on("portal", "userConfigChanged", _ => {
            this.refresh();
            this.applyConfig(true);
        });
    }

    get config() {return window.geoos.user.config.favorites}

    refresh() {
        //if (!this.open) return;
        let selection = window.geoos.selection;
        this.filteredStations = window.geoos.user.config.favorites.stations;
        let providers = this.filteredStations.reduce((map, s) => {
            map[s.proveedor] = true;
            return map;
        }, {})
        
        let providersList = Object.keys(providers).reduce((list, p) => {
            let geoosProvider = window.geoos.providers.find(gp => (gp.code == p));
            if (geoosProvider) list.push({code:p, name:geoosProvider.name});
            else list.push({code:p, name:p});
            return list;
        }, []);
        
        let html = ``;
        //muestra los proveedores de las estaciones
        for (let provider of providersList) {
             let {nStationsProvider, nSelected} = this.filteredStations.reduce((map, s) => {
                if (s.proveedor == provider.code) {
                    map.nStationsProvider++;
                    if (window.geoos.isStationAdded(s.code)) map.nSelected++;
                }
                return map;
            }, {nStationsProvider:0, nSelected:0}); 
            html += `
            <div class="add-panel-proveedor" data-code="${provider.code}">
                <i class="far fa-lg float-left mr-2"></i>
                ${provider.name}
            </div>`;
            for (let station of this.filteredStations.filter(s => s.proveedor == provider.code)) {
            //for (let station of window.geoos.favStations) { 
                let stationSelected = selection.type == "station" && selection.element.id == station.id;
                let stationName = station.name;
                html += `  <div class="row"  style="max-width:420px;">`;
                html += `    <div class="col-1 mt-2"><i  class="layer-activator fas fa-star float-left"></i></div>`;
                html += `    <div class="col-9 mt-2"><span ${stationSelected?" class='favorite-selected-name'":""}>${stationName}</span></div>`;
                html += `    <div class="col mt-2" data-station-id="${station.code}">`;
                html += `      <i class=" station-deleter far fa-trash-alt float-right" style="cursor: pointer;"></i>`;
                html += `      <img class="station-activator" style="height: 16px;" src="img/icons/variable-added.svg" />`;
                html += `    </div>`;
                html += `  </div>`;
            }
        }
        //${window.geoos.isStationAdded(station.code)?"fa-check-square":"fa-square"}
        this.myFavContainer.html = html;
        let $myFavContainer = $(this.myFavContainer.view);        

        $myFavContainer.find(".station-activator").click(e => this.stationActivator_click(e));
        $myFavContainer.find(".station-deleter").click(e => this.stationDeleter_click(e));
    }

     async stationActivator_click(e){ 
        let activator = $(e.currentTarget);
        let stationDiv = activator.parent();
        let stationId = stationDiv.data("station-id");
        window.geoos.toggleStation(stationId);
        this.refresh();
        //window.geoos.openMyPanel();
    }

    async stationDeleter_click(e){
        let activator = $(e.currentTarget);
        let div = activator.parent();
        let stationId = div.data("station-id");
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea eliminar la Estación?"}, async _ => {
            window.geoos.deleteFavStation(stationId);
            this.refresh();
        });
    }

    applyConfig(onlyShow) {
        if (!onlyShow) window.geoos.user.saveConfig();
    }
}
ZVC.export(FavStations);
