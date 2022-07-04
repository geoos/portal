class ZDateTimePicker extends ZController {
    onThis_init() {
        this.$view = $(this.view);
        this.format = this.$view.data("z-format") || "DD/MM/YYYY";
        this.locale = this.$view.data("z-locale") || window.language || "es";
        this.$view.datetimepicker({
            locale:this.locale,
            format:this.format,
            keepInvalid:false,
            icons: {
                time: "fas fa-clock",
                date: "fas fa-calendar",
                up: "fas fa-chevron-up",
                down: "fas fa-chevron-down",
                previous: 'fas fa-chevron-left',
                next: 'fas fa-chevron-right',
                today: 'fas fa-screenshot',
                clear: 'fas fa-trash',
                close: 'fas fa-remove'
            },
            //widgetPositioning:{horizontal:"left", vertical:"auto"}
            //widgetParent:$(this.view.parentElement)
            //pickerPosition: "top-left"
        });
        this.$view.on("dp.change", () => {
            /*
            if (this.ignoreNextChange) {
                this.ignoreNextChange = false;
                return;
            }
            */
            this.triggerEvent("change", [this.value])
        })
    }

    set value(dt) {
        //this.ignoreNextChange = true;
        let v = this.$view.data("DateTimePicker").date();
        // Actualizar (e informar evento) sólo si efectivamente cambia
        //if (dt && v && dt.valueOf() != v.valueOf()) {
            this.$view.data("DateTimePicker").date(dt);
            this.$view.addClass("is-filled");
        //}
    }
    get value() {
        if (!this.$view.data("DateTimePicker").date()) return null;
        let dt = this.$view.data("DateTimePicker").date();
        return dt.toDate();
    }
}

class ZInlineDatePicker extends ZController {
    onThis_init() {
        this.$view = $(this.view);
        this.format = this.$view.data("z-format") || "DD/MM/YYYY";
        this.locale = this.$view.data("z-locale") || window.language || "es";
        this.dp = this.$view.datetimepicker({
            inline:true,
            locale:this.locale,
            format:this.format,
            keepInvalid:false,
            icons: {
                time: "fas fa-clock-o",
                date: "fas fa-calendar",
                up: "fas fa-chevron-up",
                down: "fas fa-chevron-down",
                previous: 'fas fa-chevron-left',
                next: 'fas fa-chevron-right',
                today: 'fas fa-screenshot',
                clear: 'fas fa-trash',
                close: 'fas fa-remove'
            },
            //widgetPositioning:{horizontal:"left", vertical:"auto"}
            //widgetParent:$(this.view.parentElement)
            //pickerPosition: "top-left"
        });
        this.$view.on("dp.change", () => {
            /*
            if (this.ignoreNextChange) {
                this.ignoreNextChange = false;
                console.log("change ignorado")
                return;
            }
            */
            this.triggerEvent("change", this.value)
        })
    }

    set value(dt) {
        //this.ignoreNextChange = true;
        let v = this.$view.data("DateTimePicker").date();
        // Actualizar (e informar evento) sólo si efectivamente cambia
        if (dt && v && dt.valueOf() != v.valueOf()) {
            this.$view.data("DateTimePicker").date(dt);
            this.$view.addClass("is-filled");
        }
    }
    get value() {
        if (!this.$view.data("DateTimePicker").date()) return null;
        let dt = this.$view.data("DateTimePicker").date();
        return dt;
    }
}

ZVC.registerComponent("INPUT", e => (e.classList.contains("datetimepicker")), ZDateTimePicker);
ZVC.registerComponent("DIV", e => (e.classList.contains("datetimepicker")), ZInlineDatePicker);