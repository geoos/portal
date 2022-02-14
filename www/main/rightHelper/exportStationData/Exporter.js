class Exporter extends ZCustomController {
    onThis_init(options) {
        let desc = "Estación: " + options.station.name;
        desc += " [" + window.geoos.estaciones.tipos[options.station.tipo].name + "]";
        desc += " de " + window.geoos.estaciones.proveedores[options.station.proveedor].name;
        this.lblEstacion.text = desc;
        options.dsOriginal = false;
        options.variables = {};
        this.options = options;
        this.gotoStep(1);
    }

    async gotoStep(n) {
        this.cmdNext.enable();
        if (n > 1) this.cmdPrev.show();
        else this.cmdPrev.hide();

        if (n == 1) {            
            await this.exporterLoader.load("./DataSource", this.options);
            $(this.find("#stepsTable")).find("#step2").removeClass("wizard-step-cell-active");
        } else if (n == 2) {
            $(this.find("#stepsTable")).find("#step2").addClass("wizard-step-cell-active");
            $(this.find("#stepsTable")).find("#step3").removeClass("wizard-step-cell-active");
            await this.exporterLoader.load("./SelVariables", this.options);
        } else if (n == 3) {
            $(this.find("#stepsTable")).find("#step3").addClass("wizard-step-cell-active");
            $(this.find("#stepsTable")).find("#step4").removeClass("wizard-step-cell-active");
            this.cmdNext.html = "Continuar";
            await this.exporterLoader.load("./Periodo", this.options);
        } else if (n == 4) {
            $(this.find("#stepsTable")).find("#step4").addClass("wizard-step-cell-active");
            this.cmdNext.html = `
                <i class="fas fa-download mr-2"></i>Descargar
            `;
            await this.exporterLoader.load("./Final", this.options);            
        } else if (n == 5) {
            this.cmdNext.disable();
            this.cmdPrev.disable();
            this.exporterLoader.content.doExport();            
        }
        this.step = n;
    }

    async onCmdNext_click() {
        this.gotoStep(this.step + 1);
    }
    async onCmdPrev_click() {
        await this.gotoStep(this.step - 1);
    }
    onExporterLoader_disableNext() {this.cmdNext.disable()}
    onExporterLoader_enableNext() {this.cmdNext.enable()}
    onExporterLoader_finish() {
        window.geoos.rightHelper.close();
    }
}
ZVC.export(Exporter);