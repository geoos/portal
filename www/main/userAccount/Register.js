let mensajeEnviar = "Se le enviará un código de 6 dígitos para verificar su dirección de correo electrónico.";
let mensajeReenviar = "Espere unos minutos que el código llegue a su correo. Para enviar nuevamente, use el botón de envío. Sólo el último código enviado será válido.";


class Register extends ZCustomController {
    onThis_init(options) {
        this.working.hide();
        this.working2.hide();
        this.codigoEnviado.hide();
        this.codigoInicial.show();
        this.cmdEnviarCodigo.disable();
        if (options && options.email) this.edEmail.value = options.email;
        $(this.view).find(".mostrador")
            .on("mousedown", e => $(e.currentTarget).parent().parent().children()[0].type = "text")
            .on("mouseup", e => $(e.currentTarget).parent().parent().children()[0].type = "password")
            .on("mouseout", e => $(e.currentTarget).parent().parent().children()[0].type = "password")
    }

    emailValido(email) {
        if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) return true;
        return false;
    }

    onEdEmail_change() {
        this.lblMensajeEnviar.text = mensajeEnviar;
        this.codigoEnviado.hide();
        if (this.emailValido(this.edEmail.value.trim())) this.cmdEnviarCodigo.enable();
        else this.cmdEnviarCodigo.disable();
    }
    onCmdLogin_click() {
        let email = this.edEmail.value.trim();
        let pwd = this.edPwd.value.trim();
        this.triggerEvent("to_Login", email);
    }
    async onCmdEnviarCodigo_click() {
        try {
            this.codigoEnviado.hide();
            this.cmdEnviarCodigo.hide();
            this.working.show();
            await zPost("enviaCodigoRegistro.geoos", {email:this.edEmail.value.trim()});
            this.codigoInicial.hide()
            await this.showDialog("./WCode", {email:this.edEmail.value.trim()}, async result =>{
                if(result.status == 1){
                    this.codigoEnviado.hide();
                    this.codigoInicial.show();
                }else if (result.status == 0) {
                    this.codigoEnviado.show();
                    this.codigoInicial.hide();
                    this.codigoRegistro = result.codigoRegistro;
                }
            });
            this.lblMensajeEnviar.text = mensajeReenviar;
        } catch(error) {
            console.error(error);
            this.showDialog("common/WError", {message:error.toString()})
        } finally {
            this.cmdEnviarCodigo.show();
            this.working.hide();
        }
    }
    async onCmdRegistrarse_click() {
        try {
            let nombre = this.edNombre.value.trim();
            if (!nombre || nombre.length < 2) throw "Debe ingresar su nombre";
            let institucion = this.edInstitucion.value.trim();
            let pwd = this.edPwd.value.trim();
            if (!pwd || pwd.length < 4) throw "Debe ingresar una contraseña de 4 caracteres o más."
            let pwd2 = this.edPwd2.value.trim();
            if (pwd != pwd2) throw "La contraseña y su repetición son diferentes";
            let email = this.edEmail.value.trim();
            if (!this.emailValido(email)) throw "E-mail inválido";
            this.cmdRegistrarse.hide();
            this.working2.show();
            await zPost("registraUsuario.geoos", {
                email, codigoRegistro: this.codigoRegistro, nombre, institucion, pwd
            });
            this.cmdRegistrarse.show();
            this.triggerEvent("registrado", {email, pwd});
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()})
            this.codigoEnviado.hide();
            this.codigoInicial.show();
        } finally {
            this.working2.hide();
        }
    }
}
ZVC.export(Register)