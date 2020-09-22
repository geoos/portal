class IsolinesProperties extends ZCustomController {
    onThis_init(visualizer) {
        this.visualizer = visualizer;
        this.edAutoIncrement.checked = this.visualizer.autoIncrement;
        this.edIncrement.value = this.visualizer.increment;
        if (this.visualizer.autoIncrement) this.edIncrement.disable();
        else this.edIncrement.enable();
        this.listener = v => {
            if (v.code == this.visualizer.code && v.layer.id == this.visualizer.layer.id && this.visualizer.autoIncrement) {
                this.edIncrement.value = this.visualizer.increment;
            }
        }
        window.geoos.events.on("visualizer", "results", this.listener);
    }    

    onThis_deactivated() {
        window.geoos.events.remove(this.listener);
    }

    onEdAutoIncrement_change() {
        if (this.edAutoIncrement.checked) this.edIncrement.disable();
        else this.edIncrement.enable();
        this.edIncrement.removeClass("error")
        this.visualizer.autoIncrement = this.edAutoIncrement.checked        
    }
    onEdIncrement_change() {
        let v = parseFloat(this.edIncrement.value);
        if (isNaN(v) || v <= 0) {
            this.edIncrement.addClass("error")
            return;
        }
        this.edIncrement.removeClass("error")
        this.visualizer.increment = v
    }
}
ZVC.export(IsolinesProperties);