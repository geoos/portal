class Slider extends ZCustomController {
    onThis_init() {
        this.min = 0;
        this.max = 100;
        this.step = 1;
        this.$handler = $(this.handler.view);
        this.$handler.draggable({axis: "x", containment: "parent",
            start:_ => {
                if (!this.handlerFixedClass) this.$handler.addClass("text-primary");
            },
            drag:_ => this.triggerEvent("changing", this.value),
            stop:_ => {
                if (!this.handlerFixedClass) this.$handler.removeClass("text-primary");
                this.triggerEvent("change", this.value)
            }
        })
        $(this.view).click(e => {
            let x = e.clientX - 20 - this.x0 - 10;
            if (x < this.x0) x = this.x0;
            if (x > this.x1) x = this.x1;
            this.value = this.min + (x - this.x0) / this.pixelsRange * (this.max - this.min);
            this.triggerEvent("change", this.value)
            console.log("x", x, " [" + this.x0 + " - " + this.x1 + "]", this.value);
        })
    }

    setRange(min, max, step) {
        this.min = min;
        this.max = max;
        this.step = step || 1;
    }
    hideSigns() {
        $(this.view).find(".fa-minus").hide()
        $(this.view).find(".fa-plus").hide()
    }
    setBgLight() {
        $(this.view).find(".slider-bar").css({"background-color":"#E5E1E1"})
    }
    setHandlerFixedClass(_class) {
        this.handlerFixedClass = _class;
        this.$handler.addClass(this.handlerFixedClass);
    }
    get barWidth() {return $(this.view).find(".slider-bar").width() - 22}
    get x0() {return 21}
    get x1() {return $(this.view).find(".slider-bar").width() - 3}
    get pixelsRange() {return this.x1 - this.x0}


    get value() {
        let drag = $(this.find("#handler"));
        let x = drag.position().left - 21; //drag.position().left - 36;
        let r = x / this.barWidth;        
        let v1 = this.min + r * (this.max - this.min)
        let v = parseInt((v1 + this.step / 2) / this.step) * this.step;
        if (v < this.min) v = this.min;
        if (v > this.max) v = this.max;
        return v;
    }

    set value(v) {
        let r = (v - this.min) / (this.max - this.min);
        let x = 36 + r * this.barWidth;
        this.handler.view.style.left = x + "px";
    }
}
ZVC.export(Slider)