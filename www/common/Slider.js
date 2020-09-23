class Slider extends ZCustomController {
    onThis_init() {
        this.min = 0;
        this.max = 100;
        this.step = 1;
        this.barWidth = $(this.view).find(".slider-bar").width() - 22;
        this.$handler = $(this.handler.view);
        this.$handler.draggable({axis: "x", containment: "parent",
            start:_ => {
                this.$handler.addClass("text-primary");
                this.barWidth = $(this.view).find(".slider-bar").width() - 22
            },
            drag:_ => this.triggerEvent("changing", this.value),
            stop:_ => {
                this.$handler.removeClass("text-primary");
                this.triggerEvent("change", this.value)
            },
        })
    }

    setRange(min, max, step) {
        this.min = min;
        this.max = max;
        this.step = step || 1;
    }

    get value() {
        let drag = $(this.find("#handler"));
        let x = drag.position().left - 36;
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