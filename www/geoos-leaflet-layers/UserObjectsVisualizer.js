class UserObjectsVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
    }

    get interactions() {return this.options.interactions}
    get objects() {return this.options.getObjects()}
    getObject(id) {return this.objects.find(o => o.id == id)} 

    destroy() {
        if (this.interactions) {
            this.interactions.clearShapes(this.uniqueId);
            this.interactions.redraw();
        }
        super.destroy();
    }

    update() {
        if (this.interactions) this.interactions.clearShapes(this.uniqueId);
        this.konvaLayer.destroyChildren();
        if (this.prePainter) this.prePainter(this);
        this.objects.forEach(o => {
            let {elements, interactionElements} = o.getKonvaElements(this, this.interactions);
            elements.forEach(e => this.konvaLayer.add(e))
            if (interactionElements && this.interactions) interactionElements.forEach(interObject => {
                this.interactions.addObservableShape(this.uniqueId, interObject);
                if (interObject.zIndexToAssign) {
                    interObject.zIndex(interObject.zIndexToAssign);
                }
                if (this.options.onmouseover) {
                    interObject.on("mouseover", e => {                        
                        this.options.onmouseover(o, o.getInteractionObjectInfo(interObject))
                        this.stageLayer.map.dragging.disable();
                    })
                }
                if (this.options.onmouseout) {
                    interObject.on("mouseout", e => {
                        this.options.onmouseout(o, o.getInteractionObjectInfo(interObject))
                        this.stageLayer.map.dragging.enable();
                    })                    
                }
                if (this.options.onclick) {
                    interObject.on("click", e => this.options.onclick(o.getFinalObject(interObject)))
                }
                if (this.options.onmove && interObject.draggable) {
                    interObject.on("dragstart", e => {
                        interObject.setOpacity(1);
                    })
                    interObject.on("dragend", e => {
                        interObject.setOpacity(0);
                        o.getFinalObject(interObject).moved(this, interObject);                        
                        this.options.onmove(o.getFinalObject(interObject));
                    })
                }
            }); 
        })
        if (this.postPainter) this.postPainter(this);
        this.konvaLayer.draw();
        if (this.interactions) this.interactions.redraw();
        if (this.contextLegend) this.drawContextLegend();
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