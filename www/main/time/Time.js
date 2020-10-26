const pixelsPerHour = 7;

class Time extends ZCustomController {
    onThis_init() {
        this.slider.hideSigns();
        this.slider.setBgLight()
        this.slider.setHandlerFixedClass("text-primary");
        this.t0 = null;
        this.doResize();
    }

    onSlider_changing(v) {
        let t = moment.tz(this.t0.valueOf() + v / pixelsPerHour * 60 * 60 * 1000, window.timeZone);
        console.log("t", this.t0.format("DD/MM HH:mm"), t.format("DD/MM HH:mm"));
        window.geoos.time = t.valueOf();
    }

    get t1() {return this.t0?this.t0.clone().add(this.slider.pixelsRange / pixelsPerHour, "hours").startOf("day"):null}

    adjustTime() {
        this.t0 = moment.tz(window.geoos.time, window.timeZone).startOf("day").subtract(1, "day");
        console.log("t0 ajustado", this.t0.format("DD/MM HH:mm"))
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
        let html = "", x = this.slider.x0 + 10;
        for (let t=this.t0.clone(); t.isBefore(this.t1); t.add(1, "day")) {
            let firstDay = !html;
            let tNext = t.clone().add(1, "day")
            let w = (tNext.valueOf() - t.valueOf()) / 1000 / 60 / 60 * pixelsPerHour;
            html += `<div class="day-cell ${firstDay?"first-day-cell":""}" style="left: ${x}px; width: ${w}px;">${t.format("dddd DD")}</div>`;
            x += w;
        }
        this.daysTable.html = html;
    }
}
ZVC.export(Time)