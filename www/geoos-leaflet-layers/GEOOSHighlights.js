class GEOOSHighlights extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
        this.anim = null;
        this.timer = null;
        this.moveEndCallback = null;
    }

    init() {
        window.geoos.map.on("moveend", _ => {
            if (this.moveEndCallback) {
                this.moveEndCallback();
                this.moveEndCallback = null;
            }
        });
    }

    clear() {
        this.moveEndCallback = null;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.anim) {
            this.anim.stop();
            this.anim = null;
        }
        this.konvaLayer.destroyChildren();
        this.redraw();
    }

    redraw() {
        this.konvaLayer.draw()
    }

    highlightPoint(lat, lng, timeout) {
        this.clear();
        let p = this.map.latLngToContainerPoint([lat, lng]);
        let circle = new Konva.Circle({
            x:p.x, y:p.y, radius:5,
            stroke:"white", strokeWidth:1
        })
        this.konvaLayer.add(circle);
        this.redraw();
        this.anim = new Konva.Animation(frame => {
            let scale = 1 + 9 * (frame.time % 500 / 500);            
            circle.scale({x:scale, y:scale});
        }, this.konvaLayer);
        //this.moveEndCallback = _ => this.anim.start();
        this.anim.start();
        if (timeout) {
            this.timer = setTimeout(_ => {
                this.timer = null;
                this.clear();
            }, timeout)
        }
    }
}