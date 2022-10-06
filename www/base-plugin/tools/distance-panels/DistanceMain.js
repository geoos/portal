class DistanceMain extends ZCustomController {
    get points() {return this.tool.points}

    async onThis_init(options) {
        this.tool = options.tool;
        this.userObjectDeleteListener = id => {
            let idx = this.points.indexOf(id);
            if (idx >= 0) {
                this.points.splice(idx, 1);
                this.refresh();
            }
        }
        this.userObjectMoveListener = uo => {
            this.refresh();
        }
        let unidades = [{
            id:"kilometers", name:"Kilómetros", ab:"km"
        }, {
            id:"meters", name:"Metros", ab:"m"
        }, {
            id:"miles", name:"Millas", ab:"mi"
        }, {
            id:"naut", name:"Millas Náuticas", ab:"mn"
        }];
        this.edUnidad.setRows(unidades, this.tool.unit);
        this.refresh();
    } 

    onEdUnidad_change() {
        this.tool.unit = this.edUnidad.value;
        this.refresh();
    }

    async onThis_activated() {
        window.geoos.events.on("userObject", "deleted", this.userObjectDeleteListener)
        window.geoos.events.on("userObject", "moved", this.userObjectMoveListener)

        window.geoos.getActiveGroup().getUserObjectsLayer().setPainters(uoVisualizer => this.repaint(), null);
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
    }
    async onThis_deactivated() {
        window.geoos.events.remove(this.userObjectDeleteListener)
        window.geoos.events.remove(this.userObjectMoveListener)
        window.geoos.getActiveGroup().getUserObjectsLayer().setPainters(null, null);
        window.geoos.getActiveGroup().getUserObjectsLayer().refresh();
    }

    distancia(p1, p2, unidad) {
        let u = unidad == "naut"?"meters":unidad;
        let from = turf.point([p1.lng, p1.lat]);
        let to = turf.point([p2.lng, p2.lat]);
        let d = turf.distance(from, to, {units:u});
        if (unidad == "naut") d = d / 1852;
        return d;
    }
    refresh() {
        try {
            let u = this.edUnidad.value || "kilometers";
            let html = "<table>", sum = 0;        
            for (let i=0; i<this.points.length - 1; i++) {
                let p1 = window.geoos.getUserObject(this.points[i]);
                let p2 = window.geoos.getUserObject(this.points[i + 1]);
                if (!p1 || !p2) throw "No se encontró uno de los puntos";                 
                let d = this.distancia(p1, p2, u);
                let fmt = window.geoos.formatNumber(d, 2, this.edUnidad.selectedRow.ab);
                sum += d;
                html += `
                    <tr>
                        <td>
                            <span>${p1.name}</span><i class="fas fa-arrow-right mx-2"></i><span>${p2.name}</span>
                        </td>
                        <td style="text-align: right; padding-left: 40px;">
                            ${fmt}
                        </td>
                    </tr>
                `;
            }
            this.tramosContainer.html = html + "</table>";
            let fmt = window.geoos.formatNumber(sum, 2, this.edUnidad.selectedRow.ab);
            this.lblTotal.value = fmt;
            this.repaint();
        } catch(error) {
            this.tramosContainer.text = "Error: " + error.toString();
        }
    }

    repaint() {
        let uol = window.geoos.getActiveGroup().getUserObjectsLayer();
        if (!uol) return;
        let uoVisualizer = uol.konvaLeafletLayer.getVisualizer("user-objects");
        let kl = uoVisualizer.konvaLayer;
        for (let i=0; i<this.points.length - 1; i++) {

            let uoId = this.points[i];
            let uo = window.geoos.getUserObject(uoId);
            if (!uo) {console.error("User object " + uoId + " not found"); return;}
            let p0 = uoVisualizer.toCanvas({lat:uo.lat, lng:uo.lng});

            uoId = this.points[i + 1];
            uo = window.geoos.getUserObject(uoId);
            if (!uo) {console.error("User object " + uoId + " not found"); return;}
            let p1 = uoVisualizer.toCanvas({lat:uo.lat, lng:uo.lng});

            let xm = (p0.x + p1.x) / 2, ym = (p0.y + p1.y) / 2;
            let arrow = new Konva.Arrow({
                x: 0, y:0,
                points:[p0.x, p0.y, xm, ym],
                pointerLength: 10,
                pointerWidth: 10,
                fill: 'blue',
                stroke: 'black',
                strokeWidth: 1
            })
            kl.add(arrow);
            kl.add(new Konva.Line({
                points:[xm, ym, p1.x, p1.y],
                stroke: 'black',
                strokeWidth: 1
            }))
        }
    }
}

ZVC.export(DistanceMain);