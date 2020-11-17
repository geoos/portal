class Watchers extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.rowCanceling.hide();
        this.progressListener = w => {
            if (w.layer && w.layer.id == this.layer.id) {
                w.updateProgress(this.cntWatch);
            }
        }
        window.geoos.events.on("watcher", "progress", this.progressListener);
        this.refresh();
    }

    onThis_deactivated() {
        window.geoos.events.remove(this.progressListener);
    }

    async refresh() {
        let selector = GEOOSQuery.newEmptySelector(">> Observar Nuevas Variables", this.layer.minZDimension, this.layer.name);
        this.rowNew.html = selector.getHTML(true);
        selector.registerListeners(this.rowNew, {
            onSelect:variables => {
                this.layer.addWatchers(variables.map(v => GEOOSQuery.fromSearchItem(v)));                
                window.geoos.configPanel.refresh({type:"layer", element:this.layer})
            }
        });
        let html = "";
        for (let i=0; i < this.layer.watchers.length; i++) {
            let q = this.layer.watchers[i]
            html += "<div class='border rounded p-1 mt-2'>";
            html += await q.getHTML();
            html += q.getLegendColorHTML();
            html += q.getProgressHTML();
            html += "</div>";
            /*
            if (i < (this.layer.watchers.length - 1)) {
                html += "<hr class='my-1' style='background-color: white;'/>";
            }
            */
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
                    this.layer.precalculateColor();
                    this.layer.repaint();
                    window.geoos.configPanel.refresh({type:"layer", element:this.layer})
                },
                onLegendChange: _ => {
                    q.legend = !q.legend;
                    this.refresh();
                    this.layer.repaint();
                },
                onDelete:w => {
                    this.layer.deleteWatcher(w.id);                    
                    this.layer.repaint();
                    window.geoos.configPanel.refresh({type:"layer", element:this.layer})
                }
            })
        }
    }
}
ZVC.export(Watchers)