class WCode extends ZDialog {
    onThis_init(email) {
        this.email = email;
        setTimeout(_ => {
            $(this.view).find("#num_1").focus();
        }, 300);
        $(this.view).find(".code")
            .on("keyup", e => {
                const currentIndex = parseInt(e.target.id.split("_")[1]);
                if (isNaN(e.key)) {
                    $(this.view).find("#num_" + currentIndex).val(""); 
                } else {
                    if (currentIndex < 6) $(this.view).find("#num_" + (currentIndex+1)).focus();
                }
            })
            .on("keydown", e => {
                const currentIndex = parseInt(e.target.id.split("_")[1]);
                if (e.key.toLowerCase() == "backspace" && $(this.view).find("#num_" + currentIndex).val().length == 0) {
                    if (currentIndex > 1) $(this.view).find("#num_" + (currentIndex-1)).focus();
                }
            })
    }

    onCmdCloseCodeWindow_click() {
        window.geoos.userAccountPanel.toggle();
        this.close({status: 1, codigoRegistro: null});
    }
    onCmdBackCodeWindow_click() {
        this.close({status: 1, codigoRegistro: null});
    }

    async onCmdConfirmar_click(){
        this.codigoRegistro = this.num_1.value.trim() + this.num_2.value.trim() + this.num_3.value.trim() + this.num_4.value.trim() + 
            this.num_5.value.trim() + this.num_6.value.trim();
        if (this.codigoRegistro.length < 6) {
            this.showDialog("common/WError", {message:"Debe ingresar código de registro válido"});
            return;
        }
        zPost("verificaCodigo.geoos", {
            email:this.email.email, codigoRegistro:this.codigoRegistro
        }, _ => {
            this.close({status: 0, codigoRegistro: this.codigoRegistro});
        }, msgError => {
            this.showDialog("common/WError", {message:msgError});
        });
    }
}
ZVC.export(WCode);