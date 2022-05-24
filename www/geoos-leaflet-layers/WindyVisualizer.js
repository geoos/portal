class WindyVisualizer extends KonvaCanvasVisualizer {
    constructor(options) {
        super(options);
    }

    onAttached() {
        super.onAttached();
        this.canvas.style["pointer-events"] = "none";
        document.body.appendChild(this.canvas);
    }

    getColor(v) {
        if (this.options.getColor) return this.options.getColor(v);
        return "blue"
    }
    get nParticles() {return this.options.getNParticles?this.options.getNParticles():1000}
    get speed() {return this.options.getSpeed?this.options.getSpeed():0.7}
    get lineWidth() {return this.options.getLineWidth?this.options.getLineWidth():1}
    
    destroy() {    
        if (this.windy) this.windy.stop();
        this.windy = null;
        this.canvas.remove();
        super.destroy();
    }

    setWindyData(box, min, max, rowsU, rowsV, nrows, ncols) {
        this.box = box;
        if (min == max) {
            min = max - 8/10 * max;
            max *= 1.2;
        }
        this.min = min;
        this.max = max;
        this.rowsU = rowsU;
        this.rowsV = rowsV;
        this.nrows = nrows;
        this.ncols = ncols;
        this.update();
    }

    stopWindy() {
        if (this.windy) this.windy.stop();
        this.windy = null;
        this.clearCanvas();        
    }

    clearCanvas() {
        let canvas = this.canvas; // this.stageCanvas
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);        
    }

    
    redraw() {
        this.paintCanvas();
    }
    

    paintCanvas() {
        this.canvas.style.left = this.stageCanvas.style.left;
        this.canvas.style.top = this.stageCanvas.style.top;
        this.canvas.style["z-index"] = this.stageLayer.lPane.style["z-index"];
        //this.clearCanvas();    
        if (!this.box || !this.rowsU) return;
        if (this.windy) this.windy.stop();
        this.windy = null;
        let p0 = this.toCanvas({lat:this.box.lat0, lng:this.box.lng0});
        let p1 = this.toCanvas({lat:this.box.lat1, lng:this.box.lng1});
        this.colors = [];
        for (let i=this.min; i<= this.max; i += (this.max - this.min) / 20) {
            this.colors.push(this.getColor(i));
        }
        let windyGridData = [{
            header:{
                parameterCategory:"1",
                parameterNumber:"2",
                lo1:this.box.lng0,
                la1:this.box.lat0,
                dx:this.box.dLng,
                dy:this.box.dLat,
                nx:this.ncols,
                ny:this.nrows
            },
            data:this.rowsU.reduce((list, array) => (list.concat(array)), [])
        }, {
            header:{
                parameterCategory:"1",
                parameterNumber:"3"
            },
            data:this.rowsV.reduce((list, array) => (list.concat(array)), [])
        }]
        let canvas = this.canvas; // this.stageCanvas
        this.windy = new Windy({
            canvas:canvas,
            map:window.geoos.map,
            data:windyGridData,
            maxVelocity:this.max,
            minVelocity:this.min,
            particleMultiplier:1 / this.nParticles,
            velocityScale:this.speed / this.max,
            colorScale:this.colors,
            lineWidth:this.lineWidth
        })
        
        this.windy.start([
                [p0.x, p1.y],
                [p1.x, p0.y]
            ],
            p1.x - p0.x + 1, 
            p0.y - p1.y + 1,
            [
                [this.box.lng1, this.box.lat1],
                [this.box.lng0, this.box.lat0]
            ]
        )
    }
}