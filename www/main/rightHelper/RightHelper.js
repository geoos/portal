class RightHelper extends ZCustomController {
    onThis_init() {
        window.geoos.rightHelper = this;
        this.currentIcon = "far fa-question-circle";
        this.open = false;
        this.hide();
    }
    doResize() {        
        if (!this.open) return;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let top = (topMenuRect.top + topMenuRect.height - 6);
        this.rightHelperLoader.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        if (this.rightHelperLoader.content.doResize) this.rightHelperLoader.content.doResize();
    }

    onCmdCloseRightHelper_click() {
        this.toggle();
    }
    async close() {
        if (this.open) {            
            this.toggle();
            await this.rightHelperLoader.load("common/Empty");
        }
    }
    async loadContent(contentPath, caption, icon, options) {
        if (caption) this.find("#rightHelperCaptionText").textContent = caption;
        if (icon) {
            let i = $(this.find("#rightHelperIcon"));
            i.removeClass(this.currentIcon).addClass(icon);
            this.currentIcon = icon;
        }
        await this.rightHelperLoader.load(contentPath, options);
        if (!this.open) this.toggle();
    }

    toggle() {
        if (!this.open) {
            window.geoos.closeFloatingPanels();
            this.open = true;
            this.doResize();
            this.show();
        } else {
            this.open = false;
            this.hide();
        }
    }


}
ZVC.export(RightHelper);