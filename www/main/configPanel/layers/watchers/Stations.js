class Stations extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.content.hide();
        //this.refresh();
    }

}
ZVC.export(Stations)