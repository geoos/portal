class PropToolName extends ZCustomController {
    onThis_init(options) {
        this.tool = options.tool;
        this.edScaleLatLng.value = this.tool.scaleLatLng;
        this.edScaleZ.value = this.tool.scaleZ;
        this.edZScaleFactor.value = this.tool.zScaleFactor;
        if (this.tool.forceScaleLatLng) {
            this.edScaleLatLng.value = true;
            this.rowLatLng.hide();
        }
        this.checkZVisible();
    }

    onEdScaleLatLng_change() {
        this.checkZVisible();
        this.tool.scaleLatLng = this.edScaleLatLng.checked;
    }
    onEdScaleZ_change() {
        this.checkZVisible();
        this.tool.scaleZ = this.edScaleZ.checked;
    }
    onEdZScaleFactor_change() {
        let v = this.edZScaleFactor.value;
        if (!isNaN(v)) this.tool.zScaleFactor = parseFloat(v);
    }

    checkZVisible() {
        if (this.tool.forceScaleLatLng) return;
        if (this.edScaleLatLng.checked && this.tool.variable.unit == "m") {
            this.rowScaleZ.show();
            if (this.edScaleZ.checked) {
                this.rowScaleZFactor.show("flex");
            } else {
                this.rowScaleZFactor.hide();
            }
        } else {
            this.rowScaleZ.hide();
            this.rowScaleZFactor.hide();
        }
    }
}
ZVC.export(PropToolName);