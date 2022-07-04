class Formula extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.refresh();
        this.errorMsg.hide();
    }

    async refresh() {
        this.edFormula.value = this.layer.formula;
        let vars = [{code:"lat", name:"lat"}, {code:"lng", name:"lng"}].concat(this.layer.sources);
        let html = vars.reduce((html, s, idx) => {
            if (html.length) html += ", ";
            html += "<span class='selectable-name' data-code='" + s.code + "'>" + s.code + "</span>";
            if (s.code != "lat" && s.code != "lng") {
                html += ", <span class='selectable-name' data-code='min_" + s.code + "'>min_" + s.code + "</span>";
                html += ", <span class='selectable-name' data-code='max_" + s.code + "'>max_" + s.code + "</span>";
            }

            return html;
        }, "")
        this.variables.html = html;
        $(this.variables.view).find(".selectable-name").click(e => {
            let span = $(e.currentTarget);
            let el = this.edFormula.view;
            const [start, end] = [el.selectionStart, el.selectionEnd];
            el.setRangeText(span.data("code"), start, end, 'select');
        });
    }

    onEdFormula_change() {
        try {
            let st = this.edFormula.value + "\(z)";
            let ev = eval(st);            
            if (!ev || typeof(ev) != "function") throw "No se encontró la función 'z' en el código";
            this.errorMsg.hide();
            this.layer.formula = this.edFormula.value;
            this.layer.refresh();
        } catch(error) {
            this.errorMsg.text = error.toString();
            this.errorMsg.show();
        }
    }
}
ZVC.export(Formula);