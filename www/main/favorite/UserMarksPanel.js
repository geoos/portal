class UserMarksPanel extends ZCustomController {
    async onThis_init() {
        window.geoos.userMarksPanel = this;
        this.open = false;
        this.hide();
        window.geoos.events.on("top", "activateAction", action => {
            if (action == "favo" && !this.open) this.toggle();
        })
        window.geoos.events.on("top", "deactivateAction", action => {
            if (action == "favo" && this.open) this.toggle();
        })
        window.geoos.events.on("portal", "userConfigChanged", _ => {
            this.refresh();
        });
        this.refresh();
    }

    async doResize() {        
        if (!this.open) return;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let top = (topMenuRect.top + topMenuRect.height - 6);
        this.favGroups.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        this.favStations.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        this.favLayers.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
    }

    onCmdCloseFavoPanel_click() {
        window.geoos.topPanel.deactivateAction("favo")
    }
    close() {
        if (this.open) window.geoos.topPanel.deactivateAction("favo")
    }

    toggle() {
        if (!this.open) {
            window.geoos.closeFloatingPanels();
            this.open = true;
            this.doResize();
            this.show();
        } else {
            this.open = false;
            this.hide();
        }
        this.refresh();
    }

    async refresh(){
        if(!window.geoos.user.config.favorites){
            window.geoos.user.config.favorites = {
                layers:[],
                groups:[],
                stations:[]
            };
            window.geoos.user.saveConfig();
        }
        let fav = window.geoos.user.config.favorites;
        if(fav.layers.length>0) {
            //console.log("favo layer", window.geoos.favLayers);
            this.favLayers.refresh();
        }
        if(fav.stations.length>0) {
            //console.log("favo stat", window.geoos.favStations);
            this.favStations.refresh();
        }
        if(fav.groups.length>0) {
            //console.log("favo group", window.geoos.favGroups);
            this.favGroups.refresh();
        }
    }
}
ZVC.export(UserMarksPanel);