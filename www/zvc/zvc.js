/** ZVC Entry Point and other static functions */
class ZVC {
    static get _defaultOptions() {
        return {
            debug:{events:false}
        }
    }
    static set options(options) {
        if (!ZVC._options) ZVC._options = ZVC._defaultOptions;
        for (let name in options) ZVC._options[name] = options[name];
    }
    static get options() {
        if (!ZVC._options) ZVC._options = ZVC._defaultOptions;
        return ZVC._options;
    }
    static nextZId() {
        if (ZVC._nextZId === undefined) ZVC._nextZId = 1;
        else ZVC._nextZId++;
        return ZVC._nextZId;
    }
    static async fromElement(domElement, options) {
        domElement = typeof domElement == "string"?document.getElementById(domElement):domElement;
        let path = domElement.getAttribute("data-z-component");
        if (!path) throw "Root element must have data-z-component='path-to-component'";
        if (path.startsWith("./")) {
            let docPath = document.location.pathname;
            if (docPath.endsWith("/")) docPath = docPath.substr(0,docPath.length - 1);
            path = docPath + path.substr(1);
        }
        let newComponent = await ZVC.loadComponent(domElement, null, path);
        await newComponent.init(options);
        await newComponent.activate();
        return newComponent;
    }
    static registerComponent(elementType, checkFunction, componentClass) {
        if (!ZVC.library) ZVC.library = [];
        ZVC.library.push({elementType, checkFunction, componentClass});
    }
    static findApplicableComponent(domElement) {
        let nodeName = domElement.nodeName;
        for (let i=ZVC.library.length - 1; i>=0; i--) {
            let c = ZVC.library[i];
            if (c.elementType == nodeName && c.checkFunction(domElement)) return c;
        }
        return null;
    }    
    static export(controllerClass) {
        ZVC.lastExportedClass = controllerClass;
    }
    static async loadComponent(domElement, parentController, path) {
        if (path.startsWith("./")) path = (parentController?parentController.path:"") + path.substr(1);
        let p = path.lastIndexOf("/");
        let dir, componentName;
        if (p < 0) {
            dir = "";
            componentName = path;
        } else {
            dir = path.substr(0,p);
            componentName = path.substr(p+1);
        }
        if (dir.endsWith("/")) dir = dir.substr(0,dir.length-1);

        let headers = new Headers();
        headers.append('pragma', 'no-cache');
        headers.append('cache-control', 'no-cache');

        let pHtml = fetch(dir + "/" + componentName + ".html", {headers:headers});
        let pJs = fetch(dir + "/" + componentName + ".js", {headers:headers});
        try {
            let [resHtml, resJS] = await Promise.all([pHtml, pJs]);
            if (!resHtml.ok) {
                console.error("[" + resHtml.status + ": " + resHtml.statusText + "] -> " + dir + "/" + componentName + ".html")
                return;
            }
            if (!resJS.ok) {
                console.error("[" + resJS.status + ": " + resJS.statusText + "] -> " + dir + "/" + componentName + ".js")
                return;
            }
            let [html, js] = await Promise.all([resHtml.text(), resJS.text()])
            ZVC.lastExportedClass = null;
            try {
                eval(js);
            } catch(error) {
                console.error("Error loading controller:" + dir + "/" + componentName + ".js");                
                console.error(error);
                console.log(js);
                console.trace(error);
                throw error;
            }
            let controllerClass = ZVC.lastExportedClass;
            if (!controllerClass) throw "No ZVC.export(ControllerClass) at the end of controller file";
            let zId = ZVC.nextZId();
            if (ZVC.options.htmlPreprocessor) html = ZVC.options.htmlPreprocessor(html);
            domElement.innerHTML = ZVC.parseHTML(html, {zId:zId});
            let controller = new (controllerClass)(domElement, parentController, dir)
            controller.zId = zId;
            return controller;
        } catch(error) {
            console.trace(error);
            throw error;
        }
    }
    static parseHTML(html, vars) {
        let st = "";
        let i0 = 0;
        let i1 = html.indexOf("${", i0);        
        while (i1 >= 0) {
            let p = html.indexOf("}", i1);
            if (p >= 0) {
                st += html.substring(i0, i1);
                let varName = html.substring(i1+2, p);
                let value = vars[varName];
                if (value !== undefined) {
                    st += value;
                } else {
                    st += "${" + varName + "}";
                }
                i0 = p + 1;
                i1 = html.indexOf("${", i0); 
            } else {
                i1 = -1;
            }
        }
        return st + html.substring(i0);
    }
    static async openDialogInPlatform() {throw "openDialogInPlatform not implemented for ZDialogs"}
    static async closeDialogInPlatform() {throw "closeDialogInPlatform not implemented for ZDialogs"}

    // Utitilies
    static createTemporaryAnimation(name, frames, autodeleteDelay) {
        let styleElement = document.createElement("style");
        document.head.appendChild(styleElement);
        let styleSheet = styleElement.sheet;
        if (CSS && CSS.supports && CSS.supports('animation: name')) {
            styleSheet.insertRule("@keyframes " + name + "{" + frames + "}", 0);
        } else {
            let rule = name + "{" + frames + "}";
            styleSheet.insertRule("@-webkit-keyframes " + rule, 0);
            styleSheet.insertRule("@keyframes " + rule, 1);
        }
        setTimeout(_ => styleElement.parentNode.removeChild(styleElement), autodeleteDelay);
    }
}

/** Base Classes */
class ZController {
    constructor(domElement, parentController, basePath) {
        this.domElement = typeof domElement == "string"?document.getElementById(domElement):domElement;
        if (!domElement) throw "Cannot find domElement";
        this.parentController = parentController;
        this.path = basePath;
    }
    get view() {return this.domElement}
    get id() {return this.view.id}
    
    zDescribe() {return this.constructor.name + "[" + this.id + "]"}

    async init(options) {
        await this.processEvent(this, "init", [options]);
    }
    async triggerEvent(eventName, ...args) {
        if (!this.parentController) return;
        if (ZVC.options.debug.events) console.debug("[" + this.zDescribe() + "] is triggering event " + eventName + " with args", args);
        return await this.parentController.processEvent(this, eventName, args);
    }
    async processEvent(control, eventName, args) {
        let srcId = control == this?"this":control.id;
        let funcName = "on" + srcId.substr(0,1).toUpperCase() + srcId.substr(1) + "_" + eventName;
        let func = this[funcName];
        if (func && typeof func == "function") {
            if (ZVC.options.debug.events) console.debug("[" + this.zDescribe() + "] is processing event " + eventName + " from " + control.zDescribe() + " with args", args);
            return await func.apply(this, args);
        } else {
            if (ZVC.options.debug.events) console.debug("[" + this.zDescribe() + "] is skipping event " + eventName + " from " + control.zDescribe() + " with args", args);
        }
    }
    async activate() {
        if (this._zActive) return;
        await this.processEvent(this, "activated", []);
        this._zActive = true;
    }
    async deactivate() {
        if (!this._zActive) return;
        await this.processEvent(this, "deactivated", []);
        this._zActive = false;
    }
    find(query) {
        return this.view.querySelector(query);
    }
    findAll(query) {
        return this.view.querySelectorAll(query);
    }
    hide() {
        if (this.view.style.display != "none") this.savedDisplay = this.view.style.display;
        this.view.style.display = "none";
    }
    show(display) {
        let newDisplay = (display?display:this.savedDisplay) || "block";
        this.view.style.display = newDisplay;
    }
    isVisible() {
        return this.view.style.display != "none";
    }
    hasClass(className) {
        return this.view.classList.contains(className);
    }
    addClass(classNames) {
        classNames.split(" ").forEach(n => this.view.classList.add(n));
    }
    removeClass(classNames) {
        classNames.split(" ").forEach(n => this.view.classList.remove(n));
    }
    toggleClass(className) {
        return this.view.classList.toggle(className);
    }
    getAttribute(name) {return this.view.getAttribute(name)}
    setAttribute(name, value) {this.view.setAttribute(name, value)}
    get text() {return this.view.textContent}
    set text(txt) {this.view.textContent = txt}
    get html() {return this.view.innerHTML}
    set html(h) {this.view.innerHTML = h} 
    enable() {this.view.disabled = false}   
    disable() {this.view.disabled = true}
    isEnabled() {return this.view.disableb?false:true}
    //get pos() {let r = this.view.getBoundingClientRect(); return {left:r.left, top:r.top}}
    get pos() {return {left:parseFloat(this.view.style.left), top:parseFloat(this.view.style.top)}}
    set pos(p) {this.view.style.left = p.left + "px"; this.view.style.top = p.top + "px"}
    get size() {return {width:this.view.clientWidth, height:this.view.clientHeight}}
    set size(s) {this.view.style.width = s.width + "px"; this.view.style.height = s.height + "px"}

    async showDialog(path, options, okCallback, cancelCallback) {
        let cnt = document.getElementById("dialogs-container");
        if (!cnt) {
            cnt = document.createElement("DIV");
            cnt.setAttribute("id", "dialogs-container");
            document.body.appendChild(cnt);
        }
        let div = document.createElement("DIV");
        cnt.appendChild(div);
        let controller = await ZVC.loadComponent(div, this, path);
        if (!controller instanceof ZDialog) throw "Controller is not a ZDialog instance";
        await controller.init(options);
        await controller.open(okCallback, cancelCallback);
        return controller;
    }
}

class ZBasicController extends ZController {
    async init(options) {
        this.initDefaults();
        await super.init(options);
    }
    initDefaults() {
        if (this.getAttribute("data-z-clickable")) this.view.onclick = e => this.triggerEvent("click", e);
    }
}

class ZCompoundController extends ZController {
    constructor(domElement, parentController, basePath) {
        super(domElement, parentController, basePath);
        this.controllers = [];
    }

    async init(options) {        
        await this.parseFrom(this.domElement);
        await super.init(options);
    }
    async activate() {
        for (let i=0; i<this.controllers.length; i++) {
            await this.controllers[i].activate();
        }
        await super.activate();
    }
    async deactivate() {
        for (let i=0; i<this.controllers.length; i++) {
            await this.controllers[i].deactivate();
        }
        await super.deactivate();
    }
    async parseFrom(element) {
        let children = element.children;
        for (let i=0; i<children.length; i++) {
            let c = children[i];
            if (c.nodeType == 1) {
                let parseChildren = true;
                let childController = null;
                let ref = c.getAttribute("data-z-component");                
                if (ref) {
                    if (!c.id) throw "z-component with no 'id' [" + ref + "]";
                    childController = await ZVC.loadComponent(c, this, ref);
                    parseChildren = false;                
                } else if (c.id) {
                    let component = ZVC.findApplicableComponent(c);
                    if (component) {
                        childController = new (component.componentClass)(c, this, this.path);
                        parseChildren = false;
                    } else {
                        childController = new ZBasicController(c, this, this.path);
                    }
                }
                if (childController) {
                    this.controllers.push(childController);
                    this[c.id] = childController;
                    await childController.init();
                }
                if (parseChildren) {
                    await this.parseFrom(c);
                }
            }
        }
    }
}

class ZDialog extends ZCompoundController {
    async open(okCallback, cancelCallback) {
        this.okCallback = okCallback;
        this.cancelCallback = cancelCallback;
        ZVC.openDialogInPlatform(this);
        await this.activate();
    }
    async close(returnData) {
        if (this.okCallback) await this.okCallback(returnData);
        await this.deactivate();
        this._closedFromController = true;
        ZVC.closeDialogInPlatform(this);
        this.view.parentNode.removeChild(this.view);
    }
    async cancel() {
        if (this.cancelCallback) await this.cancelCallback();
        await this.deactivate();
        this._closedFromController = true;
        ZVC.closeDialogInPlatform(this);
        this.view.parentNode.removeChild(this.view);
    }
}

class ZCustomController extends ZCompoundController {

}

/** Base Components */

// Button
class ZButton extends ZController {
    onThis_init() {
        this.domElement.onclick = e => this.triggerEvent("click", e);
    }
}
ZVC.registerComponent("BUTTON", _ => (true), ZButton);
ZVC.registerComponent("A", _ => (true), ZButton);

// Inputs
class ZInput extends ZController {
    get value() {return this.view.value}
    set value(v) {this.view.value = v; this.oldValue = v;}
    get checked() {return this.view.checked}
    set checked(c) {this.view.checked = c}

    onThis_init() {
        this.view.onclick = e => this.triggerEvent("click", e);
        this.type = this.getAttribute("type");
        if (this.type == "checkbox" || this.type == "radio") {
            this.view.onchange = e => this.triggerEvent("change", e);
        } else {
            let delay = this.getAttribute("data-z-autochange-delay");
            if (!delay || isNaN(delay) || delay <= 0) delay = false;
            this.delay = (!delay || isNaN(delay) || delay <= 0)?false:delay;
            this.oldValue = this.value;
            this.view.onchange = e => this.triggerDelayedChange(e);
            if (this.delay) {
                this.view.onclick = e => this.triggerDelayedChange(e);
                this.view.onkeyup = e => this.triggerDelayedChange(e);
            }
        }
    }
    triggerDelayedChange(e) {
        if (!this.delay && this.value != this.oldValue) {
            this.oldValue = this.value;
            this.triggerEvent("change", e);
            return;
        }
        if (this.changeTimer) clearTimeout(this.changeTimer);
        this.changeTimer = setTimeout(_ => {
            this.changeTimer = undefined;
            if (this.value != this.oldValue) {
                this.oldValue = this.value;
                this.triggerEvent("change", e);
            }
        }, this.delay);
    }
}
ZVC.registerComponent("INPUT", _ => (true), ZInput);
ZVC.registerComponent("TEXTAREA", _ => (true), ZInput);

// ZSelect
class ZSelect extends ZController {
    get value() {return this.view.value}
    set value(v) {this.view.value = v}
    get selectedText() {
        let idx = this.view.selectedIndex;
        if (isNaN(idx) || idx < 0) return null;
        return this.view.options[idx].textContent;
    }
    onThis_init() {
        this.view.onchange = e => this.triggerEvent("change", e);
    }
}
ZVC.registerComponent("SELECT", e => (!e.getAttribute("data-z-id-field") || !e.getAttribute("data-z-label-field")), ZSelect);

// ZDynamicSelect
class ZDynamicSelect extends ZSelect {
    onThis_init() {
        this.idField = this.view.getAttribute("data-z-id-field");
        this.labelField = this.view.getAttribute("data-z-label-field");
        this.placeHolder = this.view.getAttribute("data-z-placeholder");
        this.view.onchange = e => this.triggerEvent("change", e);
    }
    get selectedRow() {
        let idx = parseInt(this.view.value);
        if (isNaN(idx) || idx < 0) return null;
        return this.rows[idx];
    }
    get value() {
        let row = this.selectedRow;
        return row?row[this.idField]:null;
    }
    set value(v) {
        let idx = this.rows.findIndex(r => r[this.idField] == v);
        if (idx >= 0) this.view.value = "" + idx;
    }
    setRows(rows, selectedId=null) {
        this.rows = rows;
        this.view.innerHTML = this.rows.reduce((html, row, idx) => {
            let id = row[this.idField];
            let label = window.toLang?window.toLang(row[this.labelField]):row[this.labelField];
            html += "<option value='" + idx + "'" + (selectedId == id?" selected":"") + ">" + label + "</option>";
            return html;
        }, (this.placeHolder?("<option disabled selected>" + this.placeHolder + "</option>"):""));
    }
}
ZVC.registerComponent("SELECT", e => (e.getAttribute("data-z-id-field") && e.getAttribute("data-z-label-field")), ZDynamicSelect);

// ZLoader
class ZLoader extends ZController {
    async init() {
        let initialComponentPath = this.view.getAttribute("data-z-load");
        this.content = await ZVC.loadComponent(this.view, this, initialComponentPath);
        await this.content.init();
        await super.init();
    }
    async activate() {
        if (this.content) await this.content.activate();
        await super.activate();
    }
    async deactivate() {
        if (this.content) await this.content.deactivate();
        await super.deactivate();
    }
    async load(path, options) {
        if (this.content) await this.content.deactivate();        
        this.content = await ZVC.loadComponent(this.view, this, path);
        await this.content.init(options);
        await this.content.activate();
        return this.content;
    }
    async processEvent(control, eventName, args) {
        if (control == this) return await super.processEvent(control, eventName, args);
        let callArgs = [eventName].concat(args);
        return this.triggerEvent.apply(this, callArgs);
    }
}
ZVC.registerComponent("DIV", e => (e.getAttribute("data-z-load")), ZLoader);