class ZBootstrapTable extends ZController {
    onThis_init() {
        this.selectedRowClass = this.getAttribute("data-z-selected-row-class");
        this.isSelectable = this.selectedRowClass?true:false;
        this.hiddenColumns = {}; // index:true
        this.paginator = null;
        this.pagination = "none";
        this.nPages = 5;
        this.nRowsPerPage = 10;
        let paginationId = this.getAttribute("data-z-pagination");
        if (paginationId) {
            let searchNode = this.view.parentNode;
            while(searchNode && !this.paginator) {
                this.paginator = searchNode.querySelector(paginationId);
                searchNode = searchNode.parentNode;
            }            
            if (!this.paginator) throw "Cannot find pagination component '" + paginationId + "'";
            this.pagination = this.paginator.getAttribute("data-z-pagination");
            if (this.pagination != "local" && this.pagination != "server") throw "Pagination must be 'local' or 'server'";
            if (this.paginator.getAttribute("data-z-n-pages")) this.nPages = parseInt(this.paginator.getAttribute("data-z-n-pages"));
            if (this.paginator.getAttribute("data-z-rows-per-page")) this.nRowsPerPage = parseInt(this.paginator.getAttribute("data-z-rows-per-page"));
        }
        this.rowsInfo = null;
        let rowsInfoId = this.getAttribute("data-z-rows-info");
        if (rowsInfoId) {
            let searchNode = this.view.parentNode;
            while(searchNode && !this.paginaror) {
                this.rowsInfo = searchNode.querySelector(rowsInfoId);
                searchNode = searchNode.parentNode;
            }            
            if (!this.rowsInfo) throw "Cannot find rowsInfo component '" + rowsInfoId + "'";
        }

        this.columns = [];
        this.findAll("th").forEach(th => {
            this.columns.push({
                field:th.getAttribute("data-z-field"), 
                detailsToggler:th.getAttribute("data-z-details-toggler")?true:false,
                cellClass:th.getAttribute("data-z-cell-class"),
                clickable:th.getAttribute("data-z-clickable") == "true"?true:false
            });
        });
        this.hasDetailsToggler = this.columns.findIndex(c => c.detailsToggler) >= 0;
        this.detailsTogglerOpenIcon = "fas fa-edit" || this.getAttribute("data-z-details-toggler-open-icon");
        this.detailsTogglerCloseIcon = "fas fa-caret-up" || this.getAttribute("data-z-details-toggler-close-icon");
        this.rowClass = this.getAttribute("data-z-row-class") || "";
        this.cellClass = this.getAttribute("data-z-cell-class") || "";
        this.detailsTogglerCellClass = this.getAttribute("data-z-details-toggler-cell-class") || "";
        this.detailsCellClass = this.getAttribute("data-z-details-cell-class") || "";

        this.selectedRowIndex = -1;
        this.startPage = -1;
        this.selectedPage = -1;
        this.rows = [];
        this.totalRows = 0;
        this.totalPages = 0;
        this.detailsPanels = {}; // id:controller
        this.newDetailsController = null;
    }
    async onThis_deactivated() {
        await this.closeAllDetails();
    }
    async processEvent(control, eventName, args=[]) {
        if (this.detailsPanels) {
            let found = -1;        
            Object.keys(this.detailsPanels).forEach(idx => {
                if (control == this.detailsPanels[idx]) found = idx;
            })
            if (found >= 0) {
                let newArgs = [this.rows[found], found].concat(args);
                return await this.triggerEvent(eventName, ...newArgs);
            }
        }
        if (control == this.newDetailsController) {
            let newArgs = [null, -1].concat(args);
            return await this.triggerEvent(eventName, ...newArgs);
        }
        super.processEvent(control, eventName, args);
    }
    async refresh(rowSelector) {
        await this.closeAllDetails();     
        this.rows = [];
        if (this.pagination == "none" || this.pagination == "local") {
            this.rows = await this.triggerEvent("getRows");
            if (!this.rows) {
                this.rows = [];
                throw "No rows returned to list in getRows event";
            }
            this.totalRows = this.rows.length;
            if (this.pagination == "local") {                
                this.recalcPagination(); 
            }
            this.repaint();
            if (rowSelector) {
                let idx = this.rows.findIndex(r => rowSelector(r));
                if (idx >= 0) this.selectRowIndex(idx);
                else this.selectRowIndex(-1);
            } else {
                this.selectRowIndex(-1);
            }
        } else {
            this.selectedRowIndex = -1;
            this.totalRows = await this.triggerEvent("getRowsCount");
            if (this.totalRows === undefined || isNaN(this.totalRows)) {
                this.totalRows = 0;
                throw "No number returned to list in getRowsCount event";
            }
            this.recalcPagination();
            if (!this.totalRows) this.repaint();
            else this.loadPage();
        }
    }

    recalcPagination() {
        this.totalPages = this.totalRows / this.nRowsPerPage;
        if (this.totalPages != parseInt(this.totalPages)) this.totalPages = parseInt(this.totalPages) + 1;
        if (this.selectedPage < 1) this.selectedPage = 1;
        if (this.selectedPage > this.totalPages) this.selectedPage = this.totalPages;
        this.startPage = 1 + parseInt((this.selectedPage - 1) / this.nPages) * this.nPages;
    }

    async loadPage() {
        this.rows = await this.triggerEvent("getRowsPage", this.nRowsPerPage * (this.selectedPage - 1), this.nRowsPerPage);
        if (!this.rows) {
            this.rows = [];
            throw "No rows returned to list in getRows event";
        }
        this.repaint();
    }

    repaint() {
        let {startRow, endRow} = this.getVisibleRowsRange();
        let html = "";
        for (let i=startRow; i<endRow; i++) {
            let row = this.rows[i];
            html += this.getRowHTML(row, i);
        }
        this.find("tbody").innerHTML = html;
        if (this.pagination != "none") {
            let html = this.getPaginatorHTML();
            this.paginator.innerHTML = html;
        }
        this.registerEventListeners();
        if (this.rowsInfo) {
            if (!this.totalRows) {
                this.rowsInfo.textContent = "No rows found";    
            } else {
                if (this.totalRows == 1) this.rowsInfo.textContent = "One row found"
                else {
                    if (this.pagination != "none") {
                        this.rowsInfo.textContent = "Rows " + (startRow + 1) + " to " + endRow + " from " + this.totalRows;
                    } else {
                        this.rowsInfo.textContent = "" + this.totalRows + " rows found";
                    }
                }
            }
        }
    }

    getVisibleRowsRange() {
        if (this.pagination == "none" || this.pagination == "server") {
            return {startRow:0, endRow:this.rows.length};
        } else if (this.pagination == "local") {
            let r0 = this.nRowsPerPage * (this.selectedPage - 1);
            if (r0 < 0) r0 = 0;
            let r1 = r0 + this.nRowsPerPage;
            if (r1 > this.rows.length) r1 = this.rows.length;
            return {startRow:r0, endRow:r1}
        }
    }

    getRowHTML(row, rowIndex) {
        let rowClass = this.rowClass;
        if (row._rowClass) rowClass += " " + row._rowClass;
        if (rowIndex == this.selectedRowIndex) rowClass += " " + this.selectedRowClass;
        let html = "<tr class='" + rowClass + "' data-row='" + rowIndex + "'>";
        html += this.getRowContentHTML(row, rowIndex);
        html += "</tr>";
        return html;
    }
    getRowElement(row, rowIndex) {
        let e = document.createElement("TR");
        if (this.rowClass) {
            this.rowClass.split(" ").forEach(c => e.classList.add(c));
        }
        if (row._rowClass) {
            row._rowClass.split(" ").forEach(c => e.classList.add(c));
        }
        if (rowIndex == this.selectedRowIndex) e.classList.add(this.selectedRowClass);
        e.setAttribute("data-row", rowIndex);
        e.innerHTML = this.getRowContentHTML(row, rowIndex);
        return e;
    }
    getRowContentHTML(row, rowIndex) {
        let html = "";
        for (let j=0; j<this.columns.length; j++) {
            let col = this.columns[j];                
            if (col.detailsToggler) {
                let cellClass = this.detailsTogglerCellClass;
                if (row.detailsToggler_cellClass) cellClass += " " + row.detailsToggler_cellClass;
                html += "<td class='details-toggler " + cellClass + "' style='cursor:pointer;" + (this.hiddenColumns[j]?"display:none;":"") + "'>";
                if (this.detailsPanels[rowIndex]) {
                    html += "  <i class='" + this.detailsTogglerCloseIcon + "'></i>";
                } else {
                    html += "  <i class='" + this.detailsTogglerOpenIcon + "'></i>";
                }
                html += "</td>";
            } else {
                let cellClass = this.cellClass;
                if (col.cellClass) cellClass += " " + col.cellClass;
                if (row[col.field + "_cellClass"]) cellClass += " " + row[col.field + "_cellClass"];
                html += "<td class='" + cellClass + "' style='" + (this.hiddenColumns[j]?"display:none;":"") + "'>";
                if (col.clickable) html += "<a href='#' class='clickable-cell' data-row='" + rowIndex + "' data-field='" + col.field + "'>";
                html += row[col.field];
                if (col.clickable) html += "</a>";
                html += "</td>";
            }
        }
        return html;
    }

    getPaginatorHTML() {
        let canPrevious = this.startPage > 1;
        let canNext = (this.startPage + this.nPages - 1) < this.totalPages;
        let html = `
            <li class='page-item${!canPrevious?" disabled":""}'>
                <a class='pag-previous page-link' href='#' tabindex='-1'>
                    <i class='fa fa-angle-left'></i>
                </a>
            </li>`;
        let n = 0;
        while ((this.startPage + n) <= this.totalPages && n < this.nPages) {
            let active = this.startPage + n == this.selectedPage;
            html += `
                <li class='page-item${active?" active":""}'>
                    <a class='pag-page page-link' href='#' data-page='${(this.startPage + n)}'>${(this.startPage + n)}</a>
                </li>`;
            n++;
        }
        html += `
            <li class='page-item${!canNext?" disabled":""}'>
                <a class='pag-next page-link' href='#' tabindex='-1'>
                    <i class='fa fa-angle-right'></i>
                </a>
            </li>`;
        return html;
    }

    registerEventListeners() {
        if (this.isSelectable) {
            this.findAll("tr").forEach(tr => {
                let idx = parseInt(tr.getAttribute("data-row"));
                if (!isNaN(idx)) {
                    tr.onclick = _ => this.selectRowIndex(idx);
                }
            })
        }
        this.findAll(".clickable-cell").forEach(cell => {
            cell.onclick = e => {
                let idx = parseInt(cell.getAttribute("data-row"));
                let field = cell.getAttribute("data-field");
                this.triggerEvent("cellClick", this.rows[idx], idx, field);
                e.preventDefault();
            }
        })
        if (this.hasDetailsToggler) {
            this.findAll(".details-toggler").forEach(td => {
                let tr = td.parentNode;
                let idx = parseInt(tr.getAttribute("data-row"));
                if (!isNaN(idx)) {
                    td.onclick = _ => this.toggleDetails(idx);
                }
            })
        }
        if (this.pagination != "none") {
            this.paginator.querySelector(".pag-previous").onclick = e => {this.pagPrevious(); e.preventDefault();}
            this.paginator.querySelector(".pag-next").onclick = e => {this.pagNext(); e.preventDefault();}
            this.paginator.querySelectorAll(".pag-page").forEach(e => {
                e.onclick = evt => {
                    let page = parseInt(e.getAttribute("data-page"));
                    this.pagPage(page);
                    evt.preventDefault();
                }
            })
        }
    }

    async pagPrevious() {
        await this.closeAllDetails();
        let triggerChange = this.isSelectable && this.selectedRowIndex >= 0;
        this.selectedRowIndex = -1;
        if (this.pagination == "local") {
            this.selectedPage -= this.nPages;
            this.startPage -= this.nPages;
            this.recalcPagination();
            this.repaint();
            if (triggerChange) this.triggerEvent("change", null, -1);
        } else if (this.pagination == "server") {
            this.selectedPage -= this.nPages;
            this.startPage -= this.nPages;
            this.recalcPagination();
            await this.loadPage();
            this.repaint();
            if (triggerChange) this.triggerEvent("change", null, -1);
        }
    }
    async pagNext() {
        await this.closeAllDetails();
        let triggerChange = this.isSelectable && this.selectedRowIndex >= 0;
        this.selectedRowIndex = -1;
        if (this.pagination == "local") {
            this.selectedPage += this.nPages;
            this.startPage += this.nPages;
            this.recalcPagination();
            this.repaint();
            if (triggerChange) this.triggerEvent("change", null, -1);
        } else if (this.pagination == "server") {
            this.selectedPage += this.nPages;
            this.startPage += this.nPages;
            this.recalcPagination();
            await this.loadPage();
            this.repaint();
            if (triggerChange) this.triggerEvent("change", null, -1);
        }
    }
    async pagPage(page) {
        await this.closeAllDetails();
        let triggerChange = this.isSelectable && this.selectedRowIndex >= 0;
        this.selectedRowIndex = -1;
        if (this.pagination == "local") {
            this.selectedPage = page;
            this.recalcPagination();
            this.repaint();
            if (triggerChange) this.triggerEvent("change", null, -1);
        } else if (this.pagination == "server") {
            this.selectedPage = page;
            this.recalcPagination();
            await this.loadPage();
            this.repaint();
            if (triggerChange) this.triggerEvent("change", null, -1);
        }
    }

    selectRowIndex(idx) {
        let oldSelectedRowIndex = this.selectedRowIndex;
        if (this.selectedRowIndex >= 0) {
            let oldSelected = this.find("tr[data-row='" + this.selectedRowIndex + "']");
            if (oldSelected) oldSelected.classList.remove(this.selectedRowClass);
        }
        this.selectedRowIndex = idx;
        if (idx >= 0) {
            let newSelected = this.find("tr[data-row='" + this.selectedRowIndex + "']");
            if (newSelected) newSelected.classList.add(this.selectedRowClass);
        }
        if (oldSelectedRowIndex != this.selectedRowIndex) {
            this.triggerEvent("change", this.rows[this.selectedRowIndex], this.selectedRowIndex);
        }
    }
    getSelectedRow() {
        if (this.selectedRowIndex < 0) return null;
        return this.rows[this.selectedRowIndex];
    }
    async toggleDetails(idx) {
        if (this.detailsPanels[idx]) {
            await this.closeDetails(idx);
        } else {
            await this.openDetails(idx);
        }
    }
    closeAllDetails() {
        return new Promise(resolve => {
            let promises = [];
            let keys = Object.keys(this.detailsPanels);
            for (let i=0; i<keys.length; i++) {
                promises.push(this.closeDetails(keys[i]));
            }
            if (this.newDetailsController) {
                promises.push(this.closeNewDetails());
            }
            Promise.all(promises).then(_ => resolve());
        });
    }
    closeDetails(idx) {
        if (idx == -1) {
            return this.closeNewDetails(); // Promise
        }
        return new Promise(async (resolve, reject) => {
            let controller = this.detailsPanels[idx];
            await controller.processEvent(controller, "deactivated", []);
            let tr = this.find("tr[data-row='" + idx + "']");
            let detailsRow = tr.nextSibling;
            let detailsDiv = detailsRow.firstChild.firstChild;
            let detailsHeight = detailsDiv.offsetHeight;
            detailsDiv.style["margin-top"] = (-detailsHeight) + "px";
            delete this.detailsPanels[idx];
            setTimeout(_ => {
                if (detailsRow.parentNode) {
                    detailsRow.parentNode.removeChild(detailsRow);
                }
                let togglerIcon = tr.querySelector(".details-toggler");
                togglerIcon.innerHTML = "  <i class='" + this.detailsTogglerOpenIcon + "'></i>";
                resolve();
            }, 300);
        })        
    }
    openDetails(idx) {
        return new Promise(async (resolve, reject) => {
            let spec = await this.triggerEvent("getDetailsConfig", this.rows[idx], idx);
            if (!spec) {
                reject("No '{panelPath, options}' returned from 'getDetailsPanelConfig' event");
                return;
            }
            let {path, options} = spec;
            let tr = this.find("tr[data-row='" + idx + "']");
            let newRow = document.createElement("TR");
            newRow.innerHTML = "<td colspan='" + (this.columns.length) + "' class='details-cell " + (this.detailsCellClass?this.detailsCellClass:"") + "' style='overflow:hidden;'><div></div></td>";
            tr.parentNode.insertBefore(newRow, tr.nextSibling);
            let td = newRow.firstChild;
            let detailsDiv = td.firstChild;
            let controller = await ZVC.loadComponent(detailsDiv, this, path);
            let detailsHeight = controller.view.offsetHeight;
            detailsDiv.style["margin-top"] = (-detailsHeight) + "px";
            await controller.init(options);
            this.detailsPanels[idx] = controller;
            await controller.activate();
            requestAnimationFrame(_ => {
                detailsDiv.style.transition = "margin-top 0.3s ease-in";
                detailsDiv.style["margin-top"] = "0";
                setTimeout(_ => {
                    resolve(controller);
                }, 300);
            })
            let togglerIcon = tr.querySelector(".details-toggler");
            togglerIcon.innerHTML = "  <i class='" + this.detailsTogglerCloseIcon + "'></i>";
        });
    }
    openNewDetails(path, rowHTML, panelOptions) {
        return new Promise(async (resolve, reject) => {
            if (this.newDetailsController) {
                await this.closeNewDetails();
            }
            let tbody = this.find("TBODY");
            let firstTr = tbody.firstChild;
            let headerTr = document.createElement("TR");
            headerTr.classList.add("new-details-header-row");
            headerTr.innerHTML = "<td colspan='" + this.columns.length + "'>" + rowHTML  +"</td>";
            let contentTr = document.createElement("TR");
            contentTr.classList.add("new-details-content-row");
            contentTr.innerHTML = "<td class='details-cell' colspan='" + this.columns.length + "' style='overflow-y:hidden;'><div></div></td>";
            let contentTd = contentTr.firstChild;
            if (this.detailsCellClass) contentTd.classList.add(this.detailsCellClass);
            let detailsDiv = contentTd.firstChild;
            tbody.insertBefore(contentTr, firstTr);
            tbody.insertBefore(headerTr, contentTr);
            let controller = await ZVC.loadComponent(detailsDiv, this, path);
            let detailsHeight = controller.view.offsetHeight;
            detailsDiv.style["margin-top"] = (-detailsHeight) + "px";            
            await controller.init(panelOptions);
            await controller.activate();
            this.newDetailsController = controller;
            requestAnimationFrame(_ => {
                detailsDiv.style.transition = "margin-top 0.25s";
                detailsDiv.style["margin-top"] = "0";
                setTimeout(_ => {
                    resolve(controller);
                }, 300);
            });
        });        
    }
    closeNewDetails() {
        return new Promise(async (resolve, reject) => {
            await this.newDetailsController.processEvent(this.newDetailsController, "deactivated", []);
            this.newDetailsController = null;        
            let trNewDetailsHeader = this.find(".new-details-header-row");
            let trNewDetailsContent = this.find(".new-details-content-row");
            let detailsDiv = trNewDetailsContent.firstChild.firstChild;
            let detailsHeight = detailsDiv.offsetHeight;
            detailsDiv.style["margin-top"] = (-detailsHeight) + "px";
            setTimeout(_ => {
                trNewDetailsContent.parentNode.removeChild(trNewDetailsContent);
                trNewDetailsHeader.parentNode.removeChild(trNewDetailsHeader);
                resolve();
            }, 300);
        });
    }
    updateRow(idx, row) {
        this.rows[idx] = row;
        let oldTr = this.find("tr[data-row='" + idx + "']");
        let nextTr = oldTr.nextSibling;        
        let newRow = this.getRowElement(row, idx);
        if (this.selectedRowIndex == idx) newRow.classList.add(this.selectedRowClass);
        let tableBody = oldTr.parentNode;
        tableBody.removeChild(oldTr);
        tableBody.insertBefore(newRow, nextTr);
        this.registerEventListeners();
    }
    async deleteRow(idx) {
        if (this.detailsPanels[idx]) {
            await this.closeDetails(idx);
        }
        this.rows.splice(idx, 1);
        this.totalRows --;
        // Correct open details
        let newDetailsPanels = {};
        Object.keys(this.detailsPanels).forEach(openIdx => {
            if (openIdx < idx) {
                newDetailsPanels[idx] = this.detailsPanels[idx];
            } else {
                newDetailsPanels[idx - 1] = this.detailsPanels[idx];
            }
        });
        // Check selection
        let selectionChanged = this.isSelectable && this.selectedRowIndex >= 0;
        this.selectedRowIndex = -1;
        if (this.pagination != "none") {
            this.recalcPagination();
            if (this.pagination == "server") {
                await this.loadPage();
            }
        }
        this.repaint();
        if (selectionChanged) {
            await this.triggerEvent("change", null, -1);
        }
    }

    hideColumn(idx) {
        this.hiddenColumns[idx] = true;
        this.view.querySelectorAll("th")[idx].style.display = "none";
        this.view.querySelectorAll("tr").forEach(tr => {
            let tds = tr.querySelectorAll("td");
            if (tds.length) tds[idx].style.display = "none";
        })
    }
    showColumn(idx) {
        delete this.hiddenColumns[idx];
        delete this.view.querySelectorAll("th")[idx].style.removeProperty("display");
        this.view.querySelectorAll("tr").forEach(tr => {
            let tds = tr.querySelectorAll("td");
            if (tds.length) delete tds[idx].style.removeProperty("display");
        })
    }
}
ZVC.registerComponent("TABLE", _ => (true), ZBootstrapTable);