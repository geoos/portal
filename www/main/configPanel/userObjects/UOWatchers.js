class UOWatchers extends ZCustomController {
    onThis_init(userObject) {
        this.userObject = userObject;
        this.rowCanceling.hide();
        this.progressListener = w => {
            if (w.userObject && w.userObject.id == this.userObject.id) {
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
        let selector = GEOOSQuery.newEmptySelector(">> Observar Nuevas Variables", null, this.userObject.name);
        this.rowNew.html = selector.getHTML(true);
        selector.registerListeners(this.rowNew, {
            onSelect:variables => {
                this.userObject.addWatchers(variables.map(v => GEOOSQuery.fromSearchItem(v)));                
                window.geoos.configPanel.refresh({type:"user-object", element:this.userObject})
            }
        });
        let html = "";
        for (let i=0; i < this.userObject.watchers.length; i++) {
            let q = this.userObject.watchers[i]
            html += "<div class='border rounded p-1 mt-2'>";
            html += await q.getHTML();
            html += "</div>";
        }
        this.cntWatch.html = html;
        for (let q of this.userObject.watchers) {
            q.registerListeners(this.cntWatch, {
                onChange:_ => {
                    this.refresh();                    
                    this.userObject.refreshWatcher(q.id);
                },
                onDelete:w => {
                    this.userObject.deleteWatcher(w.id);                    
                    window.geoos.configPanel.refresh({type:"user-object", element:this.userObject})
                }
            })
        }
    }
}
ZVC.export(UOWatchers)