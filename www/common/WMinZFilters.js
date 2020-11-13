class WFiltrosMinZ extends ZDialog {
    onThis_init(options) {
        this.caret.hide();
        this.consulta = GEOOSQuery.cloneQuery(options.consulta);
        this.consulta.construyeDescripcionFiltros()
            .then(_ => {
                this.arbol = this.consulta.getArbolFiltros();
                this.cellWidth = 155; this.cellHeight = 72;
                this.rectWidth = 115; this.rectHeight = 56;
                let w = (this.arbol.max.x + 1) * this.cellWidth,
                    h = (this.arbol.max.y + 1) * this.cellHeight;
                this.stage.size = {width:w, height:h};
                this.konvaStage = new Konva.Stage({
                    container:this.stage.view,
                    width:w, height:h
                })
                this.konvaLayer = new Konva.Layer();
                this.konvaStage.add(this.konvaLayer);
                this.refresca()
            })
    }

    refresca() {
        this.konvaLayer.destroyChildren();
        let x = this.cellWidth / 2;
        let y = this.cellHeight / 2;
        let roundedRect = new Konva.Rect({
            x:x - this.rectWidth / 2, y:y - this.rectHeight / 2, width:this.rectWidth, height:this.rectHeight,
            fill: '#5569cf',
            stroke: '#000000',
            strokeWidth: 1,
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffset: { x: 4, y: 4 },
            shadowOpacity: 0.5,
            cornerRadius:3,
            opacity:1
        });
        this.konvaLayer.add(roundedRect);
        let text = new Konva.Text({
            x: x - this.rectWidth / 2,
            y: y - this.rectHeight / 2,
            width: this.rectWidth,
            height: this.rectHeight,
            fontSize: 14,
            fontFamily: 'Calibri',
            fill:"white",
            padding: 10,
            align:"center",
            verticalAlign:"middle",
            text:this.consulta.variable.name + "\n[" + this.consulta.variable.options.unit + "]"
        })
        this.konvaLayer.add(text);
        this.dibujaNodos(0,0, this.arbol.nodos);
        this.konvaLayer.draw();
    }

    dibujaNodos(parentX, parentY, nodos) {
        for (let i=0; i<nodos.length; i++) {
            let nodo = nodos[i];
            let fillColor = "white";  // Editable, sin filtro
            let textColor = "black";  // Editable, sin filtro
            if (nodo.editable) {
                if (nodo.filtro) {
                    // Filtro Cambiable
                    fillColor = "#f0b375";
                    textColor = "black";
                }
            } else {
                if (nodo.filtro) {
                    // Filtro Fijo
                    fillColor = "#c75f52";
                    textColor = "black";
                } else {
                    // No editable, sin filtro
                    fillColor = "#b8afae";
                    textColor = "black";
                }
            }
            let x = this.cellWidth * nodo.x + this.cellWidth / 2;
            let y = this.cellHeight * nodo.y + this.cellHeight / 2;
            let roundedRect = new Konva.Rect({
                x:x - this.rectWidth / 2, y:y - this.rectHeight / 2, width:this.rectWidth, height:this.rectHeight,
                fill: fillColor,
                stroke: '#000000',
                strokeWidth: 1,
                shadowColor: 'black',
                shadowBlur: 10,
                shadowOffset: { x: 4, y: 4 },
                shadowOpacity: 0.5,
                cornerRadius:3,
                opacity:1
            });
            // Eventos
            if (nodo.editable) {
                roundedRect.on("mouseenter", _ => this.enterNodo(nodo));
                roundedRect.on("mouseleave", _ => this.exitNodo(nodo));
                roundedRect.on("mouseup", _ => this.clickNodo(nodo))
            }
            
            this.konvaLayer.add(roundedRect);
            
            // Titulo
            let titulo = new Konva.Text({
                x: x - this.rectWidth / 2,
                width: this.rectWidth,
                y: y - this.rectHeight / 2,
                height: 30,
                fontSize: 12,
                fontFamily: 'Calibri',
                fill:textColor,
                padding: 10,
                align:"center",
                verticalAlign:"middle",
                text:nodo.clasificador.name,
                listenning:false
            })
            // Eventos
            if (nodo.editable) {
                titulo.on("mouseenter", _ => this.enterNodo(nodo));
                titulo.on("mouseleave", _ => this.exitNodo(nodo));
                titulo.on("mouseup", _ => this.clickNodo(nodo))
            }
            this.konvaLayer.add(titulo);
            // Separador
            let sep = new Konva.Line({
                points:[x - this.rectWidth / 2, y - this.rectHeight / 2 + 30, x + this.rectWidth / 2, y - this.rectHeight / 2 + 30],
                stroke:"black",
                strokeWidth:1.2,
                listenning:false
            })
            this.konvaLayer.add(sep);
            // Contenido
            if (nodo.filtro) {
                console.log("filtro", nodo.filtro, "descripcion", nodo.descripcionFiltro);
                let contenido = new Konva.Text({
                    x: x - this.rectWidth / 2,
                    width: this.rectWidth,
                    y: y - this.rectHeight / 2 + 30,
                    height: this.rectHeight - 30,
                    fontSize: 11,
                    fontFamily: 'Calibri',
                    fill:textColor,
                    padding: 10,
                    align:"center",
                    verticalAlign:"middle",
                    text:nodo.descripcionFiltro.etiquetaValor,
                    listenning:false
                })
                // Eventos
                if (nodo.editable) {
                    contenido.on("mouseenter", _ => this.enterNodo(nodo));
                    contenido.on("mouseleave", _ => this.exitNodo(nodo));
                    contenido.on("mouseup", _ => this.clickNodo(nodo))
                }
                this.konvaLayer.add(contenido);
            }
            // Flecha
            let x0 = parentX * this.cellWidth + this.cellWidth / 2 + this.rectWidth / 2,
                y0 = parentY * this.cellHeight + this.rectHeight / 2,
                x1 = (parentX + 1) * this.cellWidth,
                y1 = y0,
                x2 = x1,
                y2 = nodo.y * this.cellHeight + this.rectHeight / 2,
                x3 = nodo.x * this.cellWidth + this.cellWidth / 2 - this.rectWidth / 2 - 4,
                y3 = y2;
            let arrow = new Konva.Arrow({
                points:[x0,y0, x1,y1, x2,y2, x3,y3],
                pointerLength:10,
                pointerWidth:8,
                fill:"white",
                stroke:"black",
                strokeWidth:2
            });
            this.konvaLayer.add(arrow);

            if (nodo.nodos) this.dibujaNodos(nodo.x, nodo.y, nodo.nodos);
        }
    }

    async clickNodo(nodo) {
        console.log("click", nodo);
        this.enterNodo(nodo);
        try {
            let rows = [];
            let n = await this.consulta.zRepoServer.client.cuentaValores(nodo.clasificador.dimensionCode);
            let dimVal = await this.consulta.zRepoServer.client.getValores(nodo.clasificador.dimensionCode, null, null, 0, (n > 50?50:n));
            rows.push({
                code:"sel-filas",
                icon:"fas fa-list",
                label:"Seleccionar [" + n + "]",
                items:dimVal.map(r => ({
                    tipo:"valor",
                    icon:"fas fa-bullseye",
                    code:r.code,
                    label:"[" + r.code + "] " + r.name
                }))
            });
            if (n > 50) {
                rows[0].items.push({
                    tipo:"warng",
                    icon:"fas fa-exclamation-triangle",
                    code:"warn-more",
                    label:"Muchos valores. Use opción 'Buscar'"
                })
            }
            /*
            rows.push({
                code:"buscar",
                tipo:"buscar",
                icon:"fas fa-search",
                label:"Buscar"
            });
            */
            if (nodo.filtro) {
                rows.push({code:"sep", label:"sep"});
                rows.push({
                    code:"limpiar",
                    tipo:"limpiar",
                    icon:"fas fa-ban",
                    label:"Limpiar Filtro"
                });
            }
            if (this.zpop) this.zpop.close();            
            //let rect = this.stage.view.getBoundingClientRect();
            let rect = this.stageContainer.view.getBoundingClientRect();
            this.zpop = new ZPop(this.caret.view, rows, {
                //container:this.stage.view,
                constainer:this.stageContainer.view,
                vPos:"justify-top", 
                hPos:"right", 
                vMargin:-1, // - rect.y, 
                hMargin:-3, // - rect.x, 
                onClick:(codigo, item) => {
                    if (item.tipo == "valor") {
                        if (nodo.filtro) this.consulta.eliminaFiltro(nodo.filtro);
                        this.consulta.agregaFiltro(nodo.ruta, item.code);
                        this.releeYRefresca();
                    } else if (item.tipo == "limpiar") {
                        this.consulta.eliminaFiltro(nodo.filtro);
                        this.releeYRefresca();
                    }
                },
                searchPlaceholder:"Buscar",
                onSearch:async textFilter => {
                    console.log("text filter", textFilter, nodo);
                    let n = await this.consulta.zRepoServer.client.cuentaValores(nodo.clasificador.dimensionCode, textFilter);
                    console.log("n", n);
                    if (!n) return [{
                        tipo:"warng",
                        icon:"fas fa-exclamation-triangle",
                        code:"warn-none",
                        label:"No se encontraron resultados"
                    }];
                    let dimVal = await this.consulta.zRepoServer.client.getValores(nodo.clasificador.dimensionCode, textFilter, null, 0, (n > 50?50:n));
                    let items = dimVal.map(r => ({
                        tipo:"valor",
                        icon:"fas fa-bullseye",
                        code:r.code,
                        label:"[" + r.code + "] " + r.name
                    }))
                    if (n > 50) {
                        items.push({
                            tipo:"warng",
                            icon:"fas fa-exclamation-triangle",
                            code:"warn-more",
                            label:"Muchos valores. Refine la búsqueda"
                        })
                    }
                    console.log("return items", items);
                    return items;
                }
            });
            this.zpop.show(rows);
        } catch(error) {
            console.error(error);
        }
    }

    releeYRefresca() {
        this.consulta.construyeDescripcionFiltros()
        .then(_ => {
            this.arbol = this.consulta.getArbolFiltros();
            this.refresca();
        })
    }

    enterNodo(nodo) {
        this.stage.view.style.setProperty("cursor", "pointer")
        let x = nodo.x * this.cellWidth + this.cellWidth / 2 + this.rectWidth / 2;
        let y = nodo.y * this.cellHeight + this.cellHeight / 2 - this.rectHeight / 2;
        this.caret.pos = {left:x, top:y}
        this.caret.show();
    }
    exitNodo() {
        this.caret.hide();
        this.stage.view.style.removeProperty("cursor");
    }

    onCmdOk_click() {
        this.close(this.consulta);
    }

    onCmdCancel_click() {this.cancel()}
}
ZVC.export(WFiltrosMinZ);