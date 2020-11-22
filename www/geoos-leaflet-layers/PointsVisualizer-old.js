class PointsVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
        this.points = [];
    }

    addPoint(p) {
        p.options = p.options || {}
        this.points.push(p)
        if (this.stageLayer) this.update();
    }
    getPoint(id) {return this.points.find(p => p.id == id)}
    removePoint(id) {
        let idx = this.points.findIndex(p => p.id == id);
        if (idx >= 0) this.points.splice(idx,1);
        if (this.stageLayer) this.update();
    }

    getPointRepresentation(point) {
        let p = this.toCanvas({lat:point.lat, lng:point.lng});
        let elements = [];
        if (point.watching && point.watching.length) {
            let rect = new Konva.Rect({
                x:p.x - 2,
                y:p.y - 8 - 6 - 26 * point.watching.length,
                width:4,
                height:8 + 6 + 26 * point.watching.length,
                fill:"#a86d32",
                stroke:"black",
                strokeWidth:0.5
            });
            elements.push(rect);
            point.watching.forEach((o, idx) => {
                let y = p.y - 8 - 6 - 26 * point.watching.length + idx * 26 + 3;
                let x = p.x + 3;
                let text = o.label, textColor = o.color?o.color:"white";
                let txt = new Konva.Text({
                    x:x + 18, y:y + 4,
                    text:text,
                    fontSize:14,
                    fontFamily:"Calibri",
                    fill:textColor
                });
                let txtWidth = txt.width() + 14;
                let poly = new Konva.Line({
                    points:[x,y, x+8+txtWidth,y, x+8+txtWidth+5,y+10, x+8+txtWidth,y+20, x,y+20],
                    closed:true,
                    fill:"#787777",
                    stroke:"black",
                    strokeWidth:0.5,
                    shadowOffsetX : 5,
                    shadowOffsetY : 3,
                    shadowBlur : 7
                });
                elements.push(poly);
                elements.push(txt);
            })
        }

        let opts = point.options.style;
        if (!opts && this.options.style) {
            if (typeof this.options.style == "function") {
                opts = this.options.style(point);
            } else if (typeof this.options.style == "object") {
                opts = this.options.style;
            }
        }
        opts = opts || {radius:9, fill:"red", stroke:"black", strokeWidth:1};
        opts.x = p.x; opts.y = p.y;
        if (point.options.draggable) {
            opts.draggable = true;
            opts.listening = true;
        }
        let element =  new Konva.Circle(opts);
        if (opts.draggable) {
            element.on('mouseover',  _ => {
                this.stageLayer.lPane.style.cursor = 'pointer';
                this.stageLayer.map.dragging.disable();
            });
            element.on('mouseout', _ => {
                this.stageLayer.lPane.style.removeProperty("cursor");
                this.stageLayer.map.dragging.enable();
            });
            element.on("dragend", _ => {
                let mapPoint = this.toMap({x:element.x(), y:element.y()})
                point.lat = mapPoint.lat;
                point.lng = mapPoint.lng;
                if (this.options.onPointMoved) this.options.onPointMoved(point)
            });
        }
        elements.push(element);
        return elements;
    }
    update() {
        this.konvaLayer.destroyChildren();
        this.points.forEach(p => {
            let elements = this.getPointRepresentation(p);
            elements.forEach(e => this.konvaLayer.add(e))            
        })
        this.konvaLayer.draw()
        super.update();
    }
}