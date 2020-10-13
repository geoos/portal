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
}