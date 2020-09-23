class FixedLevelsProperties extends ZCustomController {
    onThis_init(visualizer) {
        this.visualizer = visualizer;
        this.edFixedLevels.value = this.visualizer.fixedLevels?this.visualizer.fixedLevels:"";
    }    

    onEdFixedLevels_change() {
        this.edFixedLevels.removeClass("error");
        let levels = this.edFixedLevels.value.trim();
        if (!levels) {
            this.visualizer.fixedLevels = "";
            return;
        }
        levels = levels.split(" ");
        for (let level of levels) {
            if (isNaN(parseFloat(level))) {
                this.edFixedLevels.addClass("error");
                return;
            }
        }
        this.visualizer.fixedLevels = this.edFixedLevels.value.trim();
    }
}
ZVC.export(FixedLevelsProperties);