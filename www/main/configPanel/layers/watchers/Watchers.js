class Watchers extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        console.log("layer", layer);
        this.rowWorking.hide();
        this.rowCanceling.hide();
        this.refresh();
    }

    async refresh() {
        let selector = GEOOSQuery.newEmptySelector(">> Observar Nuevas Variables", this.layer.minZDimension, this.layer.name);
        this.rowNew.html = selector.getHTML(true);
        selector.registerListeners(this.rowNew, {
            onSelect:variables => {
                console.log("select variables", variables)
                this.layer.addWatchers(variables.map(v => GEOOSQuery.fromSearchItem(v)));                
                //this.refresh();
                window.geoos.configPanel.refresh({type:"layer", element:this.layer})
            }
        });
        let html = "";
        for (let i=0; i < this.layer.watchers.length; i++) {
            let q = this.layer.watchers[i]
            html += await q.getHTML();
            html += q.getLegendColorHTML();
            if (i < (this.layer.watchers.length - 1)) {
                html += "<hr class='my-1' style='background-color: white;'/>";
            }
        }
        this.cntWatch.html = html;
        for (let q of this.layer.watchers) {
            q.registerListeners(this.cntWatch, {
                onChange:_ => {
                    this.refresh();                    
                    this.layer.refreshWatcher(q.id);
                },
                onColorChange: _ => {
                    q.color = !q.color;
                    if (q.color) {
                        this.layer.watchers.forEach(q => q.color = false);
                        q.color = true;
                    }
                    this.refresh();
                    this.layer.refreshWatchers();
                },
                onLegendChange: _ => {
                    q.legend = !q.legend;
                    this.refresh();
                    this.layer.refreshWatchers();
                }
            })
        }
    }
}
ZVC.export(Watchers)