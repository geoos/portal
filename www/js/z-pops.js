const defaults = {
    vPos:"bottom", vMargin:0,
    hPos:"justify-left", hMargin:0,
    subItemsAt:"right", subHMargin:7, subVMargin:-6,
    onSearch:null, searchPlaceholder:"Search",
    onClick:null
}

class ZPop {
    static closeAll() {
        while (ZPop.actives.length) ZPop.actives[0].close();
        ZPop.actives = [];
    }
    constructor(reference, items, options) {
        if (!ZPop.nextId) ZPop.nextId = 1;
        if (!ZPop.actives) ZPop.actives = [];
        if (ZPop.checkingClicksOutside === undefined) ZPop.checkingClicksOutside = false;
        if (!ZPop.docClickListener) {            
            ZPop.docClickListener = e => {
                let clickInside = false;
                ZPop.actives.forEach(zpop => {
                    let container = zpop.pop;
                    if (container.is(e.target) || container.has(e.target).length) clickInside = true;
                });
                if (!clickInside) {
                    ZPop.closeAll();
                }
                return true;
            }            
        }
        
        this.reference = reference;
        this.items = items;
        this.options = $.extend(true, {}, defaults, options);
        this.childPop = null;
        this.subPop = null;
        this.closed = false;
        this.searchTimer = null;
        this.showingSearchResults = false;
        this.searchCancelled = false;        
    }

    static addActive(zpop) {
        ZPop.actives.push(zpop);
        if (!ZPop.checkClicksOutside) {
            setTimeout(_ => $(document).bind("click", ZPop.docClickListener), 0);
            ZPop.checkClicksOutside = true;
        }
    }
    static removeActive(zpop) {
        let idx = ZPop.actives.indexOf(zpop);
        if (idx >= 0) ZPop.actives.splice(idx,1);
        if (!ZPop.actives.length && ZPop.checkClicksOutside) {
            $(document).unbind("click", ZPop.docClickListener);
            ZPop.checkClicksOutside = false;
        }
    }


    show(items) {
        if (!this.isSubProp) ZPop.closeAll();
        if (items) this.items = items;
        let popsContainer;
        if (!this.options.container) {
            popsContainer = $("#pops-container");
            if (!popsContainer.length) {
                $(document.body).append("<div id='pops-container' style='position:absolute; left:0; top:0; pointer-events:none;'></div>");
                popsContainer = $("#pops-container");
            }
            let w = window.innerWidth;
            let h = window.innerHeight;
            //popsContainer.css({width:w + "px", height:h + "px", "pointer-events":"all"});   
            popsContainer.css({width:w + "px", height:h + "px"});   
        } else {
            popsContainer = $(this.options.container);
        }     

        this.popId = "zpop_" + (ZPop.nextId++);
        let html = "<div id='" + this.popId + "' class='zpop' style='position:absolute; pointer-events:auto;'><i class='fas fa-spin fa-spinner ml-2 mt-2' /></div>";
        popsContainer.append(html);
        this.pop = popsContainer.find("#" + this.popId);
        this.adjustPosition(popsContainer);

        if (typeof this.items == "function") {
            let r = this.items();
            if (r instanceof Promise) {
                r.then(items => {
                    if (!this.closed) this.doShow(items)
                });
            } else if (Array.isArray(r)) {
                this.doShow(r)
            } else {
                throw "Items Function must return promise or array";
            }
        } else if (Array.isArray(this.items)) {
            this.doShow(this.items);
        } else throw "Items must be a function or array";
        ZPop.addActive(this);
        return this;
    }

    adjustPosition(popsContainer) {
        let ref = $(this.reference);
        let off = ref.offset();
        let left, top;
        if (this.options.hPos == "left") {
            left = off.left - this.pop.width();
        } else if (this.options.hPos == "right") {
            left = off.left + ref.width();
        } else if (this.options.hPos == "justify-left") {
            left = off.left;
        } else if (this.options.hPos == "justify-right") {
            left = off.left + ref.width() - this.pop.width();
        } else throw "Invalid hPos (left|right|justify-left|justify-right)";
        if (this.options.vPos == "bottom") {
            top = off.top + ref.height();
        } else if (this.options.vPos == "top") {
            top = off.top - this.pop.height();
        } else if (this.options.vPos == "justify-top") {
            top = off.top;
        } else if (this.options.vPos == "justify-bottom") {
            top = off.top + ref.height() - this.pop.height();
        }
        left += this.options.hMargin;
        top += this.options.vMargin;

        if (top + this.pop.height() > popsContainer.height()) top -= ((top + this.pop.height()) - popsContainer.height() + 10); 
        if (left + this.pop.width() > popsContainer.width()) left -= ((left + this.pop.width()) - popsContainer.width() + 10); 
        this.pop.css({left:left + "px", top:top + "px"});
    }

    close() {
        if (this.subPop) {
            this.subPop.close();
            this.subPop = null;
        }
        this.pop.remove();
        ZPop.removeActive(this);
        this.cancelSearch();
        this.closed = true;    
        if (this.options.onClose) this.options.onClose();    
    }
    
    isImage(icon) {
        let p = icon.lastIndexOf(".");
        if (p <= 0) return false;
        let ext = icon.substr(p+1).toLowerCase();
        return ",svg,png,jpg,jpeg,ico,".indexOf(ext) > 0;
    }
    getIconHTML(item) {
        let float = this.options.subItemsAt == "right"?"float-left":"float-right";
        let html = "<div class='zpop-item-icon " + float + "'>";
        if (!item.icon) {
            html += "<span></span>";
        } else if (this.isImage(item.icon)) {
            let iconInvert = item.iconInvert?" zpop-item-icon-invert":"";
            html += "<img src='" + item.icon + "' class='" + iconInvert + "' />";
        } else {
            html += "<i class='" + item.icon + "'></i>"
        }
        html += "</div>";
        return html;
    }
    getLabelHTML(item) {        
        return "<div class='zpop-item-label'" + (this.options.subItemsAt == "left"?" style='text-align:right;'":"") + ">" + item.label + "</div>";
    }
    paintItems(items) {
        let html = "<div class='zpop-items-container'>";
        items.forEach(item => {
            if (item.code == "sep") {
                html += "<hr class='zpop-divider my-1' />";
            } else {
                html += "<div class='zpop-item-container' data-code='" + item.code + "'>";
                if (this.options.subItemsAt == "right") {
                    html += this.getIconHTML(item);
                    html += this.getLabelHTML(item);
                    if (item.items) {
                        html += "<i class='fas fa-caret-right float-right ml-2 mt-1'></i>";
                    }
                } else {
                    if (item.items) {
                        html += "<i class='fas fa-caret-left float-left mr-2 mt-1'></i>";
                    }
                    html += this.getLabelHTML(item);
                    html += this.getIconHTML(item);
                }
                html += "</div>";
            }
        });
        html += "</div>";
        this.pop.find("#sub-items").html(html);
        this.pop.find("#sub-items").find(".zpop-item-container").mouseenter(e => {
            this.pop.find("#sub-items").find(".zpop-item-container").removeClass("zpop-item-active");
            $(e.currentTarget).addClass("zpop-item-active");
            let code = $(e.currentTarget).data("code"); 
            if (this.subPop) {
                this.subPop.close();
                this.subPop = null;
            }
            let item = this.expandedItems.find(i => i.code == code);
            if (!item) return;
            if (item.items) {
                if (this.subPop) {
                    this.subPop.close();
                    this.subPop = null;
                }
                let hPos = this.options.subItemsAt == "right"?"right":"left";
                let vPos = "justify-top";
                this.subPop = new ZPop($(e.currentTarget), item.items, {
                    hPos:hPos, hMargin:this.options.subHMargin, vPos:vPos, vMargin:this.options.subVMargin,
                    subItemsAt:this.options.subItemsAt,
                    subHMargin:this.options.subHMargin,
                    subVMargin:this.options.subVMargin,
                    onClick:(code, item) => {
                        if (this.options.onClick) {
                            let ret = this.options.onClick(code, item);
                            if (ret == true) this.close();
                        }
                    }
                })
                this.subPop.isSubProp = true;
                this.subPop.show();
            } else {
                if (this.options.onMouseEnter) {
                    this.options.onMouseEnter(code, item);
                }
            }
        });
        this.pop.find("#sub-items").find(".zpop-item-container").click(e => {
            let code = $(e.currentTarget).data("code");    
            let item;
            if (this.showingSearchResults) {
                item = this.foundItems.find(i => i.code == code);
            } else {     
                item = this.expandedItems.find(i => i.code == code);
            }
            if (!item.items) {
                if (this.options.onClick) this.options.onClick(code, item);
                this.close();
            } 
        });
    }
    doShow(items) {
        this.expandedItems = items;
        let html = "<div id='sub-items'></div>";
        if (this.options.onSearch) {
            html += "<hr class='zpop-divider' />";
            html += "<form class='form-inline zpop-search-container'>";            
            html += "<input type='text' placeholder='" + this.options.searchPlaceholder + "' class='form-control form-control-sm zpop-search' />";
            html += "<i class='fas fa-search fa-lg float-right zpop-search-icon searcher'></i>";
            html += "<i class='fas fa-times fa-lg float-right zpop-search-icon clearer' style='color:gray; cursor:pointer; display:none;'></i>";
            html += "</form>";
        }
        this.pop.html(html);
        this.paintItems(items);
        this.adjustPosition($("#pops-container"));
        let searchIcon = this.pop.find(".searcher");
        let clearIcon = this.pop.find(".clearer");
        clearIcon.click(_ => {
            this.pop.find("input").val("");
            this.cancelSearch();
            searchIcon.show();
            clearIcon.hide();
        })
        if (this.options.onSearch) {
            this.pop.find("input").keyup(e => {
                if (this.subPop) {
                    this.subPop.close();
                    this.subPop = null;
                }
                let txt = this.pop.find("input").val();
                if (txt) {
                    searchIcon.hide();
                    clearIcon.show();
                    this.schedulleSearch();
                } else {
                    searchIcon.show();
                    clearIcon.hide();
                    this.cancelSearch();
                }
            });
        }
    }
    schedulleSearch() {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(_ => {
            this.searchCancelled = false;
            this.searchTimer = null;
            this.doSearch()
        }, 300);
    }
    cancelSearch() {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = null;
        if (this.showingSearchResults) {
            this.paintItems(this.expandedItems);
            this.showingSearchResults = false;
        }
        this.searchCancelled = true;
    }
    doSearch() {
        this.pop.find("#sub-items").html("<i class='fas fa-spin fa-spinner fa-lg m-2'></i>");
        let txt = this.pop.find("input").val();
        let r = this.options.onSearch(txt);
        if (r instanceof Promise) {
            r.then(items => {
                if (this.searchCancelled) return;
                this.foundItems = items;
                this.paintItems(items);
                this.showingSearchResults = true;
            })
        } else {
            this.foundItems = r;
            this.paintItems(r);
            this.showingSearchResults = true;
        }
    }
}