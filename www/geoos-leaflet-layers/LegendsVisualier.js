class LegendsVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
    }

    getPointFlagsElements(point) {
        // point: {lat, lng, watching:[{label:string, color:string}, ...]}
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
                strokeWidth:0.5,
                listening:false
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
                    fill:textColor,
                    listening:false
                });
                let txtWidth = txt.width() + 14;
                let poly = new Konva.Line({
                    points:[x,y, x+8+txtWidth,y, x+8+txtWidth+5,y+10, x+8+txtWidth,y+20, x,y+20],
                    closed:true,
                    fill:"#787777",
                    stroke:"black",
                    /*
                    strokeWidth:0.5,
                    shadowOffsetX : 5,
                    shadowOffsetY : 3,
                    shadowBlur : 7,
                    */
                    listening:false
                });
                elements.push(poly);
                elements.push(txt);
            })
        }

        return elements;
    }

    getObjectLegendElements(o) {
        // o: {lat, lng, legends:[{valor, decimales, unidad}, ...]}
        let elements = [];
        let point = this.toCanvas({lat:o.lat, lng:o.lng});
        let x = point.x, y = point.y, path, hPos = "izquierda", vPos = "arriba";
        let dx = 100, dy = 60;
        if (hPos == "centro") {
            if (vPos == "arriba") {
                path = [x, y, x, y - dy];
                y -= dy;
            } else if (vPos == "abajo") {
                path = [x, y, x, y + dy];
                y += dy;
            }
        } else if (hPos == "izquierda") {
            if (vPos == "centro") {
                path = [x, y, x - dx, y];
                x -= dx;
            } else if (vPos == "arriba") {
                path = [x, y, x - dx/2, y, x - dx, y - dy];
                x -= dx; y -= dy;
            } else if (vPos == "abajo") {
                path = [x, y, x - dx/2, y, x - dx, y + dy];
                x -= dx; y += dy;
            }
        } else if (hPos == "derecha") {
            if (vPos == "centro") {
                path = [x, y, x + dx, y];
                x += dx;
            } else if (vPos == "arriba") {
                path = [x, y, x + dx/2, y, x + dx, y - dy];
                x += dx; y -= dy;
            } else if (vPos == "abajo") {
                path = [x, y, x + dx/2, y, x + dx, y + dy];
                x += dx; y += dy;
            }
        }
        let visible = this.pointVisible(path[0], path[1]) || this.pointVisible(path[2], path[3]) || this.pointVisible(path[4], path[5]);
        if (visible) {
            elements.push(new Konva.Line({
                points:path,
                stroke:"white", strokeWidth:5,
                lineCap: 'round', lineJoin: 'round',
                dash: [10, 7, 0.001, 7],
                listening:false
            }));
            elements.push(new Konva.Line({
                points:path,
                stroke:"black", strokeWidth:3,
                lineCap: 'round', lineJoin: 'round',
                dash: [10, 7, 0.001, 7],
                listening:false
            }));
        }
        let leyendas = o.legends;
        let width, height = 0;
        let kTexts = leyendas.reduce((lista, l) => {
            //let txt = l.label + ": ";
            let txt = "";
            if (!isNaN(l.valor)) {
                txt += window.geoos.formatNumber(l.valor, l.decimales, l.unidad);
            } else {
                txt += l.valor + " [" + l.unidad + "]";
            }
            let kText = new Konva.Text({
                x:x, y:y,
                text:txt,
                fontSize:12,
                fontFamily:"Calibri",
                fill:"#000000",
                opacity:1,
                listening:false
            });
            let txtWidth = kText.width();
            let txtHeight = kText.height();
            height += txtHeight;
            if (width === undefined || txtWidth > width) width = txtWidth;
            lista.push(kText);
            return lista;
        }, []);
        let rectX = x - width / 2 - 5, rectY = y - height / 2 - 6,
            rectW = width + 10, rectH = height + 8;
        if (this.rectVisible(rectX, rectY, rectW, rectH)) {
            let roundedRect = new Konva.Rect({
                x:rectX, y:rectY, width:rectW, height:rectH,
                fill: 'rgba(255,255,255,255)',
                stroke: '#000000',
                strokeWidth: 1,
                shadowColor: 'black',
                /*
                shadowBlur: 10,
                shadowOffset: { x: 4, y: 4 },
                shadowOpacity: 0.5,
                */
                cornerRadius:3,
                opacity:1,
                listening:false
            });
            elements.push(roundedRect);
            let yText = y - height / 2 - 1;
            kTexts.forEach(kText => {
                kText.absolutePosition({x:x - width / 2, y:yText});
                yText += height / kTexts.length;
                elements.push(kText);
            });
        }

        return elements;
    }

    update() {
        //let t0 = Date.now();
        this.konvaLayer.destroyChildren();
        let flagPoints = this.options.getFlagPoints?this.options.getFlagPoints():null;
        if (flagPoints) {
            flagPoints.forEach(p => {
                let elements = this.getPointFlagsElements(p);
                elements.forEach(e => this.konvaLayer.add(e));
            });            
        }
        let objects = this.options.getLegendObjects?this.options.getLegendObjects():null;
        if (objects) {
            objects.forEach(o => {
                let elements = this.getObjectLegendElements(o);
                elements.forEach(e => this.konvaLayer.add(e));
            });            
        }        
        if (this.contextLegend) this.drawContextLegend();
        this.konvaLayer.draw();
        super.update();
        //console.log("leyends update in " + (Date.now() - t0) + "ms")
    }
    redraw() {this.update()}
    

    setContextLegend(lat, lng, label) {
        this.contextLegend = {lat, lng, label}
        this.update();
    }
    unsetContextLegend() {
        this.contextLegend = null;
        this.update();
    }
    drawContextLegend() {
        if (!this.contextLegend) return;
        let l1_x = 60, l1_y = 30, l2_x = 70;
        let p0 = this.toCanvas({lat:this.contextLegend.lat, lng:this.contextLegend.lng})
        let pc = this.toCanvas(window.geoos.center);
        let p1 = {x:p0.x < pc.x?p0.x + l1_x:p0.x - l1_x, y:p0.y < pc.y?p0.y + l1_y:p0.y - l1_y};
        let p2 = {x:p0.x < pc.x?p1.x + l2_x:p1.x - l2_x, y:p1.y};
        let line = new Konva.Line({
            points:[p0.x, p0.y, p1.x, p1.y, p2.x, p2.y],
            stroke:"blue", strokeWidth:1.5, 
            dash: [10, 3, 3, 3],
            lineCap: 'round',
            listening:false
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
            fill:"white",
            listening:false
        });
        let txtWidth = kText.width();
        let txtHeight = kText.height();

        let roundedRect = new Konva.Rect({
            x:p0.x < pc.x?p2.x:p2.x  - txtWidth - 10, width:txtWidth + 10,
            y:p2.y - txtHeight / 2 - 6, height:txtHeight + 12,
            fill: 'rgb(68, 68, 67)',
            stroke: 'white',
            strokeWidth: 1,
            /*
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffset: { x: 4, y: 4 },
            shadowOpacity: 0.5,
            */
            cornerRadius:3,
            opacity:0.9,
            listening:false
        });
        this.konvaLayer.add(roundedRect);

        kText.absolutePosition({
            x:roundedRect.x() + 5, y:roundedRect.y() + 6
        })
        this.konvaLayer.add(kText);
    }
}