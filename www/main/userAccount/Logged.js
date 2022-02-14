class Logged extends ZCustomController {
    onThis_init(options) {
        this.working.hide();
        this.cmdLogout.hide();
        setTimeout(_ => this.cmdLogout.show(), 500);
        this.refresh();
    }

    refresh() {
        if (!window.geoos.userSession) return;
        this.lblEmail.text = window.geoos.userSession.usuario.email;
        this.lblNombre.text = window.geoos.userSession.usuario.nombre;
        this.lblInstitucion.text = window.geoos.userSession.usuario.institucion;
        if (window.geoos.userSession.usuario.tieneFoto) {
            this.fotoPerfil.view.src = "fotoPerfil/" + window.geoos.userSession.usuario.email;
        } else {
            this.fotoPerfil.view.src = "img/usuario.svg";
        }
    }

    async onCmdLogout_click() {
        try {
            this.working.show();
            this.cmdLogout.hide();
            await zPost("logout.geoos");
            localStorage.removeItem("session");
            window.geoos.logout();
            this.triggerEvent("logout");
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()})
        } finally {
            this.cmdLogout.show();
            this.working.hide();
        }
    }
}
ZVC.export(Logged)