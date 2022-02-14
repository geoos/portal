const pixelsPerHour = 7;

class Time extends ZCustomController {
    onThis_init() {
        window.geoos.timePanel = this;
        this.slider.hideSigns();
        this.slider.setBgLight()
        this.slider.setHandlerFixedClass("text-primary");
        this.t0 = null;
        this.showingDate = false;
        this.datePicker.hide();
        this.showingTime = false;
        this.timePickerContainer.hide();
        this.updateLabels();
        this.updatePickers();
        this.doResize();
        this.edTimeSelector.setRows([{id:"basic", label:"Selector Tiempo: BÁSICO"}, {id:"layer", label:"Selector Tiempo: CAPA"}])
        let days = [];
        for (let i=0; i<31; i++) {
            days.push({id:i, label:(i<10?"0":"") + i})
        }
        this.edSelDays.setRows(days, 0);
        let hours = [];
        for (let i=0; i<25; i++) {
            hours.push({id:i, label:(i<10?"0":"") + i})
        }
        this.edSelHours.setRows(hours, 3);
        let minutes = [];
        for (let i=0; i<60; i++) {
            minutes.push({id:i, label:(i<10?"0":"") + i})
        }
        this.edSelMinutes.setRows(minutes, 0);
        window.geoos.events.on("portal", "timeChange", _ => {
            /*
            this.doResize();
            this.slider.value = (window.geoos.time - this.t0.valueOf()) * pixelsPerHour / (60*60*1000);
            */
            this.refreshTime();
        });
        this.cntSubSelector.hide();

        // Esconder date & time on click outside
        window.addEventListener('click', e => {
            if (this.ignoreNextClick) {
                this.ignoreNextClick = false;
                return;
            }
            if (this.showingDate) {
                if (!this.datePicker.view.contains(e.target)) this.toggleDate();
            }   
            if (this.showingTime) {
                if (!this.timePicker.view.contains(e.target)) this.toggleTime();
            }
        });
    }

    onSlider_changing(v) {
        let t = moment.tz(this.t0.valueOf() + v / pixelsPerHour * 60 * 60 * 1000, window.timeZone);
        this.callSetTime(t.valueOf());
    }
    onSlider_change(v) {
        let t = moment.tz(this.t0.valueOf() + v / pixelsPerHour * 60 * 60 * 1000, window.timeZone);
        this.callSetTime(t.valueOf());
    }

    refreshTime() {
        this.doResize();
        this.slider.value = (window.geoos.time - this.t0.valueOf()) * pixelsPerHour / (60*60*1000);
        this.updateLabels();
        this.updateDatePicker();
        this.updateTimePicker();
        this.repaint();
    }

    callSetTime(t, labels=true, datePicker=true, timePicker=true) {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(_ => {
            this.timer = null;
            if (t != window.geoos.time) window.geoos.time = t;
            if (labels) this.updateLabels();
            if (datePicker) this.updateDatePicker();
            if (timePicker) this.updateTimePicker();
        }, 150);
    }

    get t1() {return this.t0?this.t0.clone().add(this.slider.pixelsRange / pixelsPerHour, "hours").startOf("day"):null}

    callAdjustTime() {
        setTimeout(_ => this.adjustTime(), 300);
    }
    adjustTime() {
        this.t0 = moment.tz(window.geoos.time, window.timeZone).startOf("day").subtract(1, "day");
        let pixels = parseInt((window.geoos.time - this.t0.valueOf()) / 1000 / 60 / 60) * pixelsPerHour;
        this.slider.value = pixels;
    }
    
    doResize(size) {
        // Center
        this.cntColCenter.view.style.left = (window.geoos.size.width / 2 - this.cntColCenter.size.width / 2) + "px"

        this.slider.setRange(0, this.slider.pixelsRange, 1);        
        let gt = moment.tz(window.geoos.time, window.timeZone);
        if (!this.t0 || !gt.isBetween(this.t0, this.t1)) this.adjustTime();
        let bot = 0;
        if (window.geoos.analysisPanel && window.geoos.analysisPanel.open) {
            if (window.geoos.analysisPanel.status == "min") {
                let wasVisible = $(this.daysBar.view).is(":visible");
                this.daysBar.show();
                if (!wasVisible) this.callAdjustTime();
                bot = 25;    
            } else if (window.geoos.analysisPanel.status == "normal") {
                this.daysBar.hide();
                bot = -80 + window.geoos.analysisPanel.getPanelHeight()
            } else {
                this.daysBar.hide();
                let size = window.geoos.size;
                let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
                let height = size.height - (topMenuRect.top + topMenuRect.height);
                bot = height - 95;
            }
        } else {
            let wasVisible = $(this.daysBar.view).is(":visible");
            this.daysBar.show();
            if (!wasVisible) this.callAdjustTime();
        }
        this.cntCol1.view.style.bottom = (78 + bot) + "px";
        this.timePickerContainer.view.style.bottom = (110 + bot) + "px";
        this.cntCol2.view.style.bottom = (78 + bot) + "px";
        this.cntCol3.view.style.bottom = (78 + bot) + "px";
        this.cntColCenter.view.style.bottom = (78 + bot) + "px";
        this.daysBar.view.style.bottom = (10 + bot) + "px";
        this.cntColRight.view.style.bottom = (78 + bot) + "px";
        this.cntSubSelector.view.style.bottom = (108 + bot) + "px";
        // Ajustar panel de fecha y de hora según posición de los selectores y estado de analisis
        let arriba = true;
        if (window.geoos.analysisPanel && window.geoos.analysisPanel.open && window.geoos.analysisPanel.status != "min") {
            arriba = false;
        }
        let y = $(window.geoos.timePanel.cntCol2.view).position().top;
        if (arriba) {
            $(window.geoos.timePanel.datePicker.view).css({top:(y - 200) + "px"})
            $(window.geoos.timePanel.timePickerContainer.view).css({top:(y - 200) + "px"})
        } else {
            $(window.geoos.timePanel.datePicker.view).css({top:(y + 34) + "px"})
            $(window.geoos.timePanel.timePickerContainer.view).css({top:(y + 34) + "px"})
        }
        this.repaint();
    }
    repaint() {
        let html = ""; 
        for (let t=this.t0.clone(); t.isBefore(this.t1); t.add(1, "day")) {
            let firstDay = !html;
            let tNext = t.clone().add(1, "day")            
            let w = (tNext.valueOf() - t.valueOf()) / 1000 / 60 / 60 * pixelsPerHour;
            let hours = parseInt(t.diff(this.t0) / 1000 / 60 / 60);
            let x = this.slider.x0 + 12 + pixelsPerHour * hours;
            html += `<div class="day-cell ${firstDay?"first-day-cell":""}" style="left: ${x}px; width: ${w}px;">${t.format("dddd DD")}</div>`;
        }
        this.daysTable.html = html;
    }

    updateLabels() {
        let m = moment.tz(window.geoos.time, window.timeZone);
        this.lblDate.text = m.format("dddd DD MMMM");
        this.lblTime.text = m.format("HH:mm");
    }

    updatePickers() {
        this.updateDatePicker();
        this.updateTimePicker();
    }

    updateDatePicker() {
        let m = moment.tz(window.geoos.time, window.timeZone);
        this.datePicker.value = m.clone().startOf("day");
    }
    updateTimePicker() {
        let m = moment.tz(window.geoos.time, window.timeZone);
        this.timePicker.value = m.clone();
    }

    onDaysTable_click(e) {
        let x = e.clientX - this.slider.x0 - 36;
        this.slider.value = x;
        this.callSetTime(moment.tz(this.t0.valueOf() + x / pixelsPerHour * 60 * 60 * 1000, window.timeZone).valueOf())
    }

    toggleDate() {
        if (this.showingDate) this.datePicker.hide();
        else this.datePicker.show();
        this.showingDate = !this.showingDate;
    }
    onDatePicker_change(d) {
        let m = d.clone();
        let g = moment.tz(window.geoos.time, window.timeZone);
        m.hours(g.hours()); m.minutes(g.minutes()); m = m.startOf("minute");
        this.callSetTime(m.valueOf(), true, false, true);
    }
    onLblDate_click() {
        this.ignoreNextClick = true;
        this.toggleDate()
    }
    onCmdCalendar_click() {
        this.ignoreNextClick = true;
        this.toggleDate()
    }

    toggleTime() {
        if (this.showingTime) this.timePickerContainer.hide();
        else this.timePickerContainer.show();
        this.showingTime = !this.showingTime;
    }
    onTimePicker_change(d) {
        this.datePicker.value = d.clone().startOf("day");
        this.callSetTime(d.valueOf(), true, true, false);
    }
    onLblTime_click() {
        this.ignoreNextClick = true;
        this.toggleTime()
    }
    onCmdClock_click() {
        this.ignoreNextClick = true;
        this.toggleTime()
    }

    onCmdNextDay_click() {window.geoos.moment = window.geoos.moment.add(1, "day")}
    onCmdPrevDay_click() {window.geoos.moment = window.geoos.moment.subtract(1, "day")}
    onCmdNextTime_click() {window.geoos.moment = window.geoos.moment.add(15, "minutes")}
    onCmdPrevTime_click() {window.geoos.moment = window.geoos.moment.subtract(15, "minutes")}

    onCmdLeftStep_click() {
        let days = parseInt(this.edSelDays.value);
        let hours = parseInt(this.edSelHours.value);
        let minutes = parseInt(this.edSelMinutes.value);
        let m = window.geoos.moment.subtract(days, "days");
        m = m.subtract(hours, "hours");
        m = m.subtract(minutes, "minutes");
        window.geoos.moment = m;
    }
    onCmdRightStep_click() {
        let days = parseInt(this.edSelDays.value);
        let hours = parseInt(this.edSelHours.value);
        let minutes = parseInt(this.edSelMinutes.value);
        let m = window.geoos.moment.add(days, "days");
        m = m.add(hours, "hours");
        m = m.add(minutes, "minutes");
        window.geoos.moment = m;
    }

    onEdTimeSelector_change() {
        if (this.edTimeSelector.value == "basic") {
            this.cntSubSelector.hide();
            return;
        }
        if (this.edTimeSelector.value == "layer") {
            this.cntSubSelector.show();
            this.refreshLayers();
            return;
        }
    }

    refreshLayers() {
        let rows = []

        window.geoos.getActiveGroup().layers.forEach(l => {
            console.log("layer", l);
            if (l instanceof GEOOSRasterLayer) {
                let t = l.dataSet.temporality, dd=0, hh=0, mm=0;
                if (t.unit == "days") dd = t.value;
                else if (t.unit == "hours") hh = t.value;
                else if (t.unit == "minutes") mm = t.value;
                rows.push({id:l.id, label:l.name, tempo:{dd, hh, mm}})                
            }
        })
        if (!rows.length) {
            this.cntSubSelector.hide();
            this.edTimeSelector.value = "basic";
            this.showDialog("common/WInfo", {subtitle:"No hay capas", message:"No ha agregado capas con temporalidad definida"});
            this.adjustTimeStepSelectors();
            return;
        }
        let v = this.edTimeSubSelector.value;
        this.edTimeSubSelector.setRows(rows, v);
        this.adjustTimeStepSelectors();
    }

    onEdTimeSubSelector_change() {
        this.adjustTimeStepSelectors()
    }

    adjustTimeStepSelectors() {
        if (this.edTimeSelector.value == "basic") {
            this.edSelDays.enable();
            this.edSelHours.enable();
            this.edSelMinutes.enable();
        } else if (this.edTimeSelector.value == "layer") {
            let l = this.edTimeSubSelector.selectedRow;
            this.edSelDays.value = l.tempo.dd;
            this.edSelDays.disable();
            this.edSelHours.value = l.tempo.hh;
            this.edSelHours.disable();
            this.edSelMinutes.value = l.tempo.mm;
            this.edSelMinutes.disable();
        }
    }
}
ZVC.export(Time)