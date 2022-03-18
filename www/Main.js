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
        //si no existe un grupo inicial por defecto, se crea, y se agrega a favoritos
        if (!initialGroup){
            //agregar grupo inicial
            console.log(" I N I C I A L ");
            initialGroup = window.geoos.addGroup({name:"Grupo Inicial"});
            initialGroup.default = true;

            let layers = await window.geoos.getLayers();
            let wind = layers.find(element => element.code === "noaa-gfs4.WND_10M");
            let pres = layers.find(element => element.code === "noaa-gfs4.PRMSL");
            window.geoos.addLayer(wind, initialGroup);
            window.geoos.addLayer(pres, initialGroup);

            let s = initialGroup.serialize();
        }
        let defaultGroup = window.geoos.getDefault(); 
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
        }else{
            if (!defaultGroup){
                await window.geoos.activateGroup(initialGroup.id);
                console.log("[DG] no hay inicial");
                let s = initialGroup.serialize();
                await window.geoos.addDefault(s);
                await window.geoos.addFavGroups(s);
            
            }else {
                console.log("[DG] hay inicial", defaultGroup);
                if(!window.geoos.isDefault(initialGroup)){ 

/*                     let s = defaultGroup.serialize();
                    s.id = generateId();
                    // Regenerar id de las capas
                    s.layers.forEach(layer => {
                        layer.id = generateId();
                    })
                    let newGroup = GEOOSGroup.deserialize(s);
                    //newGroup.active = false;
                    console.log("newGroup", newGroup);
                    await window.geoos.addExistingGroup(newGroup);
                    await window.geoos.activateGroup(newGroup.id); */


                    //se agrega a Mi panel el nuevo grupo
                    let newGroup = await window.geoos.addGroup(defaultGroup.config);
                    //let group = await window.geoos.addExistingGroup(defaultGroup);
                    //let newGroup = GEOOSGroup.deserialize(group);
                    console.log("newGroup", newGroup);
                     let allLayers = await window.geoos.getLayers();
                    //for (let layer of defaultGroup.layers){
                    for (let i = defaultGroup.layers.length-1; i>=0; i--){
                        let layer = defaultGroup.layers[i];
                        if (layer instanceof GEOOSRasterLayer){
                            let code =  layer.config.dataSet.code + "." + layer.config.variable.code;
                            //console.log("lay", code, layer);
                            let newLayer = allLayers.find(element => element.code === code);
                            window.geoos.addLayer(newLayer, newGroup);
                        }else if (layer instanceof GEOOSStationsLayer){
                            for(let i of layer.points){
                                await window.geoos.addStation(i.id, newGroup);
                            }
                        }
                    }
                    await window.geoos.activateGroup(newGroup.id);
                    await window.geoos.deleteGroup(initialGroup.id);
                    await window.geoos.myPanel.refresh();
                }
            }
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