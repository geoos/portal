class Main extends ZCustomController {
    async onThis_init() {        
        await window.geoos.init();
        await this.mainLoader.load("main/Portal");
        document.getElementById("splash").remove();
    }
}
ZVC.export(Main);