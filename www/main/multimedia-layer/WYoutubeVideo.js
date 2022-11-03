class WYoutubeVideo extends ZDialog {
    onThis_init(options) {
        this.item = options.item;
        let fullURL = this.item.link.indexOf("?") > 0?this.item.link + "&autoplay=1&fs=1&iv_load_policy=1&showinfo=1&rel=0&cc_load_policy=0&start=0&end=0":this.item.link + "?autoplay=1&fs=1&iv_load_policy=1&showinfo=1&rel=0&cc_load_policy=0&start=0&end=0"
        console.log("fullURL", fullURL);
        let html = `
            <iframe frameborder="0" scrolling="no" marginheight="0" marginwidth="0"width="640" height="480" type="text/html" 
                src="${fullURL}"
            </iframe>
        `;
        this.frameContainer.html = html;
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
    onCmdFull_click() {
        window.open(this.item.link, "_blank");
    }
}
ZVC.export(WYoutubeVideo);