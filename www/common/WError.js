class WConfirm extends ZDialog {
    onThis_init(options) {
        if (options.title) this.title.text = options.title;
        if (options.subtitle) this.subtitle.text = options.subtitle;
        if (options.message) this.message.text = options.message;
    }
    onCmdCloseErrorWindow_click() {this.cancel()}
    onCmdCancel_click() {this.cancel()}
}
ZVC.export(WConfirm);