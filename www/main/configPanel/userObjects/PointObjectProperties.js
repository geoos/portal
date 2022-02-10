class PointObjectProperties extends ZCustomController {
    onThis_init(userObject) {
        console.log("userObject", userObject);
        this.userObject = userObject;
        this.refresh();
        this.movedListener = id => {
            if (id == this.userObject.id || (this.userObject.parentObject && this.userObject.parentObject.id == id)) {
                this.refresh();
            }
        }
    }
    onThis_activated() {
        window.geoos.events.on("userObject", "moved", this.movedListener);
    }
    onThis_deactivated() {
        window.geoos.events.remove(this.movedListener);
    }

    refresh() {
        this.edUserObjectName.value = this.userObject.name;
        this.edLatitud.value = this.userObject.lat;
        this.edLongitud.value = this.userObject.lng;
    }

    onEdUserObjectName_change() {
        let newName = this.edUserObjectName.value;
        if (newName.trim().length > 2) {
            this.userObject.name = newName;
            window.geoos.events.trigger("userObject", "rename", this.userObject);
        }
    }

    onEdLatitud_change() {
        let lat = parseFloat(this.edLatitud.value);
        if (!isNaN(lat) && lat >= -90 && lat <= 90) {
            this.userObject.positioned(lat, this.userObject.lng);
        }
    }
    onEdLongitud_change() {
        let lng = parseFloat(this.edLongitud.value);
        if (!isNaN(lng) && lng >= -180 && lng <= 180) {
            this.userObject.positioned(this.userObject.lat, lng);            
        }
    }
}
ZVC.export(PointObjectProperties);