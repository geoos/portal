const config = require("./lib/Config");

async function startHTTPServer() {
    try {
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

        let webServerConfig = config.getWebServerConfig();
        if (webServerConfig.http) {
            let port = webServerConfig.http.port;
            httpServer = http.createServer(app);
            httpServer.listen(port, "0.0.0.0", _ => {
                console.log("[GEOOS HTTP Server 0.31] Listenning at Port " + port);
            });
        }
    } catch(error) {
        console.error("Can't start HTTP Server", error);
    }
}

startHTTPServer();
 