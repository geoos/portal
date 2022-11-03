class UserAccountPanel extends ZCustomController {
    async onThis_init() {
        window.geoos.userAccountPanel = this;
        this.open = false;
        this.hide();
        window.geoos.events.on("top", "activateAction", action => {
            if (action == "account" && !this.open) this.toggle();
        })
        window.geoos.events.on("top", "deactivateAction", action => {
            if (action == "account" && this.open) this.toggle();
        })
        let s = localStorage.getItem("session");
        this.tabUserAccountPanel.hideTab("profile");
        if (s && s.length) {
            try {
                let sesion = await zPost("autoLogin.geoos", {token:s});
                window.geoos.login(sesion);
                this.session.load("./Logged");
                this.tabUserAccountPanel.showTab("profile");
                this.tabUserAccountPanel.hideTab("register");
                window.geoos.triggerLogged();
            } catch(error) {
                console.error(error);
                this.session.load("./Login");
                localStorage.removeItem("session");
                this.tabUserAccountPanel.showTab("register");
                window.geoos.triggerNotLogged();
            }
        } else {
            this.session.load("./Login");
            this.tabUserAccountPanel.showTab("register");
            window.geoos.triggerNotLogged();
        }        
    }
    doResize() {        
        if (!this.open) return;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let top = (topMenuRect.top + topMenuRect.height - 6);
        this.session.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        this.profile.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        this.register.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
    }

    onCmdCloseUserAccount_click() {window.geoos.topPanel.deactivateAction("account")}
    close() {
        if (this.open) window.geoos.topPanel.deactivateAction("account")
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

    async onRegister_registrado(user) {
        await this.session.load("./Login", user);
        this.tabUserAccountPanel.activate("session");
    }
    async onSession_to_Login(email) {
        await this.session.load("./Login", {email:email})
        this.tabUserAccountPanel.hideTab("profile");
    }

    async onSession_login() {
        await this.session.load("./Logged")
        this.tabUserAccountPanel.showTab("profile");
        this.tabUserAccountPanel.hideTab("register")
        window.geoos.triggerLogged();
    }
    async onSession_logout() {
        await this.session.load("./Login")
        this.tabUserAccountPanel.showTab("register")
        this.tabUserAccountPanel.hideTab("profile");
        window.geoos.triggerNotLogged();
    }

    onTabUserAccountPanel_change(tab) {
        if (tab == "profile") this.profile.refresh();
        //if (tab == "register") this.register.refresh();
        else if (tab == "session") {
            if (this.session.content.refresh) this.session.content.refresh();
        }else if (tab == "session") {
            this.profile.refresh();
        }
    }
}
ZVC.export(UserAccountPanel);
