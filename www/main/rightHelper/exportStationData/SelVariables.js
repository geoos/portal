class SelVariables extends ZCustomController {
    onThis_init(options) {
        this.options = options;
        let s = this.options.station;
        let z = s.server.client;
        // Resetear variables si cambió selección de origen
        if (this.options.variablesDesdeDSOriginal != this.options.dsOriginal) this.options.variables = {}; 
        this.options.variablesDesdeDSOriginal = this.options.dsOriginal;
        if (this.options.dsOriginal) {
            // Buscar dataSet (rie.${proveedor})
            let dsName = "rie." + this.options.station.proveedor;
            if (dsName == "rie.redema") dsName = "rie.datosRecientesEMA";
            this.options.dataSet = z.dataSets.find(d => d.code == dsName);
            if (!this.options.dataSet) throw "No se encontró el dataSet '" + dsName + "' en zRepo"
            // buscar columna con codigoEstacion desde los triggers
            this.options.colCodigoEstacion = null;
            this.options.dataSet.triggers.forEach(t => {
                if (!this.options.colCodigoEstacion) {
                    if (t.data) {
                        t.data.forEach(d => {
                            if (d.to == "estacion") this.options.colCodigoEstacion = d.from;
                        })
                    }
                }
            })
            // Agregar variables
            this.options.listaVariables = [];
            this.options.dataSet.columns.forEach(col => {
                if (col.code != this.options.colCodigoEstacion) {
                    this.options.listaVariables.push({code:col.code, name:col.name});
                    if (this.options.variables[col.code] === undefined) this.options.variables[col.code] = true;
                }
            })
        } else {
            this.options.listaVariables = [];
            this.options.station.variables.forEach(code => {
                let v = z.variables.find(v => v.code == code);
                if (v) {
                    this.options.listaVariables.push({code:code, name:v.name, options:v.options});
                    if (this.options.variables[code + "-avg"] === undefined) this.options.variables[code + "-avg"] = true;
                    if (this.options.variables[code + "-min"] === undefined) this.options.variables[code + "-min"] = false;
                    if (this.options.variables[code + "-max"] === undefined) this.options.variables[code + "-max"] = false;
                    if (this.options.variables[code + "-n"] === undefined) this.options.variables[code + "-n"] = false;
                } else {
                    console.error("No se encontró la variable " + code);
                }                    
            })
        }
        this.refresh();
    }

    checkNextEnabled() {
        let n = Object.keys(this.options.variables).reduce((s, v) => {
            return s + (this.options.variables[v]?1:0)
        }, 0)
        if (n) this.triggerEvent("enableNext");
        else this.triggerEvent("disableNext");
        
    }
    refresh() {
        let html = "<ul style='list-style-type: none;'>";
        if (this.options.dsOriginal) {  
            this.options.listaVariables.forEach(v => {
                html += `
                    <li data-code='${v.code}' class='var-selector wizard-radio mt-1'>
                        <i class='far ${this.options.variables[v.code]?"fa-check-square":"fa-square"}'></i>
                        ${v.name}
                    </li>
                `; 
            })
        } else {
            this.options.listaVariables.forEach(v => {
                html += `
                    <li>
                        ${v.name}
                        <ul>
                            <li data-code='${v.code}-avg' class='var-selector wizard-radio mt-1'>
                                <i class='far ${this.options.variables[v.code + "-avg"]?"fa-check-square":"fa-square"}'></i>
                                Valor Promedio del Grupo
                            </li>
                            <li data-code='${v.code}-min' class='var-selector wizard-radio mt-1'>
                                <i class='far ${this.options.variables[v.code + "-min"]?"fa-check-square":"fa-square"}'></i>
                                Valor Mínimo en el Grupo
                            </li>
                            <li data-code='${v.code}-max' class='var-selector wizard-radio mt-1'>
                                <i class='far ${this.options.variables[v.code + "-max"]?"fa-check-square":"fa-square"}'></i>
                                Valor Máximo en el Grupo
                            </li>
                            <li data-code='${v.code}-n' class='var-selector wizard-radio mt-1'>
                                <i class='far ${this.options.variables[v.code + "-n"]?"fa-check-square":"fa-square"}'></i>
                                N° Muestras en el Grupo
                            </li>
                        </ul>
                    </li>
                `; 
            })
        }
        html += "</hl>"
        this.cntVars.html = html;
        this.checkNextEnabled();
        $(this.cntVars.view).find(".var-selector").click(e => {
            let code = $(e.currentTarget).data("code");
            this.options.variables[code] = !this.options.variables[code];
            this.refresh();
        })
    }
}
ZVC.export(SelVariables);