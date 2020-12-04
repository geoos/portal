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
        window.geoos.events.on("portal", "timeChange", _ => {
            /*
            this.doResize();
            this.slider.value = (window.geoos.time - this.t0.valueOf()) * pixelsPerHour / (60*60*1000);
            */
            this.refreshTime();
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

    adjustTime() {
        this.t0 = moment.tz(window.geoos.time, window.timeZone).startOf("day").subtract(1, "day");
        let pixels = parseInt((window.geoos.time - this.t0.valueOf()) / 1000 / 60 / 60) * pixelsPerHour;
        this.slider.value = pixels;
    }
    
    doResize(size) {
        this.slider.setRange(0, this.slider.pixelsRange, 1);        
        let gt = moment.tz(window.geoos.time, window.timeZone);
        if (!this.t0 || !gt.isBetween(this.t0, this.t1)) this.adjustTime();
        let bot = 0;
        if (window.geoos.analysisPanel && window.geoos.analysisPanel.open) {
            if (window.geoos.analysisPanel.status == "min") {
                this.daysBar.show();
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
            this.daysBar.show();
        }
        this.cntCol1.view.style.bottom = (78 + bot) + "px";
        this.timePickerContainer.view.style.bottom = (110 + bot) + "px";
        this.cntCol2.view.style.bottom = (78 + bot) + "px";
        this.cntCol3.view.style.bottom = (78 + bot) + "px";
        this.daysBar.view.style.bottom = (10 + bot) + "px";
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
    onLblDate_click() {this.toggleDate()}
    onCmdCalendar_click() {this.toggleDate()}

    toggleTime() {
        if (this.showingTime) this.timePickerContainer.hide();
        else this.timePickerContainer.show();
        this.showingTime = !this.showingTime;
    }
    onTimePicker_change(d) {
        this.datePicker.value = d.clone().startOf("day");
        this.callSetTime(d.valueOf(), true, true, false);
    }
    onLblTime_click() {this.toggleTime()}
    onCmdCclock_click() {this.toggleTime()}

    onCmdNextDay_click() {window.geoos.moment = window.geoos.moment.add(1, "day")}
    onCmdPrevDay_click() {window.geoos.moment = window.geoos.moment.subtract(1, "day")}
    onCmdNextTime_click() {window.geoos.moment = window.geoos.moment.add(15, "minutes")}
    onCmdPrevTime_click() {window.geoos.moment = window.geoos.moment.subtract(15, "minutes")}
}
ZVC.export(Time)