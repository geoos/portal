class UserObjectProperties extends ZCustomController {
    onThis_init(userObject) {
        this.userObject = userObject;
        this.edUserObjectName.value = userObject.name;
    }    

    onEdUserObjectName_change() {
        let newName = this.edUserObjectName.value;
        if (newName.trim().length > 2) {
            this.userObject.name = newName;
            window.geoos.events.trigger("userObject", "rename", this.userObject);
        }
    }
}
ZVC.export(UserObjectProperties);