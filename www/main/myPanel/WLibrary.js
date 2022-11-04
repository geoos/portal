class WLibrary extends ZDialog {
    onThis_init(options) {
        this.edTema.setRows([{code:"", name:"[Todos los Temas]"}].concat(geoos.temasBiblioteca));
        this.refrescar();
    }

    onEdFiltro_change() {this.refrescar()}
    onEdTema_change() {this.refrescar()}
    onEdSoloVerificados_change() {this.refrescar()}

    async refrescar() {
        try {
            let tema = this.edTema.value;
            let filtro = this.edFiltro.value.trim();
            let soloVerificados = this.edSoloVerificados.checked;
            this.itemsContainer.html = `
                <i class="fas fa-spin fa-spinner fa-2x m-4"></i>
            `;
            let capas = await zPost("buscaBiblioteca.geoos", {filtro, tema, soloVerificados});
            let htmlTemas = {};
            for (let capa of capas) {
                for (let t of capa.temas) {
                    let html = htmlTemas[t];
                    if (!html) {
                        html = "<h4 class='mb-2'>" + (geoos.temasBiblioteca.find(b => b.code == t).name) + "</h4>";
                        html += `
                            <div class='mb-3' style='display: grid; grid-template-columns: 162px 162px; grid-gap: 10px;'>
                        `;
                        htmlTemas[t] = html;
                    }
                    html += `
                        <div class='capa-biblio border rounded-lg shadow-lg' style='height: 150px; cursor: pointer;' data-id-capa='${capa._id}' >
                            <img src='fotoBiblio/${capa._id}' width='160px' height='110px' />
                            <div class='border-top' style='font-size:11px; padding-top: 2px;'>
                                <i class='far fa-user-circle float-left ml-1 mr-1' style='margin-top: 2px;'></i>
                                ${capa.nombre}<br />
                                <span class='ml-1'>${capa.autor || "Autor Anónimo"}</span>
                                <i class='img-verificado far fa-check-circle float-right ml-1 mr-1' style='margin-top: 2px; ${capa.verificado?"":"display: none;"}'></i>
                            </div> 
                        </div>
                    `;
                    htmlTemas[t] = html;
                }
            }
            let html = "";
            for (let codigo of Object.keys(htmlTemas)) {
                html += htmlTemas[codigo] + "</div>";
            }
            this.itemsContainer.html = html;
            console.log("divs", $(this.itemsContainer).find(".capa-biblio"));
            $(this.itemsContainer.view).find(".capa-biblio").click(e => {
                $(this.itemsContainer.view).find(".capa-biblio").removeClass("border-info");
                $(e.currentTarget).addClass("border-info");
                let idCapa = $(e.currentTarget).data("id-capa");
                this.refrescaDetalles(idCapa);
            });
            this.msgSeleccion.show();
            this.detalles.hide();
            if (capas.length) {
                this.msgSeleccion.text = "Seleccione una Capa a la izquierda para ver sus detalles";
            } else {
                this.msgSeleccion.text = "No se encontraron capas. Repita la búsqueda";
            }
        } catch (error) {
            console.error(error);
        }
    }

    async refrescaDetalles(idCapa) {
        try {
            this.cmdDelete.hide();
            this.cmdEdit.hide();
            this.adminPanel.hide();
            this.msgSeleccion.html = "<i class='fas fa-spin fa-spinner fa-2x'></i>";
            this.msgSeleccion.show();
            this.detalles.hide();
            this.capa = await zPost("getCapaBiblioteca.geoos", {id:idCapa});
            if (!this.capa) return;
            this.msgSeleccion.hide();
            this.detalles.show();
            this.lblNombreCapa.text = this.capa.nombre;
            this.lblAutor.text = this.capa.autor || "Autor Anónimo";
            this.imgDetalles.view.src = "fotoBiblio/" + this.capa._id;
            this.lblDescripcion.text = this.capa.descripcion;
            if (!this.capa.email) {
                this.lnkMail.hide();
            } else {
                this.lnkMail.show();
                this.lnkMail.view.href = "mailto:" + this.capa.email;
            }
            if (this.capa.esAdmin) {
                this.adminPanel.show();
                this.edVerificado.checked = this.capa.verificado;
                this.cmdEdit.show();
                this.cmdDelete.show();
            }
            if (this.capa.esAutor) {
                this.cmdEdit.show();
                this.cmdDelete.show();
            }
        } catch(error) {
            console.error(error);
        }
    }
    onCmdCloseInfoWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onEdVerificado_change() {
        zPost("alternaCapaBiblioVerificada.geoos", {id:this.capa._id});
        let v = this.edVerificado.checked;
        let idCapa = this.capa._id;
        this.capa.verificado = v;
        $(this.itemsContainer.view).find(".capa-biblio").each(function() {
            let id = $(this).data("id-capa");
            if (id == idCapa) {
                if (v) $(this).find(".img-verificado").show();
                else $(this).find(".img-verificado").hide();
            }
        });
    }
    onCmdAdd_click() {
        let layer = GEOOSLayer.deserialize(JSON.parse(this.capa.capa));
        geoos.getActiveGroup().addLayer(layer);
        window.geoos.openMyPanel();
        geoos.events.trigger("portal", "layerAdded", geoos.getActiveGroup())
        this.close();
    }

    onCmdDelete_click() {
        this.showDialog("common/WConfirm", {message:"¿Está seguro que desea eliminar permanentemente esta capa de la biblioteca?"}, async _ => {
            await zPost("deleteCapaBiblio.geoos", {id:this.capa._id});
            this.refrescar();
        })
    }

    onCmdEdit_click() {
        let layer = GEOOSLayer.deserialize(JSON.parse(this.capa.capa));
        let s = layer.serialize();  
        this.showDialog("./WPublish", {layer:layer, serializedLayer:JSON.stringify(s), editData: this.capa}, res => {
            if (res){
                this.refrescar();
            }
        });
    }
}
ZVC.export(WLibrary);