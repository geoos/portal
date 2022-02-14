class Login extends ZCustomController {
    onThis_init(options) {
        this.working.hide();
        this.cmdLogin.hide();
        setTimeout(_ => {
            this.cmdLogin.show();
            this.edEmail.view.focus();
        }, 300);
        if (options && options.email) this.edEmail.value = options.email;
        if (options && options.pwd) this.edPwd.value = options.pwd;
        $(this.view).find(".mostrador")
            .on("mousedown", e => $(e.currentTarget).parent().parent().children()[0].type = "text")
            .on("mouseup", e => $(e.currentTarget).parent().parent().children()[0].type = "password")
            .on("mouseout", e => $(e.currentTarget).parent().parent().children()[0].type = "password")
    }

    onCmdRegister_click() {
        this.triggerEvent("to_Register", this.edEmail.value);
    }
    onCmdOlvidoPwd_click() {
        this.showDialog("./WOlvidoPwd", {email:this.edEmail.value});
    }
    async onCmdLogin_click() {
        try {
            let email = this.edEmail.value.trim();
            let pwd = this.edPwd.value.trim();
            this.working.show();
            this.cmdLogin.hide();
            let sesion = await zPost("login.geoos", {email, pwd});
            if (this.edRecordarme.checked) {
                localStorage.setItem("session", sesion.token);
            } else {
                localStorage.removeItem("session");
            }
            window.geoos.login(sesion);
            this.triggerEvent("login");
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()})
        } finally {
            this.cmdLogin.show();
            this.working.hide();
        }
    }
}
ZVC.export(Login)