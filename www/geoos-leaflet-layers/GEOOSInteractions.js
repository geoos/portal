class GEOOSInteractions extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
        this.shapes = {}
    }

    addObservableShape(id, shape) {;        
        let shapesById = this.shapes[id]
        if (!shapesById) {
            shapesById = [];
            this.shapes[id] = shapesById
        }
        shape.opacity(0);
        shapesById.push(shape);
        this.konvaLayer.add(shape);
    }
    clearShapes(id) {
        let shapesById = this.shapes[id]
        if (shapesById) shapesById.forEach(shape => {
            shape.remove();
            shape.destroy()
        })
        delete this.shapes[id];
    }

    redraw() {
        this.konvaLayer.draw()
    }

    // Se usa este visualizer para etiquetas de animaciones
    addDecorationShape(shape) {
        let shapesById = this.shapes["decoration"];
        if (!shapesById) {
            shapesById = [];
            this.shapes["decoration"] = shapesById
        }
        shapesById.push(shape);
    }
    clearDecorations(id) {
        let shapesById = this.shapes["decoration"]
        if (shapesById) shapesById.forEach(shape => {
            shape.remove();
            shape.destroy();
            this.konvaLayer.draw();
        })
        delete this.shapes[id];
    }
    setTitle(width, height, title) {
        let p = this; //window.geoos.interactions;
        let text = new Konva.Text({
            text: title, opacity: 0.6,
            x: width / 2, y: height - 50,
            fontSize: 25,
            fontFamily: 'Arial',
            fill: "white"            
        });
        text.offsetX(text.width() / 2);
        let textWidth = text.width() + 40;        
        let rect = new Konva.Rect({
            x: width / 2 - textWidth / 2,
            y: height - 65,
            stroke: 'white', strokeWidth: 1,
            fill: 'black', opacity: 0.4,
            width: textWidth,
            height: 50,
            cornerRadius: 5,
        });
        p.konvaLayer.add(rect);
        p.addDecorationShape(rect);        
        p.konvaLayer.add(text);
        p.addDecorationShape(text);        
        p.konvaLayer.draw();
    }

    setTime(width, height, time, format) {
        let t = moment.tz(time, window.timeZone);
        let st = t.format(format);
        let p = this; //window.geoos.interactions;
        let text = new Konva.Text({
            text: st, opacity: 0.6,
            x: width - 40, y: height - 40,
            fontSize: 15,
            fontFamily: 'Arial',
            fill: "white"            
        });
        text.offsetX(text.width());
        let textWidth = text.width() + 40;        
        let rect = new Konva.Rect({
            x: width - textWidth - 20,
            y: height - 55,
            stroke: 'white', strokeWidth: 1,
            fill: 'black', opacity: 0.4,
            width: textWidth,
            height: 40,
            cornerRadius: 5,
        });
        p.konvaLayer.add(rect);
        p.addDecorationShape(rect);        
        p.konvaLayer.add(text);
        p.addDecorationShape(text);        
        p.konvaLayer.draw();
    }
}