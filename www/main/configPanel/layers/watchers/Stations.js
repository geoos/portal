class Stations extends ZCustomController {
    onThis_init(layer) {
        this.layer = layer;
        this.refresh();
    }

    refresh(){
        let html_n = "";
        let html_c = "";
        let html_s = "";
        let html_a = "";

        for(let i of this.layer.points){
            console.log("estaciones:", i);
            if(i.lat > -33.85){
                html_n += "<li>"+ i.station.name +"</li>";
            }else if(i.lat <= -33.85 && i.lat > -38){
                html_c += "<li>" + i.station.name + "</li>";
            }else if(i.lat <= -38 && i.lat > -43){
                html_s += "<li>" + i.station.name + "</li>";
            }else{
                html_a += "<li>" + i.station.name + "</li>";
            }
        }
        this.cont_norte.html = html_n;
        this.cont_centro.html = html_c;
        this.cont_sur.html = html_s;
        this.cont_austral.html = html_a;
    }
}
ZVC.export(Stations)