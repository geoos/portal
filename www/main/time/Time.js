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

    onCmdCamera_click() {
        window.geoos.mapPanel.takePicture();
    }

    onCmdVideo_click() {
        let opener = $(this.find("#cmdVideo"));
        let z = new ZPop(opener, [{
            code:"start", icon:"fas fa-step-forward", label:"Fijar Tiempo de Inicio", 
        }, {
            code:"end", icon:"fas fa-step-backward", label:"Fijar Tiempo de Término", 
        }, {
            code:"sep", icon:"-", label:"-", 
        }, {
            code:"animate", icon:"fas fa-video", label:"Generar Animación", 
        }], {
            vMargin:10,
            onClick:async (code, item) => {
                if (code == "start") {
                    if (!window.geoos.anim) window.geoos.anim = {start:NaN, end:NaN};
                    window.geoos.anim.start = window.geoos.time;
                } else if (code == "end") {
                    if (!window.geoos.anim) window.geoos.anim = {start:NaN, end:NaN};
                    window.geoos.anim.end = window.geoos.time;
                } else if (code == "animate") {
                    this.animate();
                }
            }
        });
        z.show();
    }

    async sleep(ms) {
        await new Promise(resolve => setTimeout(_ => resolve(), ms));
    }

    async waitForLayers() {
        let t0 = Date.now();
        let working;
        do {            
            working = false;
            let layers = window.geoos.getActiveGroup().layers;
            for (let layer of layers) {
                if (layer.isWorking) {
                    working = true;
                    break;
                }
            }
            if (working) await this.sleep(200);
        } while(working && (Date.now() - t0) < 30000);
        return Date.now() - t0;
    }

    // https://semisignal.com/tag/ffmpeg-js/
    convertDataURIToBinary(dataURI) {
        var base64 = dataURI.replace(/^data[^,]+,/,'');
        var raw = window.atob(base64);
        var rawLength = raw.length;

        var array = new Uint8Array(new ArrayBuffer(rawLength));
        for (let i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
        }
        return array;
    };

    pad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }

    animate() {
        this.showDialog("./WAnim", {timePanel:this});
    }

    // https://gist.github.com/ilblog/5fa2914e0ad666bbb85745dbf4b3f106
    async animateOld() {
        if (!window.geoos.anim || isNaN(window.geoos.anim.start) || isNaN(window.geoos.anim.end)) {
            this.showDialog("common/WError", {message:"Debe fijar el tiempo de inicio y de término antes de generar la animación"});
            return;
        }
        console.log("anim", window.geoos.anim);
        let start = window.geoos.anim.start;
        let end = window.geoos.anim.end;
        if (start >= end) {
            this.showDialog("common/WError", {message:"Debe fijar el tiempo de término después del tiempo de inicio"});
            return;
        }

        this.callSetTime(start);
        await this.sleep(200);
        await this.waitForLayers();
        const images = [];
        let imgWidth, imgHeight;
        while (window.geoos.time < end) {
            // Tomar foto
            console.log("click");
            let canvas = await window.geoos.mapPanel.getPicture();
            if (!imgWidth) imgWidth = canvas.width;
            if (!imgHeight) imgHeight = canvas.height;
            const imgString = canvas.toDataURL('image/jpeg', 1);
            const data = this.convertDataURIToBinary(imgString);
            images.push({
                name: `img${ this.pad( images.length, 3 ) }.jpeg`,
                data
            });

            // Incrementar tiempo
            let days = parseInt(this.edSelDays.value);
            let hours = parseInt(this.edSelHours.value);
            let minutes = parseInt(this.edSelMinutes.value);
            let m = window.geoos.moment.add(days, "days");
            m = m.add(hours, "hours");
            m = m.add(minutes, "minutes");
            window.geoos.moment = m;

            await this.sleep(200);

            // Esperar que las capas hayan cargado
            await this.waitForLayers();
        }
        this.finalizeVideo(images, imgWidth, imgHeight);
    }

    finalizeVideo(images, w, h) {
        console.log("w, h", w, h);
        window.ffmpegWorker.onmessage = e => {
            let msg = e.data;
            switch (msg.type) {
                case "stdout":
                    console.log("ffmpeg: " + msg.data);
                    break
                case "stderr":
                    console.warn("ffmpeg: " + msg.data);
                    break;
                case "exit":
                    console.log("ffmpeg Process exited with code " + msg.data);
                    //worker.terminate();
                    break;    
                case 'done':
                    const blob = new Blob([msg.data.MEMFS[0].data], {
                        type: "video/mp4"
                    });
                    this.doneVideo(blob);
                    break;
            }
        };
    
        // https://trac.ffmpeg.org/wiki/Slideshow
        // https://semisignal.com/tag/ffmpeg-js/

        // Ajuste tamaño:
        // https://stackoverflow.com/questions/20847674/ffmpeg-libx264-height-not-divisible-by-2
        let vf = `scale=${Math.ceil(w/2)*2}:${Math.ceil(h/2)*2}`;
        console.log("usando vf", vf);
        window.ffmpegWorker.postMessage({
            type: 'run',
            TOTAL_MEMORY: 1073741824,
            
            // arguments: ["-r", "20", "-i", "img%03d.jpeg", "-c:v", "libx264", "-crf", "1", "-vf", "scale=150:150", "-pix_fmt", "yuv420p", "-vb", "20M", "out.mp4"],
            arguments: ["-r", "5", "-i", "img%03d.jpeg", "-c:v", "libx264", "-crf", "1", "-vf", vf, "-pix_fmt", "yuv420p", "-vb", "80M", "out.mp4"],
            
            MEMFS: images
        });
        
        // Updated recommented arguments
        /*
                worker.postMessage({
                type: 'run',
                TOTAL_MEMORY: 268435456,
                arguments: [
                    //"-r", opts.state.frameRate.toString(),
                    "-framerate", opts.state.frameRate.toString(),
                    "-frames:v", imgs.length.toString(),
                    "-an", // disable sound
                    "-i", "img%03d.jpeg",
                    "-c:v", "libx264",
                    "-crf", "17", // https://trac.ffmpeg.org/wiki/Encode/H.264
                    "-filter:v",
                    `scale=${w}:${h}`,
                    "-pix_fmt", "yuv420p",
                    "-b:v", "20M",
                    "out.mp4"],
                MEMFS: imgs
            });*/    
    }

    doneVideo(output) {
        const url = webkitURL.createObjectURL(output);
        var element = document.createElement('a');
        element.href = url;
        element.setAttribute('download', "geoos-anim.mp4");
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    getTimeStep() {
        return {days:this.edSelDays.value, hours:this.edSelHours.value, minutes:this.edSelMinutes.value}
    }
    setTimeStep(s) {
        this.edSelDays.value = s.days;
        this.edSelHours.value = s.hours;
        this.edSelMinutes.value = s.minutes;
    }
}
ZVC.export(Time)