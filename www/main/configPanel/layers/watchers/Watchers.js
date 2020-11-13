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
                variables.forEach(v => this.layer.watchers.push(GEOOSQuery.fromSearchItem(v)));
                this.refresh();
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
                    console.log("watcher change", q);
                    this.refresh();
                    this.layer.refresh();
                },
                onColorChange: _ => {
                    console.log("Color Change");
                    q.color = !q.color;
                    if (q.color) {
                        this.layer.watchers.forEach(q => q.color = false);
                        q.color = true;
                    }
                    this.refresh();
                    this.layer.refresh();
                },
                onLegendChange: _ => {
                    console.log("Legend Change");
                    q.legend = !q.legend;
                    this.refresh();
                    this.layer.refresh();
                }
            })
        }
    }
}
ZVC.export(Watchers)