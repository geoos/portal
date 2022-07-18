class WFormula extends ZDialog {
    onThis_init(options) {       
        this.errorMsg.hide(); 
        $(this.find(".modal-content")).draggable({
            handle: ".modal-header",
            cursor: 'move',                
        }); 
        this.layer = options.layer;
        this.editor = monaco.editor.create(this.jsEditor.view, {
            value:this.layer.formula || "",
            language:"javascript",
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,            
        });
        this.instalaCompletionItemProvider();
    }
    onCmdCloseInfoWindow_click() {this.cancel()}
    onCmdCancel_click() {this.cancel()}

    instalaCompletionItemProvider() {
        let items = [{label:"[variable] Latitud", insertText:"args.lat"}, {label:"[variable] Longitud", insertText:"args.lng"}];
        for (let s of this.layer.sources) {
            items.push({label:"[variable] " + s.code + ": " + s.name, insertText:"args." + s.code});
            items.push({label:"[variable] " + "min_" + s.code + ": Mínimo de " + s.name, insertText:"args.min_" + s.code});
            items.push({label:"[variable] " + "max_" + s.code + ": Máximo de " + s.name, insertText:"args.max_" + s.code});
        }

        this.completionItemProvider = monaco.languages.registerCompletionItemProvider('javascript', {
            provideCompletionItems: (model, position) => {
                let word = model.getWordUntilPosition(position);
                if (word && word.word.length) {
                    let range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endColumn: word.endColumn
                    };
                    let ret = items.map(i => {
                        //i.kind = monaco.languages.CompletionItemKind.Text;
                        i.sortText = "0" + i.label;
                        i.range = range;
                        i.kind = monaco.languages.CompletionItemKind.Constant;
                        return i;
                    });
                    ret.push({label:"rgbEncode(r, g, b)", insertText:"rgbEncode(r, g, b)", range, kind:monaco.languages.CompletionItemKind.Function});
                    ret.push({label:"rgbaEncode(r, g, b, a)", insertText:"rgbaEncode(r, g, b, a)", range, kind:monaco.languages.CompletionItemKind.Function});
                    return {suggestions: ret};
                } else {
                    return {suggestions: []};
                }
            }
        })

    }
    onThis_deactivated() {
        if (this.completionItemProvider) {
            this.completionItemProvider.dispose();
        }
    }

    onCmdSave_click() {
        try {
            let st = this.editor.getValue() + "\(z)";
            let ev = eval(st);            
            if (!ev || typeof(ev) != "function") throw "No se encontró la función 'z' en el código";
            this.errorMsg.hide();
            this.layer.formula = this.editor.getValue();
            window.geoos.configPanel.refresh({type:"layer", element:this.layer})
            this.layer.refresh();
        } catch(error) {
            this.errorMsg.text = error.toString();
            this.errorMsg.show();
        }
    }
}
ZVC.export(WFormula);