class ZLangPreprocessor {
    constructor(messages, defaultLanguage) {
        this.messages = messages;
        this.defaultLanguage = defaultLanguage;
    }

    getMessage(name) {
        let lang = window.language || this.defaultLanguage;
        if (!lang) throw "No window.language value";
        let fields = name.split(".").concat(lang);
        let i=0;
        let current = this.messages;
        while (i < fields.length) {
            current = current[fields[i]];
            if (!current) return null;
            i++;
        }
        return current;
    }
    parseHTML(html) {
        let st = "";
        let i0 = 0;
        let i1 = html.indexOf("$[", i0);        
        while (i1 >= 0) {
            let p = html.indexOf("]", i1);
            if (p >= 0) {
                st += html.substring(i0, i1);
                let varName = html.substring(i1+2, p);
                let value = this.getMessage(varName);
                if (value) {
                    st += value;
                } else {
                    st += "$[" + varName + "]";
                }
                i0 = p + 1;
                i1 = html.indexOf("$[", i0); 
            } else {
                i1 = -1;
            }
        }
        return st + html.substring(i0);
    }
}