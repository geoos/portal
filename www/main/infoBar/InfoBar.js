class InfoBar extends ZCustomController {
    onThis_init() {
        window.geoos.infoBarPanel = this;
        this.fullMode = true;
        this.open = true;        
        //this.hide();

        window.geoos.events.on("portal", "groupActivated", _ => this.callRefresh())
        window.geoos.events.on("portal", "layersAdded", _ => this.callRefresh())
        window.geoos.events.on("portal", "layersRemoved", _ => this.callRefresh())
        window.geoos.events.on("portal", "groupDeleted", _ => this.callRefresh())
        window.geoos.events.on("layer", "startWorking", layer => this.callRefresh())
        window.geoos.events.on("layer", "finishWorking", layer => this.callRefresh())
        window.geoos.events.on("layer", "layerItemsChanged", layer => this.callRefresh())
        window.geoos.events.on("portal", "selectionChange", ({oldSelection, newSelection}) => this.callRefresh())
        window.geoos.events.on("layer", "rename", layer => this.callRefresh())
        window.geoos.events.on("layer", "activationChanged", layer => this.callRefresh())
    }
    doResize() {        
        if (!this.open) return;
        if (this.fullMode) {
            let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
            let top = (topMenuRect.top + topMenuRect.height - 6);
            this.infoBarContent.view.style["max-height"] = (window.geoos.size.height - top - 150) + "px";
            this.infoBarContent.view.style.removeProperty("height");
        } else {
            this.infoBarContent.view.style["height"] = "114px";
            this.infoBarContent.view.style.removeProperty("max-height");
        }
    }

    onCmdCloseInfoBar_click() {
        this.toggle();
    }

    toggle() {
        if (!this.open) {
            //window.geoos.closeFloatingPanels();
            this.open = true;
            this.doResize();
            this.show();
        } else {
            this.open = false;
            this.hide();
        }
    }

    callRefresh() {
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(_ => {
            this.refreshTimer = null;
            this.refresh();
        }, 100);
    }
    refresh() {
        if (!this.open) return;
        let g = window.geoos.getActiveGroup();
        // Filter
        this.filteredLayers = g.layers.reduce((list, layer) => {
            if (layer.active && (layer instanceof GEOOSRasterLayer || layer instanceof GEOOSRasterFormulaLayer)) {                
                let activeVisualizers = layer.visualizers.filter(v => v.active && v.getColorScale() && !(v.getColorScale() instanceof RGBDecoderScale) && !(v.getColorScale() instanceof RGBADecoderScale));
                if (activeVisualizers && activeVisualizers.length) {
                    list.push({layer, activeVisualizers});
                }
            }
            return list;
        }, []);
        let layersToDraw = this.filteredLayers, found = false;
        let canPrior = false, canNext = false;
        if (!this.fullMode) {
            let layerIndex = this.filteredLayers.findIndex(l => l.layer.id == this.selectedLayer);
            if (layerIndex >= 0) {
                let visualizerIndex = this.filteredLayers[layerIndex].activeVisualizers.findIndex(v => v.code == this.selectedVisualizer);
                if (visualizerIndex >= 0) {
                    layersToDraw = [{layer:this.filteredLayers[layerIndex].layer, activeVisualizers:[]}]
                    layersToDraw[0].activeVisualizers.push(this.filteredLayers[layerIndex].activeVisualizers[visualizerIndex]);
                    found = true;
                    this.layerIndex = layerIndex;
                    this.visualizerIndex = visualizerIndex;
                }
            }
            if (!found) {
                this.selectedLayer = this.filteredLayers[0].layer.id;
                this.selectedVisualizer = this.filteredLayers[0].activeVisualizers[0].code;
                layersToDraw = [{layer:this.filteredLayers[0].layer, activeVisualizers:[]}]
                layersToDraw[0].activeVisualizers.push(this.filteredLayers[0].activeVisualizers[0]);
                this.layerIndex = this.visualizerIndex = 0;
            }
            if (this.layerIndex > 0) {
                canPrior = true;            
            } else if (this.visualizerIndex > 0) canPrior = true;
            if (this.layerIndex < (this.filteredLayers.length - 1)) {
                canNext = true;
            } else {
                let vis = this.filteredLayers[this.layerIndex].activeVisualizers;
                if (this.visualizerIndex < (vis.length - 1)) canNext = true;
            }
            }
        this.scales = [], this.layers = [], this.visualizers = [];
        let html = "";
        
        if (!this.fullMode) {
            html += `
                <table style="width: 100%">
                    <tr>
                        <td id="cmdPriorScale" style="width: 30px; ${canPrior?"cursor: pointer;":"color: gray;"}"><i class="fas fa-chevron-left fa-2x"></i></td>
                        <td style="padding-right: 2px;">
            `;
        }
        for (let layerRow of layersToDraw) {
            let layer = layerRow.layer;
            let layerAdded = false;
            for (let v of layerRow.activeVisualizers) {
                let scale = v.getColorScale();
                if (!layerAdded) {
                    html += `
                        <div class="ib-layer-name ${this.scales.length?"mt-3":""}">${layer.name}</div>
                    `;
                    layerAdded = true;
                }
                html += `
                    <div class="ib-visualizer-container">
                        <div class="ib-visualizer-name">${v.name}</div>
                        <div class="row">
                            <div class="col-11">
                                <div class="ib-scale" data-scale-idx="${this.scales.length}"></div>
                            </div>
                            <div class="col-1">
                                <i class="fas fa-lg fa-palette ib-scale-config" style="cursor: pointer; margin-top: 5px; margin-left: -20px;" data-scale-idx="${this.scales.length}"></i>
                            </div>
                        </div>                            
                        <div class="row mt-2">
                            <div class="col-4">
                                <input class="ib-text form-control form-control-sm text-left" disabled value="${this.format(scale.min, layer)}${scale.hasLabels?": " + scale.minLabel:""}" />
                            </div>
                            <div class="col-4">
                                <input class="ib-center-text form-control form-control-sm text-center" disabled value="${this.getUnit(layer)}" data-scale-idx="${this.scales.length}" />
                            </div>
                            <div class="col-4">
                                <input class="ib-text form-control form-control-sm text-right" disabled  value="${this.format(scale.max, layer)}${scale.hasLabels?": " + scale.maxLabel:""}" />
                            </div>
                        </div>
                    </div>
                `;
                this.scales.push(scale);
                this.layers.push(layer);
                this.visualizers.push(v);                
            }
        }
        if (!this.fullMode) {
            html += `
                        </td>
                        <td id="cmdNextScale" style="width: 30px; ${canNext?"cursor: pointer;":"color: gray;"} text-align: right; "><i class="fas fa-chevron-right fa-2x"></i></td>
                    </tr>
                </table>
            `;
        }

        this.infoBarContent.html = html;
        this.infoBarContent.findAll(".ib-scale").forEach(s => {
            let idx = parseInt(s.getAttribute("data-scale-idx"));
            try {
                this.scales[idx].refreshPreview(s);
            } catch(error) {
                console.log("escala", this.scales[idx]);
                console.error(error);
            }
            let centerText = this.infoBarContent.find(".ib-center-text[data-scale-idx='" + idx + "']");
            s.addEventListener("mouseleave", e => {
                centerText.value = this.getUnit(this.layers[idx]);
            })
            s.addEventListener("mousemove", e => {
                let scale = this.scales[idx];
                let x = e.offsetX; 
                if (x < 0) x = 0;
                let w = s.clientWidth;
                let v = scale.min + x / w * (scale.max - scale.min);
                if (scale.hasLabels) {
                    centerText.value = this.format(v, this.layers[idx]) + ": " + scale.getLabel(v);
                } else {
                    centerText.value = this.format(v, this.layers[idx]);
                }
            })
        });
        this.infoBarContent.findAll(".ib-scale-config").forEach(i => {
            i.addEventListener("click", _ => {
                let idx = parseInt(i.getAttribute("data-scale-idx"));
                window.geoos.myPanel.selectScaleConfig(this.layers[idx], this.visualizers[idx])
            });
        });
        if (!this.fullMode) {
            this.infoBarContent.find("#cmdPriorScale").addEventListener("click", _ => {
                if (!canPrior) return;
                if (this.visualizerIndex > 0) this.visualizerIndex--;
                else this.layerIndex--;
                this.selectedLayer = this.filteredLayers[this.layerIndex].layer.id;
                this.selectedVisualizer = this.filteredLayers[this.layerIndex].activeVisualizers[this.visualizerIndex].code;
                this.refresh();
            });
            this.infoBarContent.find("#cmdNextScale").addEventListener("click", _ => {
                if (!canNext) return;
                let vis = this.filteredLayers[this.layerIndex].activeVisualizers;
                if (this.visualizerIndex < (vis.length - 1)) this.visualizerIndex++;
                else this.layerIndex++;
                this.selectedLayer = this.filteredLayers[this.layerIndex].layer.id;
                this.selectedVisualizer = this.filteredLayers[this.layerIndex].activeVisualizers[this.visualizerIndex].code;
                this.refresh();
            });
        }
    }

    format(n, layer) {
        /*
        let dec = (layer.variable.options && layer.variable.options.decimals !== undefined?layer.variable.options.decimals:2);
        return window.geoos.formatNumber(n, dec);
        */
        return  layer.formatValue(n);
    }
    getUnit(layer) {
        if (layer instanceof GEOOSRasterFormulaLayer) return layer.unit || "S/U";
        return layer.variable.unit || "S/U";
    }
    onCmdToggleMode_click() {
        if (this.fullMode) {
            this.fullMode = false;
            this.cmdToggleMode.view.classList.remove("fa-compress-alt");
            this.cmdToggleMode.view.classList.add("fa-expand-alt");
        } else {
            this.fullMode = true;
            this.cmdToggleMode.view.classList.remove("fa-expand-alt");
            this.cmdToggleMode.view.classList.add("fa-compress-alt");
        }
        this.doResize();
        this.refresh();
    }
}
ZVC.export(InfoBar);