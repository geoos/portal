class DataSource extends ZCustomController {
    onThis_init(options) {
        this.options = options;
        if (options.dsOriginal === undefined) options.dsOriginal = false;
        if (options.dsOriginal) this.seleccionaOriginal();
        else this.seleccionaAcumulados();

    }
    onEdOriginal_click() {this.seleccionaOriginal();}
    onEdAcumulados_click() {this.seleccionaAcumulados();}

    seleccionaOriginal() {
        $(this.edAcumulados.find("I")).removeClass("fa-dot-circle").addClass("fa-circle");
        $(this.edOriginal.find("I")).removeClass("fa-circle").addClass("fa-dot-circle");
        this.options.dsOriginal = true;
    }
    seleccionaAcumulados() {
        $(this.edOriginal.find("I")).removeClass("fa-dot-circle").addClass("fa-circle");
        $(this.edAcumulados.find("I")).removeClass("fa-circle").addClass("fa-dot-circle");
        this.options.dsOriginal = false;
    }
}
ZVC.export(DataSource);