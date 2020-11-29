class KonvaCanvasVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
    }

    onAttached() {
        this.canvas = document.createElement("canvas");        
        this.canvas.id = "kcanvas"
        this.canvas.style.position = "absolute";
        this.canvas.style.backgroundColor = "transparent";
        this.canvas.style.margin = "0";
        this.canvas.style.padding = "0";
        this.canvas.style.border = "0";
        this.canvas.style.left = "0";
        this.canvas.style.top= "0";
        this.canvas.style["z-index"] = 10000;
        this.positionCanvas();
    }

    // Overrite to adjust according to pixel ratio
    toCanvas(mapPoint) {
        let pxRatio = window.devicePixelRatio || 1;
        let p = super.toCanvas(mapPoint);
        return {x: p.x * pxRatio, y:p.y * pxRatio}
    }

    positionCanvas() {
        this.canvas.style.width = this.width + "px";
        this.canvas.style.height = this.height + "px";
        //let pxRatio = window.devicePixelRatio || 1;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    update() {
        this.konvaLayer.destroyChildren();
        this.positionCanvas();
        const image = new Konva.Image({image: this.canvas, x:0, y:0});
        this.konvaLayer.add(image);
        this.paintCanvas();
        this.konvaLayer.draw();
        super.update();
    }

    destroy() {
        this.canvas = null;
        super.destroy();
    }
    paintCanvas() {}

    pointVisible(x, y) {
        return x >= 0 && x <= this.width && y >= 0 && y <= this.height;
    }
}
