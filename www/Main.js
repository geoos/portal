class Main extends ZCustomController {
    async onThis_init() {       
        window.ffmpegWorker = new Worker('js/ffmpeg-worker-mp4.js') 
        console.log("cargado ffmpeg worker");
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
        } else {
            // Si no existe un grupo inicial, se crea
            // Initial será undefined sólo la primera vez. Luego se asignará null (si se elimina el inicial)
            let userConfig = window.geoos.user.config;
            if (!userConfig.favorites) userConfig.favorites = {layers:[], groups:[], stations:[]};
            if (userConfig.favorites.initialGroup === undefined) {
                let layerCodes = window.geoos.config.defaultGroupLayers;
                if (layerCodes && layerCodes.length) {
                    initialGroup = window.geoos.addGroup({name:"Grupo Inicial"});
                    await window.geoos.activateGroup(initialGroup.id);
                    let layers = await window.geoos.getLayers();
                    let added = false;
                    for (let code of layerCodes) {
                        let layer = layers.find(e => e.code == code);
                        if (layer) {
                            await window.geoos.addLayer(layer, initialGroup);
                            console.log("agregó capa", code, initialGroup);
                            added = true;
                        }
                    }
                    if (added) {
                        userConfig.favorites.initialGroup = initialGroup.id;
                        userConfig.favorites.groups.push(initialGroup.serialize());
                        window.geoos.user.saveConfig();
                    }
                } else {
                    console.error("No hay layer codes");
                    console.log(window.geoos.config);
                    initialGroup = window.geoos.addGroup({name:"Mis Capas"});
                    await window.geoos.activateGroup(initialGroup.id);
                }
            } else if (userConfig.favorites.initialGroup) {
                let serializedGroup = userConfig.favorites.groups.find(g => g.id == userConfig.favorites.initialGroup);
                if (serializedGroup) {
                    initialGroup = GEOOSGroup.deserialize(serializedGroup);
                    initialGroup.regenerateIds();
                    window.geoos.addExistingGroup(initialGroup);
                    await window.geoos.activateGroup(initialGroup.id);
                    initialView = serializedGroup.mapView;
                    toolsStatus = serializedGroup.toolsStatus;
                }
            } else {
                // null
                initialGroup = window.geoos.addGroup({name:"Mis Capas"});
                await window.geoos.activateGroup(initialGroup.id);
            }
        }

        if (initialView) window.geoos.mapPanel.deserialize(initialView);
        if (!toolsStatus || toolsStatus == "min") {
            await (new Promise(resolve => setTimeout(_ => resolve(), 500)));
            await window.geoos.myPanel.toggleAndWait();
            await window.geoos.activateGroup(initialGroup.id)
        } else {
            await window.geoos.activateGroup(initialGroup.id)
            if (toolsStatus) await window.geoos.toolsPanel.toggle(toolsStatus)
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