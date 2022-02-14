class CheckBox extends ZCustomController {
    onThis_init() {
        let label = this.view.getAttribute("data-z-label");
        if (label) this.lbl.text = label;
        this._checked = true;
    }

    set value(v) {this.checked = v}
    get value() {return this.checked}
    set checked(c) {
        let i = this.find("i");
        if (c) {            
            i.classList.remove("fa-square");
            i.classList.add("fa-check-square");
            //i.classList.remove("fa-circle");
            //i.classList.add("fa-dot-circle");
            this._checked =true;
        } else {
            i.classList.remove("fa-check-square");
            i.classList.add("fa-square");
            //i.classList.remove("fa-cirlce");
            //i.classList.add("fa-circle");
            this._checked =false;
        }
    }
    get checked() {return this._checked}

    onEdCB_click() {
        this.checked = !this.checked;
        this.triggerEvent("change", this.checked);
    }
}
ZVC.export(CheckBox);