class Top extends ZCustomController {
    onThis_init() {
        window.geoos.topPanel = this;
        this.leftState = "open";
        this.rightState = "open";
        this.lastSizeLevel = null;
        this.doResize(window.geoos.size);
        $(this.rightBar.view).find(".top-action").mouseenter(e => {
            let t = $(e.currentTarget);
            let icon = t.data("z-icon");
            if (this.isActionActive(icon)) return;  
            t.children()[0].src = "img/top-icons/" + icon + "-active.svg";
        })
        $(this.rightBar.view).find(".top-action").mouseleave(e => {
            let t = $(e.currentTarget);
            let icon = t.data("z-icon");
            if (this.isActionActive(icon)) return;
            t.children()[0].src = "img/top-icons/" + icon + ".svg";
        })
        $(this.rightBar.view).find(".top-action").click(e => {
            let t = $(e.currentTarget);
            let icon = t.data("z-icon");
            this.toggleAction(icon);
        })
        $(this.rightBar.view).find(".top-option").click(e => {
            let t = $(e.currentTarget);
            let id = t[0].id;
            this.toggleOption(id);
        });
        $(this.rightBar.view).find(".wizard-expander").click(e => {
            let t = $(e.currentTarget);
            let icon = t.data("z-icon");
            console.log("id", icon);
            this.toggleAction(icon);
        });
        // refreshTools is called after login, autoLogin or not logged
        // triggered by event
        window.geoos.events.on("portal", "userConfigChanged", _ => this.refreshTools());
        // this.refreshTools();
    }

    doResize(size) {
        let xm = size.width / 2;
        this.logo.view.style.left = (xm - 37) + "px";
        this.adjustLeft();
        this.adjustRight();
        this.lastSizeLevel = window.geoos.size.sizeLevel;
    }

    adjustLeft() {
        let w = window.geoos.size.width / 2 - 1;
        if (this.leftState == "open") {
            this.leftBar.view.style.width = w + "px";
            let sizeLevel = window.geoos.size.sizeLevel;
            if (sizeLevel != this.lastSizeLevel) {
                if (sizeLevel <= 3) {
                    $(this.leftBar.view).find(".top-option span").hide();
                } else {
                    $(this.leftBar.view).find(".top-option span").show();
                }
            }
        } else {

        }
    }
    adjustRight() {        
        if (this.rightState == "open") {
            let w = window.geoos.size.width / 2 + 1;
            this.rightBar.view.style.left = w + "px";
            this.rightBar.view.style.width = (w - 3) + "px";
            let sizeLevel = window.geoos.size.sizeLevel;
            if (sizeLevel != this.lastSizeLevel) {
                if (sizeLevel <= 3) {
                    $(this.rightBar.view).find(".top-option span").hide();
                } else {
                    $(this.rightBar.view).find(".top-option span").show();
                }
            }
        } else {
            let w = window.geoos.size.width;
            this.rightBar.view.style.left = (w - 110) + "px";
            this.rightBar.view.style.right = 1 + "px";
        }
    }

    onLeftToggler_click() {
        if (this.leftState == "open") {
            $(this.leftBar.view).find(".top-option").hide();
            $(this.leftBar.view).find(".left-toggler").hide();
            $(this.leftBar.view).animate({width: 140}, 300, _ => {
                $(this.leftBar.view).find("#opMyPanel").show();
                $(this.leftBar.view).find(".left-toggler").show();
                $(this.leftBar.view).find("#opMyPanel span").show();
                $(this.leftBar.view).find("#leftToggler").addClass("left-toggler-closed")
                this.leftState = "closed";
                this.adjustLeft();
            })
        } else {
            $(this.leftBar.view).find(".top-option").hide();
            $(this.leftBar.view).find(".left-toggler").hide();
            let w = window.geoos.size.width / 2 - 1;
            $(this.leftBar.view).animate({width: w}, 300, _ => {
                $(this.leftBar.view).find(".top-option").show();
                $(this.leftBar.view).find(".left-toggler").show();
                $(this.leftBar.view).find("#leftToggler").removeClass("left-toggler-closed")
                this.leftState = "open";
                this.lastSizeLevel = null;
                this.adjustLeft();
                this.lastSizeLevel = window.geoos.size.sizeLevel;
            })
        }
    }

    onRightToggler_click() {
        let w = window.geoos.size.width;
        if (this.rightState == "open") {
            $(this.rightBar.view).find(".top-option").hide();
            $(this.rightBar.view).find(".top-action").hide();
            $(this.rightBar.view).find(".wizard-expander").hide();
            $(this.rightBar.view).find(".right-toggler").hide();
            $(this.rightBar.view).animate({left:w - 110, width: 110}, 300, _ => {
                $(this.rightBar.view).find("#opConfigure").show();
                $(this.rightBar.view).find("#opAccount").show();
                $(this.rightBar.view).find(".right-toggler").show();
                $(this.rightBar.view).find("#rightToggler").addClass("right-toggler-closed")
                this.rightState = "closed";
                this.adjustRight();
            })
        } else {
            let w = window.geoos.size.width / 2 + 1;
            $(this.rightBar.view).find(".top-action").hide();
            $(this.rightBar.view).find(".right-toggler").hide();
            $(this.rightBar.view).animate({left:w, width: w}, 300, _ => {
                $(this.rightBar.view).find(".top-action").show();
                $(this.rightBar.view).find(".top-option").show();
                $(this.rightBar.view).find(".right-toggler").show();
                $(this.rightBar.view).find(".wizard-expander").show();
                $(this.rightBar.view).find("#rightToggler").removeClass("right-toggler-closed")
                this.rightState = "open";
                this.adjustRight();
            })
        }
    }

    activateOption(id) {
        $(this.view).find("#" + id).addClass("active");
    }
    deactivateOption(id) {
        $(this.view).find("#" + id).removeClass("active");
    }
    toggleOption(id) {
        if ($(this.view).find("#" + id).hasClass("active")) {
            this.deactivateOption(id); 
        }else {
            this.activateOption(id);
        }
    }

    isActionActive(id) {
        let div = $(this.rightBar.view).find("#op" + id.substr(0,1).toUpperCase() + id.substr(1));
        return div.hasClass("active");
    }
    toggleAction(id) {
        if (this.isActionActive(id)) this.deactivateAction(id);
        else this.activateAction(id);
    }
    activateAction(id) {
        let div = $(this.rightBar.view).find("#op" + id.substr(0,1).toUpperCase() + id.substr(1));
        if (div.length) {
            let icon = div.data("z-icon");
            div.children()[0].src = "img/top-icons/" + icon + "-active.svg";
            div.addClass("active");
        }
        window.geoos.events.trigger("top", "activateAction", id);
    }
    deactivateAction(id) {
        let div = $(this.rightBar.view).find("#op" + id.substr(0,1).toUpperCase() + id.substr(1));
        if (div.length) {
            let icon = div.data("z-icon");
            div.children()[0].src = "img/top-icons/" + icon + ".svg";
            div.removeClass("active");
        }
        window.geoos.events.trigger("top", "deactivateAction", id);
    }

    onOpMyPanel_click() {
        window.geoos.events.trigger("top", "clickMyPanel");
    }
    onOpAddVariables_click() {
        window.geoos.events.trigger("top", "clickAddVariables");
    }
    onOpStations_click() {
        window.geoos.events.trigger("top", "clickStations");
    }
    onOpObjects_click() {
        window.geoos.events.trigger("top", "clickObjects");
    }
    /*
    onOpSearchLocation_click() {
        window.geoos.events.trigger("top", "clickSearchLocation");
    }
    */

    onOpWizard1_click() {
        if (!window.geoos.user.config.toolsConfig.tool1) return;
        window.geoos.toolsPanel.openAddTool(window.geoos.user.config.toolsConfig.tool1)
    }
    onOpWizard2_click() {
        if (!window.geoos.user.config.toolsConfig.tool2) return;
        window.geoos.toolsPanel.openAddTool(window.geoos.user.config.toolsConfig.tool2)
    }
    onOpWizard3_click() {
        if (!window.geoos.user.config.toolsConfig.tool3) return;
        window.geoos.toolsPanel.openAddTool(window.geoos.user.config.toolsConfig.tool3)
    }

    refreshTools() {
        this.setWizardTool(1, window.geoos.user.config.toolsConfig.tool1)
        this.setWizardTool(2, window.geoos.user.config.toolsConfig.tool2)
        this.setWizardTool(3, window.geoos.user.config.toolsConfig.tool3)
    }
    setWizardTool(index, toolCode) {
        let toolDef = GEOOSTool.getToolDef(toolCode);
        if (!toolDef) toolCode = null;
        let div = this["opWizard" + index];
        let img = div.find("img");
        // remove img styles
        for (let prop in img.style) {
            img.style.removeProperty(prop);
        }
        let span = div.find("span")
        if (toolCode) {
            let toolDef = GEOOSTool.getToolDef(toolCode);
            if (!toolDef) console.error("Setting up tool wizards: No tool registered with code:" + toolCode);            
            img.src = toolDef.factories.menuIcon;
            for (let prop in (toolDef.factories.menuIconStyles || {})) {
                img.style[prop] = toolDef.factories.menuIconStyles[prop]
            }
            span.textContent = toolDef.factories.menuLabel;
        } else {
            img.src = "img/top-icons/empty.svg";
            span.textContent = "Próximamente";
        }
    }
    onOpWizardExpander_click() {
        console.log("color", opWizardExpander);
        this.showDialog("./WConfigTools");
    }

    onOpMore_click(e) {
        console.log("more");
        let opener = $(e.currentTarget);
        let items = [{
            code:"help", icon:"fas fa-question", label:"Ayuda", 
        }, {
            code:"localidad", icon:"fas fa-search", label:"Buscar Localidad", 
        }]
        let z = new ZPop(opener, items, {
            vMargin:0,
            hPos:"justify-left", hMargin:-115,
            onClick:(code, item) => {
                if (code == "localidad") window.geoos.events.trigger("top", "clickSearchLocation");
                else if (code == "help") window.geoos.events.trigger("top", "activateAction", "help");
            }
        });
        z.show();

    }

    onOpBiblioteca_click() {
        this.showDialog("main/myPanel/WLibrary");
    }
}
ZVC.export(Top)