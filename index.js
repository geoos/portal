const config = require("./lib/Config");

async function startHTTPServer() {
    try {
        await (require("./lib/MongoDB")).init();
        const zServer = require("./lib/z-server");
        const express = require('express');
        const app = express();
        const bodyParser = require('body-parser');
        const http = require('http');
        const portal = require("./lib/Portal");

        zServer.registerModule("geoos", portal);

        app.use("/", express.static(__dirname + "/www"));
        app.use(bodyParser.urlencoded({limit: '50mb', extended:true}));
        app.use(bodyParser.json({limit: '50mb', extended: true}));
        app.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
            next();
        });
        
        app.post("/*.*", (req, res) => zServer.resolve(req, res));     

        app.get("/fotoPerfil/:email", async (req, res) => {
            let email = req.params.email;
            let foto = await portal.getFotoPerfil(email);
            if (foto) {
                let regex = /^data:.+\/(.+);base64,(.*)$/;
                let matches = foto.match(regex);
                let contentType = matches[1];
                let data = matches[2];
                let buffer = Buffer.from(data, 'base64');
                res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                res.setHeader('Content-Type', "image/" + contentType);
                res.status(200);
                res.send(buffer);
            } else {
                res.sendStatus(404);
            }
        });

        app.get("/fotoBiblio/:id", async (req, res) => {
            let id = req.params.id;
            let foto = await portal.getFotoCapaBiblio(id);
            if (foto) {
                let regex = /^data:.+\/(.+);base64,(.*)$/;
                let matches = foto.match(regex);
                let contentType = matches[1];
                let data = matches[2];
                let buffer = Buffer.from(data, 'base64');
                res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                res.setHeader('Content-Type', "image/" + contentType);
                res.status(200);
                res.send(buffer);
            } else {
                res.sendStatus(404);
            }
        });

        let webServerConfig = config.getWebServerConfig();
        if (webServerConfig.http) {
            let port = webServerConfig.http.port;
            httpServer = http.createServer(app);
            httpServer.listen(port, "::", _ => {
                console.log("[GEOOS HTTP Server 0.88] Listenning at Port " + port);
            });
        }
    } catch(error) {
        console.error("Can't start HTTP Server", error);
        process.exit(-1);
    }
}

startHTTPServer();
 