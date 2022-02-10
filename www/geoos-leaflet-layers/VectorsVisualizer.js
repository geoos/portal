class VectorsVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
    }

    setVectorData(box, rowsU, rowsV, nrows, ncols) {
        this.box = box;
        this.rowsU = rowsU;
        this.rowsV = rowsV;
        this.nrows = nrows;
        this.ncols = ncols;
        this.rowsMagnitudes = [];
        this.maxMagnitud = undefined;
        this.minMagnitud = undefined;
        for (let iRow=0; iRow<this.nrows; iRow++) {
            let rowMagnitudes = [];
            for (let iCol=0; iCol<this.ncols; iCol++) {
                let u = this.rowsU[iRow][iCol];
                let v = this.rowsV[iRow][iCol];
                if (u !== undefined && v !== undefined) {
                    let m = Math.sqrt(u*u + v*v);
                    if (this.minMagnitud === undefined || m < this.minMagnitud) this.minMagnitud = m;
                    if (this.maxMagnitud === undefined || m > this.maxMagnitud) this.maxMagnitud = m;
                    rowMagnitudes.push(m);
                }
            }
            this.rowsMagnitudes.push(rowMagnitudes);
        }
        this.update();
    }
    getVectorColor(magnitude, lat, lng) {
        if (this.options.vectorColor) return this.options.vectorColor(magnitude, lat, lng);
        return "black"
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
                let u = this.rowsU[iRow][iCol];
                let v = this.rowsV[iRow][iCol];
                if (u !== null && v !== null) {
                    let m = this.rowsMagnitudes[iRow][iCol];
                    let len = Math.min(w / this.ncols, h / this.nrows) * 1.0;
                    let angle = Math.atan2(u, v) * 180 / Math.PI;
                    let scale = 0.3 + 0.7 * (m -this.minMagnitud) / (this.maxMagnitud - this.minMagnitud);
                    if (isNaN(scale)) scale = 1;
                    let point = this.toCanvas({lng, lat})
                    let color = this.getVectorColor(m, lat, lng);
                    let arrow = new Konva.Arrow({
                        x: point.x,
                        y: point.y,
                        points:[0,  len / 2, 0, -len /2],
                        pointerLength: 5,
                        pointerWidth: 5,
                        stroke: color,
                        strokeWidth: 2,
                        rotation:angle,
                        scaleX:scale, scaleY:scale
                    });
                    this.konvaLayer.add(arrow)
                }

                lng += this.box.dLng;
            }
            lat += this.box.dLat;
        }
        this.konvaLayer.draw()
        super.update();
    }
}