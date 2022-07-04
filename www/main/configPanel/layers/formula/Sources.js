class Sources extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.refresh();
    }

    async refresh() {
        let html = "";
        for (let i=0; i < this.layer.sources.length; i++) {
            let s = this.layer.sources[i];
            html += `
                <div class='border rounded p-1 mt-2'>
                    <div class="row mt-1">
                        <div class="col-2 mt-1"><i id="delVar${i}" class="fas fa-trash-alt ml-2 float-left mt-1 source-deleter" data-z-clickable="true" data-idx="${i}" style="cursor: pointer;"></i></div>
                        <div class="col-3 mt-2"><label>Código:</label></div>
                        <div class="col-7">
                            <input class="form-control form-control-sm ed-code" data-idx="${i}" value="${s.code}" />
                        </div>
                    </div>
                    <div class="row mt-1">
                        <div class="col pl-4">${s.name}</div>
                    </div>                
            `;
            if (s.variable.levels && s.variable.levels.length) {
                let options = s.variable.levels.reduce((html, l, idx) => {
                    html += "<option value='" + idx + "'";
                    if (idx == s.level) html += " selected";
                    html += ">" + l + "</option>";
                    return html;
                },"")
                html += `
                    <div class="row mt-1 ml-4">
                        <div class="col">
                            <select class="custom-select custom-select-sm level-selector" data-idx="${i}">${options}</select>
                        </div>
                    </div>
                `;
            }
            let timeDesc;
            if (s.time.type == "map") {
                let units = {minutes:"minutos", hours:"horas", days:"días"}
                timeDesc = "Tiempo del Mapa";
                if (s.time.offset) {
                    timeDesc += " " + (s.time.offset > 0?"más ":"menos ") + Math.abs(s.time.offset) + " " + units[s.time.unit];
                }
            } else {
                let m = moment.tz(s.time.ms, window.timeZone);
                timeDesc = "Tiempo Fijo: " + m.format("DD/MM/YYYY HH:mm");
            }
            html += `
                <div class="row mt-1">
                    <div class="col pl-4">
                        <img class="mr-1 float-left" height="16px" src="img/icons/time-layers.png"/>
                        <span id="cmdTime${i}" class="selectable-name time-selector" data-idx="${i}" data-z-clickable="true">${timeDesc}</span>
                        <i class="fas fa-caret-right ml-1 float-right mt-1" ></i>
                    </div>
                </div>
            `;
            html += "</div>";
        }
        this.cntSources.html = html;
        $(this.cntSources.view).find(".source-deleter").click(e => {
            let idx = parseInt($(e.currentTarget).data("idx"));
            this.layer.sources.splice(idx, 1);
            window.geoos.configPanel.refresh({type:"layer", element:this.layer})
            this.layer.refresh();
        })
        $(this.cntSources.view).find(".ed-code").change(e => {
            let idx = parseInt($(e.currentTarget).data("idx"));
            let code = $(e.currentTarget).val();
            this.layer.sources[idx].code = code;
            this.layer.refresh();
        })
        $(this.cntSources.view).find(".level-selector").change(e => {
            let idx = parseInt($(e.currentTarget).data("idx"));
            let level = $(e.currentTarget).val();
            this.layer.sources[idx].level = level;
            this.layer.refresh();
        })
        $(this.cntSources.view).find(".time-selector").click(e => {
            let idx = parseInt($(e.currentTarget).data("idx"));
            let source = this.layer.sources[idx];
            this.showDialog("./WSourceTime", {source}, s => {
                window.geoos.configPanel.refresh({type:"layer", element:this.layer})
            })            
        })
    }

    onCmdNew_click() {
        this.showDialog("common/WSelectVariables", {dimCode:null, layerName:this.layer.name, singleSelection:true}, variables => {
            if (!variables || !variables.length) return;
            let v = variables[0];
            let level = undefined;
            if (v.variable.levels && v.variable.levels.length) {
                level = v.variable.options && v.variable.options.defaultLevel !== undefined?v.variable.options.defaultLevel:0;
            }
            this.layer.sources.push({
                code:v.variable.code, name:v.name,
                geoServer: v.geoServer, dataSet:v.dataSet,
                variable: v.variable,
                level, time:{type:"map", offset:0, unit:"minutes"}
            })
            window.geoos.configPanel.refresh({type:"layer", element:this.layer})
        })
    }
}
ZVC.export(Sources);