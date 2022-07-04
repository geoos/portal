class ColorScaleProperties extends ZCustomController {
    onThis_init(visualizer) {
        this.visualizer = visualizer;
        this.listener = v => {
            if (v.code == this.visualizer.code && v.layer.id == this.visualizer.layer.id) {
                if (this.visualizer.colorScale.auto) {
                    this.edMin.value = this.visualizer.layer.formatValue(this.visualizer.colorScale.min);
                    this.edMax.value = this.visualizer.layer.formatValue(this.visualizer.colorScale.max);
                    this.edUnit.value = this.visualizer.colorScaleConfig.unit;
                    this.checkLimits();
                }
            }
        }
        window.geoos.events.on("visualizer", "results", this.listener);
        this.edScaleName.setRows(window.geoos.scalesFactory.colorScales, this.visualizer.colorScaleConfig.name);
        this.edAuto.checked = this.visualizer.colorScaleConfig.auto;
        this.edClipOutOfRange.checked = this.visualizer.colorScaleConfig.clipOutOfRange;
        if (this.visualizer.colorScale.min !== undefined) this.edMin.value = this.visualizer.layer.formatValue(this.visualizer.colorScale.min);
        if (this.visualizer.colorScale.max !== undefined) this.edMax.value = this.visualizer.layer.formatValue(this.visualizer.colorScale.max);
        this.edUnit.value = this.visualizer.colorScaleConfig.unit;
        this.edUnit.disable();
        this.checkLimits();
        this.refreshPreview();
    }    

    onThis_deactivated() {
        window.geoos.events.remove(this.listener);
    }

    refreshPreview() {
        this.visualizer.colorScale.refreshPreview(this.preview.view);
    }

    onEdScaleName_change() {
        this.visualizer.colorScaleConfig.name = this.edScaleName.value;
        this.visualizer.updateColorScale();
        // Dispara evento para refrescar panel de escalas
        window.geoos.events.trigger("layer", "rename", this.visualizer.layer);
        this.refreshPreview();
    }
    onEdAuto_change() {
        this.checkLimits();
        this.visualizer.colorScaleConfig.auto = this.edAuto.checked;
        this.visualizer.startQuery();
    }
    onEdClipOutOfRange_change() {
        this.visualizer.colorScaleConfig.clipOutOfRange = this.edClipOutOfRange.checked;
        this.visualizer.updateColorScale();
        // Dispara evento para refrescar panel de escalas
        window.geoos.events.trigger("layer", "rename", this.visualizer.layer);
    }
    onEdMin_change() {
        if (this.checkLimits()) {
            this.visualizer.colorScaleConfig.min = parseFloat(this.edMin.value);
            this.visualizer.updateColorScale();
            // Dispara evento para refrescar panel de escalas
            window.geoos.events.trigger("layer", "rename", this.visualizer.layer);
        }
    }
    onEdMax_change() {
        if (this.checkLimits()) {
            this.visualizer.colorScaleConfig.max = parseFloat(this.edMax.value);
            this.visualizer.updateColorScale();
            // Dispara evento para refrescar panel de escalas
            window.geoos.events.trigger("layer", "rename", this.visualizer.layer);
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
ZVC.export(ColorScaleProperties);