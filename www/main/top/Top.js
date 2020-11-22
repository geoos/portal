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
            t.children()[0].src = "img/top-icons/" + icon + "-active.svg";
        })
        $(this.rightBar.view).find(".top-action").mouseleave(e => {
            let t = $(e.currentTarget);
            let icon = t.data("z-icon");            
            t.children()[0].src = "img/top-icons/" + icon + ".svg";
        })
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
        if ($(this.view).find("#" + id).hasClass("active")) this.deactivateOption(id); else this.activateOption(id);
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
}
ZVC.export(Top)