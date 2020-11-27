class TimeSerieVars extends ZCustomController {
    async onThis_init(options) {
        console.log("timeSeriesVars", options);
        this.listeners = options.listeners;
        this.analyzer = options.analyzer;
        await this.refresh();
    }

    async refresh() {
        if (!this.analyzer.watcher1) {
            let selector = GEOOSQuery.newEmptySelector("Seleccionar Variable Principal", this.analyzer.layer.minZDimension, this.analyzer.layer.name);
            this.edWatcher1.html = await selector.getHTML(true);
            selector.registerListeners(this.edWatcher1, {
                onSelect:variables => {
                    let q = GEOOSQuery.fromSearchItem(variables[0]);
                    if (q.type == "minz") {
                        q.fixedFilter = {ruta:q.groupingDimension, valor:"${codigo-objeto}"}
                        q.groupingDimension = null;
                    }
                    this.analyzer.watcher1 = q;
                    this.refresh();
                    if (this.listeners.onChange) this.listeners.onChange();
                }
            });
        } else {
            this.edWatcher1.html = await this.analyzer.watcher1.getHTML(true);
            this.analyzer.watcher1.registerListeners(this.edWatcher1, {
                onChange:_ => {
                    this.analyzer.watcher1 = this.analyzer.watcher1; // update serialized config
                    this.refresh();
                    if (this.listeners.onChange) this.listeners.onChange();
                },
                onDelete:w => {
                    this.analyzer.watcher1 = null;
                    this.refresh();
                    if (this.listeners.onChange) this.listeners.onChange();
                }
            })
        }

        if (!this.analyzer.watcher2) {
            let selector = GEOOSQuery.newEmptySelector("Comparar con Variable", this.analyzer.layer.minZDimension, this.analyzer.layer.name);
            this.edWatcher2.html = await selector.getHTML(true);
            selector.registerListeners(this.edWatcher2, {
                onSelect:variables => {
                    let q = GEOOSQuery.fromSearchItem(variables[0]);
                    if (q.type == "minz") {
                        q.fixedFilter = {ruta:q.groupingDimension, valor:"${codigo-objeto}"}
                        q.groupingDimension = null;
                    }
                    this.analyzer.watcher2 = q;
                    this.refresh();
                    if (this.listeners.onChange) this.listeners.onChange();
                }
            });
        } else {
            this.edWatcher2.html = await this.analyzer.watcher2.getHTML(true);
            this.analyzer.watcher2.registerListeners(this.edWatcher2, {
                onChange:_ => {
                    this.analyzer.watcher2 = this.analyzer.watcher2; // update serialized config
                    this.refresh();
                    if (this.listeners.onChange) this.listeners.onChange();
                },
                onDelete:w => {
                    this.analyzer.watcher2 = null;
                    this.refresh();
                    if (this.listeners.onChange) this.listeners.onChange();
                }
            })
        }
    }
}
ZVC.export(TimeSerieVars);