class ParticlesProperties extends ZCustomController {
    onThis_init(visualizer) {
        this.visualizer = visualizer;
        this.edLineWidth.value = this.visualizer.lineWidth;
        this.edNParticles.setRange(200, 6000, 20);
        this.edNParticles.value = 6200 - this.visualizer.nParticles;
        this.edSpeed.setRange(0.1, 2, 0.1);
        this.edSpeed.value = this.visualizer.speed;
    }    

    onEdLineWidth_change() {
        let v = parseFloat(this.edLineWidth.value);
        if (isNaN(v) || v <= 0) {
            this.edLineWidth.addClass("error")
            return;
        }
        this.edLineWidth.removeClass("error")
        this.visualizer.lineWidth = v;
    }
    onEdNParticles_change() {
        this.visualizer.nParticles = 6200 - this.edNParticles.value;
    }
    onEdSpeed_change() {
        this.visualizer.speed = this.edSpeed.value;
    }
}
ZVC.export(ParticlesProperties);