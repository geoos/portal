class WAudio extends ZDialog {
    onThis_init(options) {
        this.item = options.item;
        let html = `
            <audio
                controls
                src="${this.item.link}">            
            </audio>
        `;
        this.playerContainer.html = html;
        if (this.item.proveedor) {
            html = `
                <a href="${this.item.proveedor.url}" target="_blank" class="m-2">
                    <img src="${this.item.proveedor.logo}" height="150" style="max-width: 410px;" />
                </a>
            `;
            this.providerInfo.html = html;
        }
        let titulo = this.item.name;
        if (this.item.tiempo) {
            let dt = new Date(this.item.tiempo);
            titulo += " [" + dt.toLocaleString() + "]";
        }
        this.title.text = titulo;
        if (this.item.details) {
            this.lblDetails.text = this.item.details;
        } else {
            this.detailsContainer.hide();
        }
    }

    onCmdCloseInfoWindow_click() {this.cancel()}
    onCmdCerrar_click() {this.cancel()}
}
ZVC.export(WAudio);