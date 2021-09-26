class Profile extends ZCustomController {
    onThis_init(options) {
        this.working.hide();
        this.cmdSave.hide();
        setTimeout(_ => this.cmdSave.show(), 500);
        this.croppie = null;
        this.dragOverListener = e => {
            e.stopPropagation();
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
        this.dropListener = e => {
            e.stopPropagation();
            e.preventDefault();
            if (!e.dataTransfer.files || !e.dataTransfer.files.length) return;
            let file = e.dataTransfer.files[0];
            let name = file.name.toLowerCase();
            if (!name.endsWith(".png") && !name.endsWith(".jpg") && !name.endsWith(".jpeg")) {
                this.showDialog("common/WError", {message:"La imagen debe ser de tipo PNG o JPG"});
                return;
            }
            let reader = new FileReader();
            reader.onloadend = _ => {
                this.creaCroppie(reader.result);
            }
            reader.readAsDataURL(file);
        }
        this.fotoContainer.view.addEventListener("dragover", this.dragOverListener);
        this.fotoContainer.view.addEventListener("drop", this.dropListener);
    }
    onThis_deactivated() {
        this.fotoContainer.view.removeEventListener("dragover", this.dragOverListener);
        this.fotoContainer.view.removeEventListener("drop", this.dropListener);
    }
    onFotoContainer_click() {
        if (!this.croppie) {
            $(this.edFileInput.view).trigger("click");
        }
    }
    onEdFileInput_change() {
        if (this.edFileInput.view.files && this.edFileInput.view.files.length && this.edFileInput.view.files[0]) {
            let file = this.edFileInput.view.files[0];
            let reader = new FileReader();
            reader.onloadend = _ => {
                this.creaCroppie(reader.result);
            }
            reader.readAsDataURL(file);
        }
    }

    creaCroppie(url) {
        if (this.croppie) this.croppie.destroy();
        this.fotoInicial.hide();
        this.croppie = new Croppie(this.fotoContainer.view, {
            url:url,
            viewport:{width:128, height:128, type:"circle"}
        });
        this.lblHelpFoto.text = "Arrastre una foto hasta la imagen";
        this.eliminaFoto = false;
    }
    refresh() {
        let s = window.geoos.userSession;
        if (!s) return;
        this.edEmail.text = s.usuario.email;
        this.edNombre.value = s.usuario.nombre;
        this.edInstitucion.value = s.usuario.institucion;
        if (s.usuario.tieneFoto) {
            this.fotoInicial.view.src = "fotoPerfil/" + s.usuario.email;
            this.cmdEliminarFoto.show();
        } else {
            this.cmdEliminarFoto.hide();
        }
        this.fotoInicial.show();
        this.eliminaFoto = false;
        this.edFileInput.value = "";
    }

    async onCmdSave_click() {
        try {
            let foto = null;
            if (this.croppie) {
                foto = await this.croppie.result({
                    type:"base64",
                    circle:true
                });
            }
            let nombre = this.edNombre.value.trim();
            if (!nombre || nombre.length < 2) throw "Debe ingresar su nombre";
            let institucion = this.edInstitucion.value.trim();
            this.cmdSave.hide();
            this.working.show();
            let sesion = await zPost("saveDatosUsuario.geoos", {nombre, institucion, foto, eliminaFoto:this.eliminaFoto?true:false});
            window.geoos.saveSesion(sesion);
            if (this.croppie) {
                this.croppie.destroy();
                this.croppie = null;
            }
            this.refresh();
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()})
        } finally {
            this.cmdSave.show();
            this.working.hide();
        }
    }

    onCmdPwd_click() {
        this.showDialog("./WCambiaPwd");
    }
    onCmdEliminarFoto_click() {
        if (this.croppie) {
            this.croppie.destroy();
            this.croppie = null;
        }
        this.eliminaFoto = true;
        this.fotoInicial.view.src = "img/usuario.svg";
        this.fotoInicial.show();
    }
}
ZVC.export(Profile)