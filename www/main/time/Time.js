const pixelsPerHour = 7;

class Time extends ZCustomController {
    onThis_init() {
        this.slider.hideSigns();
        this.slider.setBgLight()
        this.slider.setHandlerFixedClass("text-primary");
        this.t0 = null;
        this.showingDate = false;
        this.datePicker.hide();
        this.updatePickers();
        this.doResize();
    }

    onSlider_changing(v) {
        let t = moment.tz(this.t0.valueOf() + v / pixelsPerHour * 60 * 60 * 1000, window.timeZone);
        this.callSetTime(t.valueOf());
    }
    onSlider_change(v) {
        let t = moment.tz(this.t0.valueOf() + v / pixelsPerHour * 60 * 60 * 1000, window.timeZone);
        this.callSetTime(t.valueOf());
    }

    callSetTime(t) {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(_ => {
            this.timer = null;
            if (t != window.geoos.time) window.geoos.time = t;
            this.updatePickers();
        }, 100);
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
        this.repaint();
    }
    repaint() {
        let html = ""; //, x = this.slider.x0 + 10;
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

    updatePickers() {
        let m = moment.tz(window.geoos.time, window.timeZone);
        this.datePicker.value = m.clone().startOf("day");
        this.lblDate.text = m.format("dddd DD/MMMM");
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
        console.log("change", d);
        let m = d.clone();
        let g = moment.tz(window.geoos.time, window.timeZone);
        m.hours(g.hours()); m.minutes(g.minutes()); m = m.startOf("minute");
        window.geoos.time = m.valueOf();
        this.updatePickers();
        this.toggleDate();
    }
    onLblDate_click() {this.toggleDate()}
    onCmdCalendar_click() {this.toggleDate()}
}
ZVC.export(Time)