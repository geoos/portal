class WPublish extends ZDialog {
    onThis_init(options) {
        this.layer = options.layer;
        this.isEdit = !!options.editData;
        if (!this.isEdit){
            this.edName.value = this.layer.name;
            let html = geoos.temasBiblioteca.reduce((html, t) => {
                html += `
                    <div class='mt-2'>
                        <input id='edTema_${t.code}' type='checkbox' data-code='${t.code}' class='tema-toggler float-left mr-2' />
                        ${t.name}
                    </div>
                `;
                return html;
            }, "")
            this.temasContainer.html = html;
            this.croppie = null;
        }else{
            this._id = options.editData._id;
            this._isVerified = options.editData.verificado;
            this.edName.value = options.editData.nombre;
            let html = geoos.temasBiblioteca.reduce((html, t) => {
                let isChecked = options.editData.temas && options.editData.temas.find(tm => tm == t.code);
                html += `
                    <div class='mt-2'>
                        <input id='edTema_${t.code}' type='checkbox' data-code='${t.code}' class='tema-toggler float-left mr-2' ${isChecked?'checked':''} />
                        ${t.name}
                    </div>
                `;
                return html;
            }, "")
            this.temasContainer.html = html;
            this.edDescripcion.value = options.editData.descripcion;
            this.edContactarme.checked = options.editData.contactar;
            $(this.view).find("#title").html("Editar Publicación en Biblioteca");
            $(this.view).find("#cmdOk").text("Actualizar");
            fetch(`fotoBiblio/${this._id}`)
                .then(response => response.blob())
                .then(imageBlob => {
                    let readerLoad = new FileReader();
                    readerLoad.onloadend = _ => {
                        this.creaCroppie(readerLoad.result);
                    }
                    readerLoad.readAsDataURL(imageBlob);
                });
            
        }
        
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
            viewport:{width:320, height:220, type:"rectangle"}
        });
    }
    onCmdCloseInfoWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        try {
            let foto = null;
            if (this.croppie) {
                foto = await this.croppie.result({
                    type:"base64",
                    rectangle:true
                });
            } else {
                throw "Debe cargar una imagen que represente la capa que está publicando";
            }
            let nombre = this.edName.value.trim();
            if (!nombre || nombre.length < 2) throw "Debe ingresar un nombre para mostrar";
            let descripcion = this.edDescripcion.value.trim();
            let temas = geoos.temasBiblioteca.reduce((list, t) => {
                let ed = this.find("#edTema_" + t.code);
                if (ed.checked) list.push(t.code);
                return list;
            }, []);
            if (!temas.length) throw "Debe seleccionar al menos un tema o categoría para la capa de desea publicar."
            let contactar = this.edContactarme.checked;
            if (!this.isEdit) await zPost("publicaBiblioteca.geoos", {nombre, descripcion, foto, temas, contactar, capa:JSON.stringify(this.layer.serialize())});
            else await zPost("saveBibliotecPublicada.geoos", {id: this._id, nombre, descripcion, foto, temas, contactar, verificado: this._isVerified, capa:JSON.stringify(this.layer.serialize())});
            if (this.croppie) {
                this.croppie.destroy();
                this.croppie = null;
            }
            this.close(this.isEdit);            
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()})
        }
    }

    base64ToBase64url(input) {
        // Replace non-url compatible chars with base64url standard chars and remove leading =
        return input
          .replace(/\+/g, '_')
          .replace(/\//g, '-')
          .replace(/=+$/g, '');
    }

}
ZVC.export(WPublish);