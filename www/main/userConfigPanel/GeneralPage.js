class GeneralPage extends ZCustomController {
    onThis_init() {
        this.edLanguage.setRows(window.languages, window.language);
    }
    refresh() {
        console.log("config refresh");
        this.edLanguage.value = window.language;
    }
    
    get config() {return window.geoos.user.config}

    onEdLanguage_change() {
        let lang = this.edLanguage.value;
        window.language = lang;
        this.config.lang = lang;
        window.localStorage.setItem("lang", lang);
        window.geoos.user.saveConfig();
    }

    applyConfig(onlyShow) {
    }

}
ZVC.export(GeneralPage)