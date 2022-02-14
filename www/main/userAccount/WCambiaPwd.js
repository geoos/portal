class WCambiaPwd extends ZDialog {
    onThis_init(options) {
        $(this.view).find(".mostrador")
            .on("mousedown", e => $(e.currentTarget).parent().parent().children()[0].type = "text")
            .on("mouseup", e => $(e.currentTarget).parent().parent().children()[0].type = "password")
            .on("mouseout", e => $(e.currentTarget).parent().parent().children()[0].type = "password")
    }

    async onCmdOk_click() {
        try {
            let pwd = this.edPwd.value.trim();
            let newPwd = this.edNewPwd.value.trim();
            let newPwd2 = this.edNewPwd2.value.trim();
            if (newPwd != newPwd2) throw "La contraseña y su repetición son diferentes";
            if (newPwd2.length < 4) throw "La contraseña debe tener al menos cuatro caracteres de largo"
            await zPost("cambiaPwd.geoos", {pwd, newPwd});
            this.close();
            this.showDialog("common/WInfo", {message:"Su contraseña ha sido modificada"})
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()})
        }
    }
    onCmdCancel_click() {this.close()}
    onCmdClose_click() {this.close()}    
}
ZVC.export(WCambiaPwd);