class GEOOS {
    constructor() {
        this.events = new GEOOSEvents();
        this.calculatePortalSize();
        window.addEventListener("resize", _ => this.triggerResize());
    }

    async init() {
        this.config = await zPost("getPortalConfig.geoos");
    }

    get baseMaps() {return this.config.maps}

    triggerResize() {
        if (this.timerResize) clearTimeout(this.timerResize);
        setTimeout(_ => {
            this.timerResize = null;
            this.events.trigger("portal", "resize", this.calculatePortalSize())
        }, 300)
    }
    calculatePortalSize() {
        let width = document.documentElement.clientWidth;
        let height = document.documentElement.clientHeight;
        let size, sizeLevel;
        if (width <768) {size = "xs"; sizeLevel = 0;}
        else if (width < 992) {size = "s"; sizeLevel = 1;}
        else if (width < 1280) {size = "m"; sizeLevel = 2;}
        else if (width < 1366) {size = "l"; sizeLevel = 3;}
        else if (width < 1920) {size = "xl"; sizeLevel = 4;}
        else {size = "xxl"; sizeLevel = 5;}
        this.size = {width, height, size, sizeLevel};
        return this.size;
    }
}

window.geoos = new GEOOS();