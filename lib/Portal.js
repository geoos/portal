const ZModule = require("./z-server").ZModule;
const config = require("./Config");

class Portal extends ZModule {
    static get instance() {
        if (Portal.singleton) return Portal.singleton;
        Portal.singleton = new Portal();
        return Portal.singleton;
    }

    getPortalConfig() {
        return {
            maps:config.getBaseMaps(),
            geoServers:config.getGeoServers(),
            groups:config.getGroups()
        }
    }
}

module.exports = Portal.instance;