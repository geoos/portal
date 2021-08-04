const secondarySteps = {
    "auto":[{value:"-1", name:"No Mostrar"}, {value:"auto", name:"Espaciado Automático"}],
    "10":[{value:"-1", name:"No Mostrar"}, {value:"5", name:"Cada 5 grados"}, {value:"1", name:"Cada 1 grado"}],
    "5":[{value:"-1", name:"No Mostrar"}, {value:"2.5", name:"Cada 2 grados y 30 minutos"}, {value:"1", name:"Cada 1 grado"}, {value:"0.5", name:"Cada 30 minutos"}],
    "1":[{value:"-1", name:"No Mostrar"}, {value:"0.5", name:"Cada 30 minutos"}, {value:"0.25", name:"Cada 15 minutos"}],
    "0.5":[{value:"-1", name:"No Mostrar"}, {value:"0.25", name:"Cada 30 minutos"}]
}

class GridPage extends ZCustomController {
    onThis_init() {
        this.edStep1.setRows([{
            value:"auto", name:"Espaciado Automático"
        }, {
            value:"10", name:"Cada 10 grados"
        }, {
            value:"5", name:"Cada 5 grados"
        }, {
            value:"1", name:"Cada 1 grado"
        }, {
            value:"0.5", name:"Cada 30 minutos"
        }]);
        window.geoos.events.on("portal", "userConfigChanged", _ => {
            this.refresh();
            this.applyConfig(true);
        });
    }
    refresh() {
        this.edShowGrid.checked = this.config.show;
        this.edStep1.value = this.config.step1;
        this.refreshSecondary();

        this.edWidth1.value = this.config.width1;
        this.edColor1.value = this.config.color1;
        this.edWidth2.value = this.config.width2;
        this.edColor2.value = this.config.color2;
        this.checkProps();
    }

    checkProps() {
        if (this.config.show) this.propGrid.show();
        else this.propGrid.hide();
    }

    get config() {return window.geoos.user.config.mapConfig.grid}

    applyConfig(onlyShow) {
        window.geoos.mapPanel.resetGrid();
        if (!onlyShow) window.geoos.user.saveConfig();
    }

    onEdShowGrid_change() {
        this.config.show = this.edShowGrid.checked;
        this.applyConfig();
        this.checkProps();
    }

    onEdStep1_change() {
        this.config.step1 = this.edStep1.value;
        this.applyConfig();
        this.refreshSecondary()
    }
    onEdWidth1_change() {
        this.config.width1 = this.edWidth1.value;
        this.applyConfig();
    }
    onEdColor1_change() {
        this.config.color1 = this.edColor1.value;
        this.applyConfig();
    }
    onEdStep2_change() {
        this.config.step2 = this.edStep2.value;
        this.applyConfig();
    }
    onEdWidth2_change() {
        this.config.width2 = this.edWidth2.value;
        this.applyConfig();
    }
    onEdColor2_change() {
        this.config.color2 = this.edColor2.value;
        this.applyConfig();
    }

    refreshSecondary() {
        this.edStep2.setRows(secondarySteps[this.edStep1.value], this.config.step2)
    }
}
ZVC.export(GridPage)