class Main extends ZCustomController {
    async onThis_init() {        
        await window.geoos.init();
        await this.mainLoader.load("main/Portal");
        document.getElementById("splash").remove();
        window.geoos.activateGroup(window.geoos.addGroup({name:"Mis Capas"}).id)
    }
}
ZVC.export(Main);