const ZModule = require("./z-server").ZModule;
const config = require("./Config");
const mongo = require("./MongoDB");
const fetch = require("node-fetch");

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
            zRepoServers:config.getZRepoServers(),
            groups:config.getGroups(),
            plugins:config.getPlugins()
        }
    }

    generateLinkToken() {
        const chars = "abcdefghijklmnopqrstuvwxyz01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
              tokenLength = 10;
        let token = "";
        while(token.length < tokenLength) token += chars.substr(parseInt(chars.length * Math.random()), 1);
        return token;
    }
    async createLink(content) {
        try {
            let col = await mongo.collection("links");
            let doc = {_id:this.generateLinkToken(), content:content, time:Date.now()}
            await col.insertOne(doc);
            return doc._id;
        } catch (error) {
            throw error;
        }
    }
    async getLinkContent(link) {
        try {
            let col = await mongo.collection("links");
            let doc = await col.findOne({_id:link});
            return doc?doc.content:null;
        } catch (error) {
            throw error;
        }
    }

    async findLocations(lat, lng, filter) {
        try {
            let apiKey = config.getHEREAPIKey();
            if (!apiKey) throw "No se ha configurado hereAPIKey";
            let txt = encodeURIComponent(filter);
            let maxResults = 100;
            let url = `https://places.sit.ls.hereapi.com/places/v1/autosuggest?at=${lat},${lng}&size=${maxResults}&q=${txt}&apiKey=${apiKey}&result_types=address`;
            let places = await (await fetch(url)).json();
            return places;
        } catch(error) {
            console.error(error);
            throw error;
        }
    }
}

module.exports = Portal.instance;