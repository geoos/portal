class TextSearch extends ZCustomController {
    onThis_init() {
        if (this.view.getAttribute("data-z-placeholder")) {
            this.edSearch.view.setAttribute("placeholder", this.view.getAttribute("data-z-placeholder"));
        }
    }
    get value() {return this.edSearch.value}
    set value(txt) {this.edSearch.value = txt}
    onEdSearch_change() {
        let v = this.edSearch.value;
        this.triggerEvent("change", v);
        if (v) {
            this.iconSearch.view.classList.remove("fa-search");
            this.iconSearch.view.classList.add("fa-times");
        } else {
            this.iconSearch.view.classList.remove("fa-times");
            this.iconSearch.view.classList.add("fa-search");
        }
    }
    clear() {
        this.edSearch.value = "";
        this.iconSearch.view.classList.remove("fa-times");
        this.iconSearch.view.classList.add("fa-search");
        this.edSearch.view.focus();
        this.triggerEvent("change", "");
    }
    focus() {this.edSearch.view.focus()}
    onIconSearch_click() {
        if (this.edSearch.value) {
            this.clear();
        }
    }
    addInputClass(cl) {
        this.edSearch.view.classList.add(cl);
    }
}
ZVC.export(TextSearch);