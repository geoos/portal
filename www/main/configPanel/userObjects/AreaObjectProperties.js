class AreaObjectProperties extends ZCustomController {
    onThis_init(userObject) {
        this.userObject = userObject;
        this.refresh();
        this.movedListener = uo => {
            if (uo.id == this.userObject.id || (this.userObject.parentObject && this.userObject.parentObject.id == uo.id)) {
                this.refresh();
            }
        }
        this.lockedListener = uo => {
            if (uo.id == this.userObject.id || (this.userObject.parentObject && this.userObject.parentObject.id == uo.id)) {
                this.refresh();
            }
        }
    }

    onThis_activated() {
        window.geoos.events.on("userObject", "moved", this.movedListener);
        window.geoos.events.on("userObject", "lockChange", this.lockedListener);
    }

    onThis_deactivated() {
        window.geoos.events.remove(this.movedListener);
        window.geoos.events.remove(this.lockedListener);
    }

    onEdUserObjectName_change() {
        let newName = this.edUserObjectName.value;
        if (newName.trim().length > 2) {
            this.userObject.name = newName;
            window.geoos.events.trigger("userObject", "rename", this.userObject);
        }
    }

    refresh() {
        this.edUserObjectName.value = this.userObject.name;
        this.edLatitudMin.value = this.userObject.lat0;
        this.edLatitudMax.value = this.userObject.lat1;
        this.edLongitudMin.value = this.userObject.lng0;
        this.edLongitudMax.value = this.userObject.lng1;

        const isLocked = this.userObject.locked;
        if (isLocked){
            this.edLatitudMin.disable();
            this.edLatitudMax.disable();
            this.edLongitudMin.disable();
            this.edLongitudMax.disable();
            this.lockedLbl.show();
        }else{
            this.edLatitudMin.enable();
            this.edLatitudMax.enable();
            this.edLongitudMin.enable();
            this.edLongitudMax.enable();
            this.lockedLbl.hide();
        }
    }

    onEdLatitudMin_change() {
        let lat = parseFloat(this.edLatitudMin.value);
        if (!isNaN(lat) && lat >= -90 && lat <= 90) {
            this.userObject.lat0 = lat;
            this.userObject.positioned(null, null, this.userObject.points[0]);
        }
    }

    onEdLatitudMax_change() {
        let lat = parseFloat(this.edLatitudMax.value);
        if (!isNaN(lat) && lat >= -90 && lat <= 90) {
            this.userObject.lat1 = lat;
            this.userObject.positioned(null, null, this.userObject.points[0]);
        }
    }

    onEdLongitudMin_change() {
        let lng = parseFloat(this.edLongitudMin.value);
        if (!isNaN(lng) && lng >= -180 && lng <= 180) {
            this.userObject.lng0 = lng;
            this.userObject.positioned(null, null, this.userObject.points[0]);
        }
    }

    onEdLongitudMax_change() {
        let lng = parseFloat(this.edLongitudMax.value);
        if (!isNaN(lng) && lng >= -180 && lng <= 180) {
            this.userObject.lng1 = lng;
            this.userObject.positioned(null, null, this.userObject.points[0]);
        }
    }

}
ZVC.export(AreaObjectProperties);