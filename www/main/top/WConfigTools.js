class WConfigTools extends ZDialog {
    onThis_init(options) {
        this.refrescaTool(1, window.geoos.user.config.toolsConfig.tool1)
        this.refrescaTool(2, window.geoos.user.config.toolsConfig.tool2)
        this.refrescaTool(3, window.geoos.user.config.toolsConfig.tool3)

        let html = "", n=0;
        for (let t of GEOOSTool.tools) {
            let toolDef = GEOOSTool.getToolDef(t.code);
            if (!n) html += "<tr>";
            html += "<td class='tool-available-cell' data-code='" + t.code + "'>";
            html += "<img src='" + toolDef.factories.menuIcon + "' class='float-left' style='width:33%;' ";
            for (let prop in (toolDef.factories.menuIconStyles || {})) {
                html += prop + ": " + toolDef.factories.menuIconStyles[prop];
            }
            html += "' />";
            html += "<span>" + toolDef.factories.menuLabel + "</span>";
            html += "</td>";

            n++;
            if (n == 3) {
                n=0; html += "</tr>";
            }
        }
        if (n > 0) {
            for (;n<3;n++) html += "<td style='width: 33%; '></td>";
            html += "</tr>";
        }
        console.log("html", html);
        $(this.find("#availableTools")).html(html);
        $(this.find("#availableTools")).find(".tool-available-cell").draggable({
            containment:"#modalBody", helper:"clone",
            start:(e, _) => this.draggedCode = $(e.currentTarget).data("code")
        })
        $(this.find("#selected1")).droppable({
            hoverClass:"active", 
            drop:(e, ui) => this.dropTool(1)
        });
        $(this.find("#selected2")).droppable({
            hoverClass:"active", 
            drop:(e, ui) => this.dropTool(2)
        });
        $(this.find("#selected3")).droppable({
            hoverClass:"active", 
            drop:(e, ui) => this.dropTool(3)
        });
    }

    refrescaTool(n, code) {
        if (code && !GEOOSTool.getToolDef(code)) code = null;
        let td = $(this.find("#selected" + n));
        if (code) {
            let toolDef = GEOOSTool.getToolDef(code);
            let html = "<img src='" + toolDef.factories.menuIcon + "' class='float-left' style='width:33%; ";
            for (let prop in (toolDef.factories.menuIconStyles || {})) {
                html += prop + ": " + toolDef.factories.menuIconStyles[prop];
            }
            html += "' />";
            html += "<span>" + toolDef.factories.menuLabel + "</span>";
            td.html(html);
        } else {
            let html = "<img src='img/top-icons/empty.svg' class='float-left' style='width:33%; ' />";
            html += "<span>[Disponible]</span>";
            td.html(html);
        }
        window.geoos.topPanel.refreshTools();
    }

    dropTool(n) {
        window.geoos.user.config.toolsConfig["tool" + n] = this.draggedCode;
        window.geoos.user.saveConfig();
        this.refrescaTool(n, this.draggedCode);
    }

    onCmdCloseInfoWindow_click() {
        window.geoos.topPanel.toggleAction("wizardExpander");
        this.close()
    }
    onCmdCancel_click() {
        window.geoos.topPanel.toggleAction("wizardExpander");
        this.close()
    }
}
ZVC.export(WConfigTools);