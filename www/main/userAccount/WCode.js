class WCode extends ZDialog {
    onThis_init(email) {
        this.email = email;
    }

    onCmdCloseCodeWindow_click() {
        window.geoos.userAccountPanel.toggle();
        this.close(0);
    }
    onCmdBackCodeWindow_click() {
        this.close(1);
    }

    async onCmdConfirmar_click(){
        let codigoRegistro = this.num_1.value.trim() + this.num_2.value.trim() + this.num_3.value.trim() + this.num_4.value.trim() + 
            this.num_5.value.trim() + this.num_6.value.trim();
        console.log("codigoRegistro: ", codigoRegistro)
        if (codigoRegistro.length < 6) {
            this.cancel()
            throw "El código de registro es inválido";
        }
        await zPost("verificaCodigo.geoos", {
            email, codigoRegistro
        });

    }
}
ZVC.export(WCode);