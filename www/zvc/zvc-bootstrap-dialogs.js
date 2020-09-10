ZVC.openDialogInPlatform = dialog => {
    let d = $(dialog.view.firstChild);
    d.modal({
        show:false, keyboard:true, backdrop:"static"
    });
    d.on("hidden.bs.modal", () => {
        if (!dialog._closedFromController) {
            dialog.cancel();            
        }
    });
    d.modal("show");
}
ZVC.closeDialogInPlatform = dialog => {
    let d = $(dialog.view.firstChild);
    d.modal("hide");
}