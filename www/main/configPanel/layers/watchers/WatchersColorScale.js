class WatchersColorScale extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.listener = w => {
            if (w.layer && w.layer.id == this.layer.id) {
                if (this.layer.getColorScale().auto) {
                    this.edMin.value = this.layer.getColorScale().min;
                    this.edMax.value = this.layer.getColorScale().max;
                    this.checkLimits();
                }
            }
        }
        window.geoos.events.on("watcher", "results", this.listener);
        this.edScaleName.setRows(window.geoos.scalesFactory.colorScales, this.layer.getColorScale().name);
        this.edAuto.checked = this.layer.getColorScale().auto;
        this.edClipOutOfRange.checked = this.layer.getColorScale().clipOutOfRange;
        if (this.layer.getColorScale().min !== undefined) this.edMin.value = this.layer.getColorScale().min;
        if (this.layer.getColorScale().max !== undefined) this.edMax.value = this.layer.getColorScale().max;
        this.edUnit.value = this.layer.getColorScale().unit;
        this.edUnit.disable();
        this.checkLimits();
        this.refreshPreview();
    }    

    onThis_deactivated() {
        window.geoos.events.remove(this.listener);
    }

    refreshPreview() {
        this.layer.getColorScale().refreshPreview(this.preview.view);
    }

    onEdScaleName_change() {
        this.layer.updateColorScale(this.edScaleName.value);
        this.refreshPreview();
    }
    onEdAuto_change() {
        this.checkLimits();
        this.layer.getColorScale().auto = this.edAuto.checked;
        this.layer.refreshWatchers();
    }
    onEdClipOutOfRange_change() {
        this.layer.getColorScale().clipOutOfRange = this.edClipOutOfRange.checked;
        this.layer.repaint();
    }
    onEdMin_change() {
        if (this.checkLimits()) {
            this.layer.getColorScale().min = parseFloat(this.edMin.value);
            this.layer.repaint();
        }
    }
    onEdMax_change() {
        if (this.checkLimits()) {
            this.layer.getColorScale().max = parseFloat(this.edMax.value);
            this.layer.repaint();
        }
    }

    checkLimits() {
        let auto = this.edAuto.checked;
        if (auto) {
            this.rowClipOutOfRange.hide();
            this.edMin.disable();
            this.edMax.disable();
        } else {
            this.rowClipOutOfRange.show();
            this.edMin.enable();
            this.edMax.enable();
        }
        let min = parseFloat(this.edMin.value);
        let max = parseFloat(this.edMax.value);
        if (isNaN(min) || isNaN(max) || min >= max) {
            this.edMin.addClass("error");
            this.edMax.addClass("error");
            return false;
        } else {
            this.edMin.removeClass("error");
            this.edMax.removeClass("error");
            return true;
        }
    }
}
ZVC.export(WatchersColorScale);