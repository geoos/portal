class FormulaResults extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.errorMsg.hide();
        this.working.hide();
        this.startWorkingListener = layer => {
            if (layer.id == this.layer.id) this.startWorking();
        }
        this.stopWorkingListener = layer => {
            if (layer.id == this.layer.id) this.stopWorking();
        }
        window.geoos.events.on("layer", "startWorking", this.startWorkingListener)
        window.geoos.events.on("layer", "finishWorking", this.stopWorkingListener)

        this.refresh();
    }

    onThis_deactivated() {
        window.geoos.events.remove(this.startWorkingListener);
        window.geoos.events.remove(this.stopWorkingListener);
    }

    startWorking() {
        this.working.show();
        this.errorMsg.hide();
        this.results.html = "";
    }
    stopWorking() {
        this.working.hide();
        this.refresh();
    }
    refresh() {
        if (this.layer.dataError) {
            this.errorMsg.text = this.layer.dataError;
            this.errorMsg.show();
            return;
        }
        let html = "<ul>";
        for (let s of this.layer.sources) {
            let m = (this.layer.metadatas || {})[s.code];
            if (m) {
                html += "<li>";
                html += s.code + ": " + s.name;
                html += "<ul>";
                if (m.modelExecution) {
                    html += "<li>Inicio (modelo): " + m.modelExecution.formatted + "</li>";
                }
                if (m.foundTime) {
                    let t = moment.tz(m.foundTime.msUTC, window.timeZone);
                    html += "<li>Valido para: " + t.format("DD/MM/YYYY HH:mm") + "</li>";
                }
                html += "</ul>";
                html += "</li>";
            }
        }
        html += "</ul>";
        this.results.html = html;
    }

}
ZVC.export(FormulaResults);