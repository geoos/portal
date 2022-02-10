class ZBSNavTabs extends ZController {
    onThis_init() {
        $(this.view).on("shown.bs.tab", e => {
            let targetId = e.target.getAttribute("href");
            if (targetId && targetId.startsWith("#")) targetId = targetId.substr(1);
            this.triggerEvent("change", targetId);
        })
    }

    activate(name) {
        $(this.view).find('a[href="#' + name + '"]').tab('show');
    }
    showTab(name) {
        $(this.view).find('a[href="#' + name + '"]').show();
    }
    hideTab(name) {
        $(this.view).find('a[href="#' + name + '"]').hide();
    }
}

ZVC.registerComponent("UL", e => (e.classList.contains("nav-tabs")), ZBSNavTabs);