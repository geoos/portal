class WConfirm extends ZDialog {
    onThis_init(options) {
        if (options.title) this.title.text = options.title;
        if (options.subtitle) this.subtitle.text = options.subtitle;
        if (options.message) this.message.text = options.message;
    }
    onCmdCloseConfirmWindow_click() {this.close()}
}
ZVC.export(WConfirm);