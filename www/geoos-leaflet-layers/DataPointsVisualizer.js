class DataPointsVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
    }

    setGridData(box, rows, nrows, ncols) {
        this.box = box;
        this.rows = rows;
        this.nrows = nrows;
        this.ncols = ncols;
        this.update();
    }
    update() {
        this.konvaLayer.destroyChildren();
        if (!this.box) {
            this.konvaLayer.draw();
            return;
        }
        let lng = this.box.lng0, lat = this.box.lat0;
        let n=0, w = this.width, h = this.height;
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
                lng += this.box.dLng;
            }
            lat += this.box.dLat;
        }
        this.konvaLayer.draw()
        super.update();
    }
}