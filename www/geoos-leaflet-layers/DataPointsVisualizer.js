class DataPointsVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
    }

    get interactions() {return this.options.interactions}
    get decimals() {return this.options.decimals !== undefined?this.options.decimals:2}
    get unit() {return this.options.unit?this.options.unit:""}
    
    destroy() {
        if (this.interactions) {
            this.interactions.clearShapes(this.uniqueId);
            this.interactions.redraw();
        }
        super.destroy();
    }

    setGridData(box, rows, nrows, ncols) {
        this.box = box;
        this.rows = rows;
        this.nrows = nrows;
        this.ncols = ncols;
        this.update();
    }
    update() {
        if (this.interactions) this.interactions.clearShapes(this.uniqueId);
        this.konvaLayer.destroyChildren();
        if (!this.box) {
            this.konvaLayer.draw();
            return;
        }
        let lng = this.box.lng0, lat = this.box.lat0;
        let n = (this.box.lng1 - this.box.lng0) / this.box.dLng * (this.box.lat1 - this.box.lat0) / this.box.dLat;
        if (n > 9000) {
            throw "Demasiados puntos. Aumente Zoom"
        }
        for (let iRow=0; iRow<this.nrows; iRow++) {
            lng=this.box.lng0;
            for (let iCol=0; iCol<this.ncols; iCol++) {
                let v = this.rows[iRow][iCol];
                let point = this.toCanvas({lng, lat})
                let circle = new Konva.Circle({
                    x: point.x,
                    y: point.y,
                    radius: 6,
                    stroke: (v !== null && v !== undefined)?"red":"white",
                    strokeWidth: 3,
                });
                this.konvaLayer.add(circle)
                if (this.interactions && v !== null && v !== undefined) {
                    let interCircle = new Konva.Circle({
                        x:point.x, y:point.y, radius:10, stroke:"black", strokeWidth:1, listening:true
                    });
                    this.interactions.addObservableShape(this.uniqueId, interCircle);
                    let lat0 = 0 + lat;
                    let lng0 = 0 + lng;
                    interCircle.on("click", _ => {
                        let fmt = window.geoos.formatNumber(v, this.decimals, this.unit);                        
                        this.setContextLegend(lat0, lng0, fmt);
                        this.update();
                        //setTimeout(_ => this.unsetContextLegend(), 1000);
                    });
                }
                lng += this.box.dLng;
            }
            lat += this.box.dLat;
        }
        if (this.interactions) this.interactions.redraw();
        if (this.contextLegend) this.drawContextLegend();
        this.konvaLayer.draw();
        super.update();
    }

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
