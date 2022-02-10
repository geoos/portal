class WCode extends ZDialog {
    /* onThis_init(options) {
        //if (options.title) this.title.text = options.title;
        if (options.subtitle) this.subtitle.text = options.subtitle;
        if (options.message) this.message.text = options.message;
        if (options.message2) this.message2.text = options.message2;
    } */
    onThis_init() {

    }

    onCmdCloseCodeWindow_click() {
        window.geoos.userAccountPanel.toggle();
        this.close(0);
    }
    onCmdBackCodeWindow_click() {
        this.close(1);
    }

    onCmdConfirmar_click(){
        let codigoRegistro = this.num_1.value.trim() + this.num_2.value.trim() + this.num_3.value.trim() + this.num_4.value.trim() + 
            this.num_5.value.trim() + this.num_6.value.trim();
        console.log("codigoRegistro: ", codigoRegistro)
        if (codigoRegistro.length < 6) {
            this.cancel()
            throw "El código de registro es inválido";
        }
    }
}
ZVC.export(WCode);