class MapGridVisualizer extends KonvaLeafletVisualizer {
    constructor(options) {
        super(options);
    }

    update() {
        this.konvaLayer.destroyChildren();
        let elements = this.getGridElements();
        elements.forEach(e => this.konvaLayer.add(e));
        this.konvaLayer.draw();
        super.update();
    }

    get map() {return window.geoos.map}

    getGridElements() {
        let elements = [];
        let config = window.geoos.user.config.mapConfig.grid;
        let d1 = 1.0, d2 = 0.25;
        let color1 = config.color1 || "black", color2 = config.color2 || "black";
        let width1 = config.width1 || 1, width2 = config.width2 || 0.2;
        let b = this.map.getBounds();
        if (config.step1 == "auto") {
            let w = b.getEast() - b.getWest();
            while (w / d1 > 14) {
                d1 *= 2; d2 *= 2;
            }
            while (w / d1 < 4) {
                d1 /= 2; d2 /= 2;
            }
            if (config.step2 == -1) d2 = -1;
        } else {
            d1 = parseFloat(config.step1);
            d2 = parseFloat(config.step2);
        }
        let lng0 = (parseInt(b.getWest() / d1) - 1) * d1;
        let lng1 = (parseInt(b.getEast() / d1) + 1) * d1;
        let lat0 = (parseInt(b.getSouth() / d1) - 1) * d1;
        let lat1 = (parseInt(b.getNorth() / d1) + 1) * d1;
        let lastLabelX = -100;
        for (let lng =lng0; lng <= lng1; lng += d1) {
            let p0 = this.map.latLngToContainerPoint([lat0, lng]);
            let p1 = this.map.latLngToContainerPoint([lat1, lng]);
            elements.push(new Konva.Line({
                points:[p0.x, p0.y, p1.x, p1.y],
                stroke:color1, strokeWidth:width1,
            }));
            if (p0.x - lastLabelX > 50 && p0.x > 40) {
                var lbl = new Konva.Text({
                    x: p0.x, y:90,
                    text: this.toDeg(lng, "lng"),
                    fontSize: 15,
                    fontFamily: 'Calibri',
                    fontStyle:"bold",
                    fill: 'black',
                    stroke:"white",
                    strokeWidth:0.5,
                });
                lbl.offsetX(lbl.width() / 2);
                elements.push(lbl);
                lastLabelX = p0.x;
            }
            if (d2 > 0) {
                let subLng = lng + d2;
                while (subLng < lng + d1) {
                    p0 = this.map.latLngToContainerPoint([lat0, subLng]);
                    p1 = this.map.latLngToContainerPoint([lat1, subLng]);
                    elements.push(new Konva.Line({
                        points:[p0.x, p0.y, p1.x, p1.y],
                        stroke:color2, strokeWidth:width2,
                        dash: [6, 2]
                    }));
                    subLng += d2;
                }
            }
        }
        for (let lat =lat0; lat <= lat1; lat += d1) {
            let p0 = this.map.latLngToContainerPoint([lat, lng0]);
            let p1 = this.map.latLngToContainerPoint([lat, lng1]);
            elements.push(new Konva.Line({
                points:[p0.x, p0.y, p1.x, p1.y],
                stroke:color1, strokeWidth:width1,
            }));
            if (p0.y > 50) {
                var lbl = new Konva.Text({
                    x: 12, y:p0.y,
                    text: this.toDeg(lat, "lat"),
                    fontSize: 15,
                    fontFamily: 'Calibri',
                    fontStyle:"bold",
                    fill: 'black',
                    stroke:"white",
                    strokeWidth:0.5,
                });
                lbl.offsetY(lbl.height() / 2);
                elements.push(lbl);
            }
            if (d2 > 0) {
                let subLat = lat + d2;
                while (subLat < lat + d1) {
                    p0 = this.map.latLngToContainerPoint([subLat, lng0]);
                    p1 = this.map.latLngToContainerPoint([subLat, lng1]);
                    elements.push(new Konva.Line({
                        points:[p0.x, p0.y, p1.x, p1.y],
                        stroke:color2, strokeWidth:width2,
                        dash: [6, 2]
                    }));
                    subLat += d2;
                }
            }
        }

        return elements;
    }

    toDeg(dd, tipo) {
        let dir = dd < 0
          ? tipo == "lng" ? 'W' : 'S'
          : tipo == "lat" ? 'E' : 'N';
      
        var absDd = Math.abs(dd);
        var deg = absDd | 0;
        var frac = absDd - deg;
        var min = (frac * 60) | 0;
        var sec = frac * 3600 - min * 60;
        sec = Math.round(sec * 100) / 100;
        return deg + "°" + (min<10?"0":"") + min + "'" + (sec<10?"0":"") + sec + '"' + dir;
      }
}