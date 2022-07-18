class WAnim extends ZDialog {
    onThis_init(options) {       
        this.grpRunning.hide();
        this.nFrames = 0;
        if (!window.geoos.anim) window.geoos.anim = {};
        if (!window.geoos.anim.fps) window.geoos.anim.fps = 5;
        if (!window.geoos.anim.title) window.geoos.anim.title = "";
        if (!window.geoos.anim.format) window.geoos.anim.format = "DD/MM/YYYY HH:mm";
        this.edFPS.value = window.geoos.anim.fps;
        this.edTitle.value = window.geoos.anim.title;
        this.edFormat.value = window.geoos.anim.format;
        this.timePanel = options.timePanel;
    }
    onThis_deactivated() {
        window.geoos.interactions.clearDecorations();
        console.log("deactivated");
    }
    onCmdCloseInfoWindow_click() {
        this.cancelled = true;
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancelled = true;
        this.cancel()
    }

    async onCmdOk_click() {
        try {
            await this.animate();  
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()})
        }
        this.cmdOk.enable();
    }

    setEstado(estado) {this.estado.text = estado}
    setProgreso(porcentaje) {this.progress.view.style.width = porcentaje + "%";}
    setMensaje(mensaje) {this.mensaje.text = mensaje}

    // https://gist.github.com/ilblog/5fa2914e0ad666bbb85745dbf4b3f106
    async animate() {
        if (!window.geoos.anim || isNaN(window.geoos.anim.start) || isNaN(window.geoos.anim.end)) {
            this.showDialog("common/WError", {message:"Debe fijar el tiempo de inicio y de término antes de generar la animación"});
            return;
        }
        let start = window.geoos.anim.start;
        let end = window.geoos.anim.end;
        if (start >= end) {
            this.showDialog("common/WError", {message:"Debe fijar el tiempo de término después del tiempo de inicio"});
            return;
        }

        this.cmdOk.disable();
        window.geoos.anim.fps = parseInt(this.edFPS.value);
        window.geoos.anim.title = this.edTitle.value.trim();
        window.geoos.anim.format = this.edFormat.value;

        this.grpRunning.show();
        this.setEstado("Generando ...");
        this.setProgreso(0);
        this.setMensaje("Generando cuadros ...");
        this.timePanel.callSetTime(start);
        await this.timePanel.sleep(200);
        let ultimoTiempoFrame = 200 + await this.timePanel.waitForLayers();
        const images = [];
        let imgWidth, imgHeight;
        let size = window.geoos.mapPanel.size;
        while (window.geoos.time < end) {
            this.setProgreso((window.geoos.time - start) / (end - start) * 100);
            this.setMensaje("Cuadro " + (++this.nFrames) + " generado en " + ultimoTiempoFrame + " [ms]");
            // Decoraciones
            if (window.geoos.anim.title) window.geoos.interactions.setTitle(size.width, size.height, window.geoos.anim.title);
            if (window.geoos.anim.format) window.geoos.interactions.setTime(size.width, size.height, window.geoos.time, window.geoos.anim.format);
            // Tomar foto
            let canvas = await window.geoos.mapPanel.getPicture();
            window.geoos.interactions.clearDecorations();
            if (!imgWidth) imgWidth = canvas.width;
            if (!imgHeight) imgHeight = canvas.height;            
            const imgString = canvas.toDataURL('image/jpeg', 1);
            const data = this.timePanel.convertDataURIToBinary(imgString);
            images.push({
                name: `img${ this.timePanel.pad( images.length, 3 ) }.jpeg`,
                data
            });

            // Incrementar tiempo
            let days = parseInt(this.timePanel.edSelDays.value);
            let hours = parseInt(this.timePanel.edSelHours.value);
            let minutes = parseInt(this.timePanel.edSelMinutes.value);
            let m = window.geoos.moment.add(days, "days");
            m = m.add(hours, "hours");
            m = m.add(minutes, "minutes");
            window.geoos.moment = m;

            await this.timePanel.sleep(200);

            // Esperar que las capas hayan cargado
            ultimoTiempoFrame = 200 + await this.timePanel.waitForLayers();
            if (this.cancelled) return;
        }
        this.setEstado("Codificando ...");
        this.setProgreso(0);
        this.finalizeVideo(images, imgWidth, imgHeight);
    }

    finalizeVideo(images, w, h) {
        window.ffmpegWorker.onmessage = e => {
            let msg = e.data;
            switch (msg.type) {
                case "stdout":
                    //console.log("ffmpeg: " + msg.data);
                    break
                case "stderr":
                    //console.warn("ffmpeg: " + msg.data);
                    this.setMensaje(msg.data);
                    break;
                case "exit":
                    //console.log("ffmpeg Process exited with code " + msg.data);
                    this.setMensaje(msg.data);
                    //worker.terminate();
                    this.close();
                    break;    
                case 'done':
                    this.setEstado("Generando mp4");
                    this.setMensaje("Espere la descarga");
                    const blob = new Blob([msg.data.MEMFS[0].data], {
                        type: "video/mp4"
                    });
                    this.doneVideo(blob);
                    break;
            }
        };
    
        // https://trac.ffmpeg.org/wiki/Slideshow
        // https://semisignal.com/tag/ffmpeg-js/

        // Ajuste tamaño:
        // https://stackoverflow.com/questions/20847674/ffmpeg-libx264-height-not-divisible-by-2
        let vf = `scale=${Math.ceil(w/2)*2}:${Math.ceil(h/2)*2}`;
        window.ffmpegWorker.postMessage({
            type: 'run',
            TOTAL_MEMORY: 1073741824,
            
            // arguments: ["-r", "20", "-i", "img%03d.jpeg", "-c:v", "libx264", "-crf", "1", "-vf", "scale=150:150", "-pix_fmt", "yuv420p", "-vb", "20M", "out.mp4"],
            arguments: ["-r", "" + window.geoos.anim.fps, "-i", "img%03d.jpeg", "-c:v", "libx264", "-crf", "1", "-vf", vf, "-pix_fmt", "yuv420p", "-vb", "80M", "out.mp4"],
            
            MEMFS: images
        });
        
        // Updated recommented arguments
        /*
                worker.postMessage({
                type: 'run',
                TOTAL_MEMORY: 268435456,
                arguments: [
                    //"-r", opts.state.frameRate.toString(),
                    "-framerate", opts.state.frameRate.toString(),
                    "-frames:v", imgs.length.toString(),
                    "-an", // disable sound
                    "-i", "img%03d.jpeg",
                    "-c:v", "libx264",
                    "-crf", "17", // https://trac.ffmpeg.org/wiki/Encode/H.264
                    "-filter:v",
                    `scale=${w}:${h}`,
                    "-pix_fmt", "yuv420p",
                    "-b:v", "20M",
                    "out.mp4"],
                MEMFS: imgs
            });*/    
    }

    doneVideo(output) {
        const url = webkitURL.createObjectURL(output);
        var element = document.createElement('a');
        element.href = url;
        element.setAttribute('download', "geoos-anim.mp4");
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}
ZVC.export(WAnim);