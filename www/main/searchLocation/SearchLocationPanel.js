class SearchLocationPanel extends ZCustomController {
    onThis_init() {
        window.geoos.searchLocationPanel = this;
        this.open = false;
        this.hide();
        window.geoos.events.on("top", "clickSearchLocation", _ => this.toggle())
        this.queryCount = 0;
    }

    doResize(size) {
        if (!this.open) return;
        this.applySize();
    }
    applySize() {
        let size = window.geoos.size;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let height = size.height - (topMenuRect.top + topMenuRect.height);
        let width = 352;
        this.searchLocationPanelContainer.view.style.left = "-2px";
        this.searchLocationPanelContainer.view.style.top = (size.height - height - 5) + "px";
        this.searchLocationPanelContainer.view.style.width = width + "px";
        this.searchLocationPanelContainer.view.style.height = height + "px";
        this.cntLocations.view.style.height = (height - 110) + "px";
    }

    toggle() {
        this.searchLocationPanelContent.hide();
        this.applySize();
        if (this.open) {            
            this.searchLocationPanelContainer.view.style["margin-left"] = "-2";
            $(this.searchLocationPanelContainer.view).animate({"margin-left": "-352px"}, 300, _ => {
                this.hide();
                this.open = false;
                window.geoos.topPanel.deactivateOption("opSearchLocation");
            });
        } else {
            window.geoos.closeFloatingPanels();
            this.show();
            this.searchLocationPanelContainer.view.style["margin-left"] = "-302px";
            $(this.searchLocationPanelContainer.view).animate({"margin-left": "-2px"}, 300, _ => {
                this.searchLocationPanelContent.show();
                this.open = true;
                window.geoos.topPanel.activateOption("opSearchLocation");
                this.edLocationFilter.focus();
            });
        }
    }

    onCmdCloseSearchLocationPanel_click() {this.toggle()}

    onEdLocationFilter_change() {
        let filter = this.edLocationFilter.value.trim();
        let center = window.geoos.center;
        if (filter.length < 3) {
            this.cntLocations.html = "";
            return;
        }
        console.log("filter, center", filter, center);
        let currentQuery = ++this.queryCount;
        this.cntLocations.html = "<i class='fas fa-lg fa-spin fa-spinner'></i>";
        zPost("findLocations.geoos", {filter:filter, lat:center.lat, lng:center.lng})
            .then(places => {
                if (currentQuery != this.queryCount) {
                    console.log("abort find places");
                    return;
                }
                this.places = places.results;
                this.refreshPlaces();
            })
            .catch(error => console.error(error));
    }

    refreshPlaces() {
        console.log("places", this.places);
        let html = this.places.reduce((html, p, idx) => {
            html += `<div class='loc-search-result' data-idx='${idx}'>${p.highlightedTitle} [${parseInt(p.distance / 1000)} km]</div>` 
            return html;
        }, "")
        this.cntLocations.html = html;
        $(this.cntLocations.view).find(".loc-search-result").mouseenter(e => {
            let idx = parseInt($(e.target).data("idx"));
            let p = this.places[idx];
            window.geoos.highlights.highlightPoint(p.position[0], p.position[1], 2000);
            window.geoos.map.flyTo([p.position[0], p.position[1]], 10)
        })
        $(this.cntLocations.view).find(".loc-search-result").click(e => {
            let idx = parseInt($(e.target).data("idx"));
            let p = this.places[idx];
            window.geoos.map.flyTo([p.position[0], p.position[1]], 10)
            this.toggle();
            window.geoos.highlights.highlightPoint(p.position[0], p.position[1], 2000);
        })
    }
}
ZVC.export(SearchLocationPanel);