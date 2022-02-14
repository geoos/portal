class ToolColorScaleProperties extends ZCustomController {
    onThis_init(options) {
        this.tool = options.tool;
        this.listener = t => {
            if (t.id == this.tool.id) {
                if (this.tool.colorScale.auto) {
                    this.edMin.value = window.geoos.formatNumber(this.tool.colorScale.min, this.tool.variable.decimals);
                    this.edMax.value = window.geoos.formatNumber(this.tool.colorScale.max, this.tool.variable.decimals);
                    this.checkLimits();
                }
            }
        }
        window.geoos.events.on("tools", "results", this.listener);
        this.edScaleName.setRows(window.geoos.scalesFactory.colorScales, this.tool.colorScaleConfig.name);
        this.edAuto.checked = this.tool.colorScaleConfig.auto;
        this.edClipOutOfRange.checked = this.tool.colorScaleConfig.clipOutOfRange;
        if (this.tool.colorScale.min !== undefined) this.edMin.value = window.geoos.formatNumber(this.tool.colorScale.min, this.tool.variable.decimals);
        if (this.tool.colorScale.max !== undefined) this.edMax.value = window.geoos.formatNumber(this.tool.colorScale.max, this.tool.variable.decimals);
        this.edUnit.value = this.tool.colorScaleConfig.unit;
        this.edUnit.disable();
        this.checkLimits();
        this.refreshPreview();
    }    

    onThis_deactivated() {
        window.geoos.events.remove(this.listener);
    }

    refreshPreview() {
        this.tool.colorScale.refreshPreview(this.preview.view);
    }

    onEdScaleName_change() {
        this.tool.colorScaleConfig.name = this.edScaleName.value;
        this.tool.updateColorScale();
        this.refreshPreview();
    }
    onEdAuto_change() {
        this.checkLimits();
        this.tool.colorScaleConfig.auto = this.edAuto.checked;
        this.tool.updateColorScale();
    }
    onEdClipOutOfRange_change() {
        this.tool.colorScaleConfig.clipOutOfRange = this.edClipOutOfRange.checked;
        this.tool.updateColorScale();
    }
    onEdMin_change() {
        if (this.checkLimits()) {
            this.tool.colorScaleConfig.min = parseFloat(this.edMin.value);
            this.tool.updateColorScale();
        }
    }
    onEdMax_change() {
        if (this.checkLimits()) {
            this.tool.colorScaleConfig.max = parseFloat(this.edMax.value);
            this.tool.updateColorScale();
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
ZVC.export(ToolColorScaleProperties);