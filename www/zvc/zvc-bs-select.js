class ZBSSelect extends ZDynamicSelect {
    onThis_init() {
        super.onThis_init();
        $(this.view).selectpicker();
    }
    setRows(rows, selectedId=null) {
        super.setRows(rows, selectedId);
        $(this.view).selectpicker("refresh");
        $(this.view).selectpicker("render");
    }
    setGroups(tree, groupLabelField, groupRowsField, selectedId=null) {
        this.rows = [];
        let opts = ""
        tree.forEach(group => {
            opts += "<optgroup label='" + group[groupLabelField] + "'>";
            group[groupRowsField].forEach(row => {                
                opts += "<option " + (row[this.idField] == selectedId?" selected":"") + " value='" + this.rows.length + "' " + (row._class?" class='" + row._class + "'":"") + ">";
                let lbl = window.toLang?window.toLang(row[this.labelField]):row[this.labelField];
                opts += lbl;
                opts += "</option>";
                this.rows.push(row);
            })
            opts += "</optgroup>";
        });
        this.html = opts;
        $(this.view).selectpicker("refresh");
        $(this.view).selectpicker("render");
    }
}

ZVC.registerComponent("SELECT", e => (e.classList.contains("selectpicker") && e.getAttribute("data-z-id-field") && e.getAttribute("data-z-label-field")), ZBSSelect);