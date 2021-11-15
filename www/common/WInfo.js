class WInfo extends ZDialog {
    onThis_init(options) {
        if (options.title) this.title.text = options.title;
        if (options.subtitle) this.subtitle.text = options.subtitle;
        if (options.message) this.message.text = options.message;
        if (options.message2) this.message2.text = options.message2;
    }
    onCmdCloseInfoWindow_click() {this.cancel()}
    onCmdCancel_click() {this.cancel()}
}
ZVC.export(WInfo);