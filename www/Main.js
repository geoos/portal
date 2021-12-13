class Main extends ZCustomController {
    async onThis_init() {        
        window.timeZone = moment.tz.guess();
        Highcharts.setOptions({
            lang: {
                thousandsSep: '.',
                decimalPoint: ',',
                months: [
                    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                ],
                shortMonths:["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
                weekdays: [
                    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
                ],
                shortWeekdays:["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"],
                drillUpText:"Volver",
                loading:"Cargando ...",
                noData:"No hay datos"
            },
            time:{
                useUTC:false
            }
        });  
        await window.geoos.init();
        await this.mainLoader.load("main/Portal");
        document.getElementById("splash").remove();
        let groupSpec = this.getParameterByName("group");
        let initialGroup, initialView, toolsStatus;
        if (groupSpec) {
            try {
                let serializedGroup = await zPost("getLinkContent.geoos", {link:groupSpec});
                if (serializedGroup) {
                    initialGroup = GEOOSGroup.deserialize(serializedGroup);
                    window.geoos.addExistingGroup(initialGroup);
                    initialView = serializedGroup.mapView;
                    toolsStatus = serializedGroup.toolsStatus;
                }
            } catch(err) {
                console.error("Group is not correctly serialized", err);
            }
        }
        if (!initialGroup) {
            //agregar grupo inicial
            console.log(" I N I C I A L ");
            initialGroup = window.geoos.addGroup({name:"Grupo Inicial"});

            let layers = await window.geoos.getLayers();
            console.log("layers:", layers);
            let wind = layers.find(element => element.code === "noaa-gfs4.WND_10M");
            let pres = layers.find(element => element.code === "noaa-gfs4.PRMSL");
            console.log("wind", wind);
            window.geoos.addLayer(wind, initialGroup);
            window.geoos.addLayer(pres, initialGroup);

            let s = initialGroup.serialize();
            //agregar a favoritos
            console.log("id", initialGroup.id)
            let found = await window.geoos.user.config.favorites.groups.find(element => element.name==="Grupo Inicial")
            if(!found){
            //if(!window.geoos.isFavorite(initialGroup.id, "group")){
                window.geoos.addFavGroups(s);
            }
        }
        if (initialView) {
            window.geoos.mapPanel.deserialize(initialView);
            if (!toolsStatus || toolsStatus == "min") {
                await (new Promise(resolve => setTimeout(_ => resolve(), 500)));
                await window.geoos.myPanel.toggleAndWait();
                await window.geoos.activateGroup(initialGroup.id)
            } else {
                await window.geoos.activateGroup(initialGroup.id)
                if (toolsStatus) await window.geoos.toolsPanel.toggle(toolsStatus)
            }
        } else {
            await window.geoos.activateGroup(initialGroup.id)
        }
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