class GroupProperties extends ZCustomController {
    onThis_init(group) {
        this.group = group;
        this.edGroupName.value = group.name;
    }    

    onEdGroupName_change() {
        let newName = this.edGroupName.value;
        if (newName.trim().length > 2) {
            this.group.name = newName;
            window.geoos.events.trigger("group", "rename", this.group);
        }
    }
}
ZVC.export(GroupProperties);