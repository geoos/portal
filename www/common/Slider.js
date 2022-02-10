class Slider extends ZCustomController {
    onThis_init() {
        this.min = 0;
        this.max = 100;
        this.step = 1;
        this.$handler = $(this.handler.view);
        this.$handler.draggable({axis: "x", containment: "parent", scroll:false, 
            start:_ => {
                if (!this.handlerFixedClass) this.$handler.addClass("text-primary");
            },
            drag:_ => this.triggerEvent("changing", this.value),
            stop:_ => {
                if (!this.handlerFixedClass) this.$handler.removeClass("text-primary");
                this.triggerEvent("change", this.value)
            }
        })
        this.sliderBar = $($(this.view).find(".slider-bar"));
        this.sliderBar.click(e => {
            if (e.target.classList.contains("slider-bar")) {
                let x = e.offsetX;
                if (this.hasSigns) {
                    if (x <12) x = 12;
                    if (x > this.sliderBar.width() - 12) x = this.sliderBar.width() - 12;
                    this.$handler.css({left:(36 + x - 12)});
                } else {
                    if (x <11) x = 11;
                    if (x > this.sliderBar.width() - 11) x = this.sliderBar.width() - 11;
                    this.$handler.css({left:(21 + x - 11)});
                }
                this.triggerEvent("change", this.value);
            }
        })
        this.hasSigns = true;        
    }

    setRange(min, max, step) {
        this.min = min;
        this.max = max;
        this.step = step || 1;
    }
    hideSigns() {
        $(this.view).find(".fa-minus").hide()
        $(this.view).find(".fa-plus").hide()
        this.hasSigns = false;
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
        let x, w;
        if (this.hasSigns) {
            x = this.$handler.position().left - 36, w = this.sliderBar.width() - 24;
        } else {
            x = this.$handler.position().left - 21, w = this.sliderBar.width() - 22;
        }
        let r = x / w;
        let v1 = this.min + r * (this.max - this.min)
        let v = parseInt((v1 + this.step / 2) / this.step) * this.step;
        if (v < this.min) v = this.min;
        if (v > this.max) v = this.max;
        return v
    }

    set value(v) {
        if (v < this.min) v = this.min;
        if (v > this.max) v = this.max;
        let r = (v - this.min) / (this.max - this.min);
        if (this.hasSigns) {
            let w = this.sliderBar.width() - 24;
            let x = 36 + r * w;
            this.handler.view.style.left = x + "px";
        } else {
            let w = this.sliderBar.width() - 22;
            let x = 21 + r * w;
            this.handler.view.style.left = x + "px";
        }            
    }

    onStepDec_click() {
        this.value -= this.step;
        this.triggerEvent("change", this.value);
    }
    onStepInc_click() {
        this.value += this.step;
        this.triggerEvent("change", this.value);
    }
}
ZVC.export(Slider)