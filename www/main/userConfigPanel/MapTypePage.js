class MapTypePage extends ZCustomController {
    onThis_init() {
        this.refreshMaps();
        this.edNamesLayer.checked = window.geoos.user.config.mapConfig.namesLayer;
    }

    refreshMaps() {
        let mapConfig = window.geoos.user.config.mapConfig;
        let nCol=0;
        let html = window.geoos.baseMaps.reduce((html, map) => {
            if (!nCol) html += "<tr class='mt-2' style='height: 170px;'>";
            html += "<td class='map-icon text-center" + (mapConfig.selectedMap == map.code?" selected":"") + "' style='vertical-align: top; width:150px; padding-top: 8px;' data-code='" + map.code + "'>";
            html += "    <img src='img/maps/" + map.code + ".png' width='120' height='120'  />";
            html += "    <div class='mt-1'>" + map.name + "</div>";
            html += "</td>";
            nCol++;
            if (nCol == 3) {
                nCol=0;
                html += "</tr>";
            }
            return html;
        }, "");
        if (nCol == 1) html += "<td></td><td></td</tr>"
        if (nCol == 2) html += "<td></td></tr>"
        this.mapsContainer.html = "<table>" + html + "</table>";

        $(this.mapsContainer.view).find(".map-icon").click(e => {
            let code = $(e.currentTarget).data("code");
            window.geoos.mapPanel.resetBaseMap(code);
            this.refreshMaps();
            window.geoos.user.saveConfig();
        });
    }

    onEdNamesLayer_change() {
        window.geoos.mapPanel.resetNamesLayer(this.edNamesLayer.checked);
        window.geoos.user.saveConfig();
    }
}
ZVC.export(MapTypePage)