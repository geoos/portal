class PointsVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
    }

    get interactions() {return this.options.interactions}
    get points() {return this.options.getPoints()}
    getPoint(id) {return this.points.find(p => p.id == id)} 

    destroy() {
        if (this.interactions) {
            this.interactions.clearShapes(this.uniqueId);
            this.interactions.redraw();
        }
        super.destroy();
    }

    getPointRepresentation(point) {
        let p = this.toCanvas({lat:point.lat, lng:point.lng});
        let elements = [];
        let color = this.options.getColorWatch?this.options.getColorWatch(point):null;
        if (color) {
            let opts = {stroke:"black", strokeWidth:1, radius:15, fill:color, x:p.x, y:p.y}
            let element =  new Konva.Circle(opts);
            elements.push(element);
        }

        let opts = point.options.style;
        if (!opts && this.options.style) {
            if (typeof this.options.style == "function") {
                opts = this.options.style(point);
            } else if (typeof this.options.style == "object") {
                opts = this.options.style;
            }
        }
        opts = opts || {radius:6, fill:"red", stroke:"black", strokeWidth:1};
        opts.x = p.x; opts.y = p.y;
        let element =  new Konva.Circle(opts);
        elements.push(element);

        if (this.interactions) {
            let interObject = element.clone();
            this.interactions.addObservableShape(this.uniqueId, interObject);
            if (this.options.onmouseover) {
                interObject.on("mouseover", e => this.options.onmouseover(point))
            }
            if (this.options.onmouseout) {
                interObject.on("mouseout", e => this.options.onmouseout(point))
            }
            if (this.options.onclick) {
                interObject.on("click", e => this.options.onclick(point))
            }
        }

        return elements;
    }
    update() {
        //let t0 = Date.now();
        if (this.interactions) this.interactions.clearShapes(this.uniqueId);
        this.konvaLayer.destroyChildren();
        this.points.forEach(p => {
            let elements = this.getPointRepresentation(p);
            elements.forEach(e => this.konvaLayer.add(e))            
        })
        this.konvaLayer.draw();
        if (this.interactions) this.interactions.redraw();
        super.update();
        //console.log("points update in " + (Date.now() - t0) + "ms")
    }
    redraw() {this.update()}
}