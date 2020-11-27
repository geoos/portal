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
        let watching = this.options.getWatching?this.options.getWatching(point):[];
        if (watching && watching.length) {            
            let rect = new Konva.Rect({
                x:p.x - 2,
                y:p.y - 8 - 6 - 26 * watching.length,
                width:4,
                height:8 + 6 + 26 * watching.length,
                fill:"#a86d32",
                stroke:"black",
                strokeWidth:0.5
            });
            elements.push(rect);
            watching.forEach((o, idx) => {
                let y = p.y - 8 - 6 - 26 * watching.length + idx * 26 + 3;
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
        if (this.interactions) this.interactions.clearShapes(this.uniqueId);
        this.konvaLayer.destroyChildren();
        this.points.forEach(p => {
            let elements = this.getPointRepresentation(p);
            elements.forEach(e => this.konvaLayer.add(e))            
        })
        if (this.contextLegend) this.drawContextLegend();
        this.konvaLayer.draw();
        if (this.interactions) this.interactions.redraw();
        super.update();
    }
    redraw() {this.update()}
    

    setContextLegend(lat, lng, label) {
        this.contextLegend = {lat, lng, label}
    }
    unsetContextLegend() {
        this.contextLegend = null;
    }
    drawContextLegend() {
        let l1_x = 60, l1_y = 30, l2_x = 70;
        let p0 = this.toCanvas({lat:this.contextLegend.lat, lng:this.contextLegend.lng})
        let pc = this.toCanvas(window.geoos.center);
        let p1 = {x:p0.x < pc.x?p0.x + l1_x:p0.x - l1_x, y:p0.y < pc.y?p0.y + l1_y:p0.y - l1_y};
        let p2 = {x:p0.x < pc.x?p1.x + l2_x:p1.x - l2_x, y:p1.y};
        let line = new Konva.Line({
            points:[p0.x, p0.y, p1.x, p1.y, p2.x, p2.y],
            stroke:"blue", strokeWidth:1.5, 
            dash: [10, 3, 3, 3],
            lineCap: 'round'
        })
        this.konvaLayer.add(line);
        let marker = new Konva.Circle({
            x:p0.x, y:p0.y, radius:5, fill:"black"
        });
        this.konvaLayer.add(marker);

        let kText = new Konva.Text({
            x:0, y:0,
            text:this.contextLegend.label,
            fontSize:14,
            fontFamily:"Calibri",
            fill:"white"
        });
        let txtWidth = kText.width();
        let txtHeight = kText.height();

        let roundedRect = new Konva.Rect({
            x:p0.x < pc.x?p2.x:p2.x  - txtWidth - 10, width:txtWidth + 10,
            y:p2.y - txtHeight / 2 - 6, height:txtHeight + 12,
            fill: 'rgb(68, 68, 67)',
            stroke: 'white',
            strokeWidth: 1,
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffset: { x: 4, y: 4 },
            shadowOpacity: 0.5,
            cornerRadius:3,
            opacity:0.9
        });
        this.konvaLayer.add(roundedRect);

        kText.absolutePosition({
            x:roundedRect.x() + 5, y:roundedRect.y() + 6
        })
        this.konvaLayer.add(kText);
    }
}