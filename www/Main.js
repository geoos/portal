class Main extends ZCustomController {
    async onThis_init() {        
        window.timeZone = moment.tz.guess();
        await window.geoos.init();
        await this.mainLoader.load("main/Portal");
        document.getElementById("splash").remove();
        let groupSpec = this.getParameterByName("group");
        let initialGroup, initialView;
        if (groupSpec) {
            try {
                let jsonSpec = atob(groupSpec);
                let serializedGroup = JSON.parse(jsonSpec);
                initialGroup = GEOOSGroup.deserialize(serializedGroup);
                window.geoos.addExistingGroup(initialGroup);
                initialView = serializedGroup.mapView;
            } catch(err) {
                console.error("Group is not correctly serialized", err);
            }
        }
        if (!initialGroup) initialGroup = window.geoos.addGroup({name:"Mis Capas"});
        if (initialView) {
            window.geoos.mapPanel.deserialize(initialView);
            await (new Promise(resolve => setTimeout(_ => resolve(), 500)));
            await window.geoos.myPanel.toggleAndWait();
        }
        await window.geoos.activateGroup(initialGroup.id)
    }

    getParameterByName(name) {
        let url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }
}
ZVC.export(Main);