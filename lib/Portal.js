const ZModule = require("./z-server").ZModule;
const config = require("./Config");
const mongo = require("./MongoDB");
const fetch = require("node-fetch");
const mailer = require("./Mailer");
const bcrypt = require('bcryptjs');

const codeChars = "0123456789";
const tokenChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_()-.,";

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
            plugins:config.getPlugins(),
            defaultGroupLayers:config.getDefaultGroupLayers()
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

    async createFavo(content) {
        try {
            let col = await mongo.collection("favorites");
            //crea un id correlativo
            let doc = {content:content, time:Date.now()}
            await col.insertOne(doc);
            //return doc._id;
        } catch (error) {
            throw error;
        }
    }
    async getFavoContent() {
        try {
            let col = await mongo.collection("favorites");
            let doc = await col.find( {} );
            return doc?doc.content:null;
        } catch (error) {
            throw error;
        }
    }

    generaCodigoRandom(length = 6) {
        let st = "";
        while (st.length < length) {
            st += codeChars[parseInt(codeChars.length * Math.random())]
        }
        return st;
    }
    generaToken(length = 20) {
        let st = "";
        while (st.length < length) {
            st += tokenChars[parseInt(tokenChars.length * Math.random())]
        }
        return st;
    }
    encript(pwd) {
        return new Promise((onOk, onError) => {
            bcrypt.hash(pwd, 8, (err, hash) => {
                if (err) onError(err);
                else onOk(hash);
            });
        });
    }

    async compareWithEncripted(pwd, hash) {
        return await bcrypt.compare(pwd, hash);
    }
    async enviaCodigoRegistro(email) {
        try {            
            if (!config.getConfig().smtp) throw "No se ha configurado un servidor de correo en este portal";
            let colCodes = await mongo.collection("userCode");
            await colCodes.deleteMany({_id:email});
            let colUser = await mongo.collection("user");
            let user = await colUser.findOne({_id:email});
            if (user) throw "El correo ingresado ya se encuentra registrado en GEOOS. Use la opción 'Iniciar Sesión'. Desde ahí puede luego seleccionar 'Olvidó Contraseña' si es necesario.";
            let codigoRegistro = this.generaCodigoRandom();
            await colCodes.deleteOne({_id:email});
            await colCodes.insertOne({_id:email, code:codigoRegistro, time:Date.now()});
            let html = mailer.parseTemplate(config.getConfig().smtp.templateRegistra, {codigoRegistro});
            await mailer.sendMail(email, "Registro de Cuenta en GEOOS", null, html);
        } catch(error) {
            throw error;
        }
    }
    async enviaCodigoRecuperacion(email) {
        try {     
            if (!config.getConfig().smtp) throw "No se ha configurado un servidor de correo en este portal";            
            let colCodes = await mongo.collection("userCode");
            await colCodes.deleteMany({_id:email});
            let colUser = await mongo.collection("user");
            let user = await colUser.findOne({_id:email});
            if (!user) throw "El correo no se encuentra registrado en GEOOS. Use la opción 'Registrarse Aquí'.";
            let codigoRegistro = this.generaCodigoRandom();
            await colCodes.deleteOne({_id:email});
            await colCodes.insertOne({_id:email, code:codigoRegistro, time:Date.now()});
            let html = mailer.parseTemplate(config.getConfig().smtp.templateRecupera, {codigoRegistro});
            await mailer.sendMail(email, "Regenerar Contraseña de Cuenta en GEOOS", null, html);
        } catch(error) {
            throw error;
        }
    }

    async registraUsuario(email, codigoRegistro, nombre, institucion, pwd) {
        try {
            let colUser = await mongo.collection("user");
            let user = await colUser.findOne({_id:email});
            if (user) throw "El usuario con el correo indicado ya se encuentra registrado. Use la opción 'Olvidó Contraseña' desde el panel de inicio de sesión'";
            let colCodes = await mongo.collection("userCode");
            let codeDoc = await colCodes.findOne({_id:email});
            if (!codeDoc || codeDoc.code != codigoRegistro || (Date.now() - codeDoc.time) > 2 * 3600 * 1000) throw "El código ingresado es inválido o está vencido (tiene una duración de 2 horas)";
            let hash = await this.encript(pwd);
            await colUser.insertOne({
                _id:email, nombre:nombre, institucion:institucion, pwd:hash
            })
            await colCodes.deleteOne({_id:email});
        } catch(error) {
            throw error;
        }
    }

    async verificaCodigo(email, codigoRegistro){
        try {
            console.log('verificando codigo', codigoRegistro, email);
            let colCodes = await mongo.collection("userCode");
            let codeDoc = await colCodes.findOne({_id:email});
            console.log("params 1", codeDoc)
            console.log("param 2", codeDoc.code, codeDoc.time);
            if (!codeDoc || codeDoc.code != codigoRegistro || (Date.now() - codeDoc.time) > 2 * 3600 * 1000) {
                throw "El código ingresado es inválido o está vencido (tiene una duración de 2 horas)";
                //return false
            }
            return true;   
        } catch (error) {
            throw error;
        }
    
    }

    async regeneraPwdUsuario(email, codigoRegistro, pwd) {
        try {
            let colUser = await mongo.collection("user");
            let user = await colUser.findOne({_id:email});
            if (!user) throw "El usuario con el correo indicado no se ha registrado en GEOOS.";
            let colCodes = await mongo.collection("userCode");
            let codeDoc = await colCodes.findOne({_id:email});
            if (!codeDoc || codeDoc.code != codigoRegistro || (Date.now() - codeDoc.time) > 2 * 3600 * 1000) throw "El código ingresado es inválido o está vencido (tiene una duración de 2 horas)";
            let hash = await this.encript(pwd);
            await colUser.updateOne({_id:email}, {$set:{pwd:hash}})
            await colCodes.deleteOne({_id:email});
        } catch(error) {
            throw error;
        }
    }

    async saveDatosUsuario(authToken, nombre, institucion, foto, eliminaFoto) {
        try {
            let colSession = await mongo.collection("userSession");
            let sesion = await colSession.findOne({_id:authToken})
            if (!sesion) throw "Sesión de Usuario inválida";
            let colUser = await mongo.collection("user");
            let updateDoc = {nombre:nombre, institucion:institucion};
            if (eliminaFoto) {
                updateDoc.tieneFoto = false;
                updateDoc.foto = null;
            } else if (foto) {
                updateDoc.tieneFoto = true;
                updateDoc.foto = foto;
            }
            await colUser.updateOne({_id:sesion.email}, {$set:updateDoc})
            let u = await colUser.findOne({_id:sesion.email}, {_id:1, institucion:1, nombre:1, tieneFoto:1});
            return {token:authToken,usuario:{email:sesion.email, institucion:u.institucion, nombre:u.nombre, tieneFoto:u.tieneFoto}}
        } catch(error) {
            throw error;
        }
    }
    async getFotoPerfil(email) {
        try {
            let colUsuario = await mongo.collection("user");
            let doc = await colUsuario.findOne({_id:email}, {foto:1});
            if (!doc) return null;
            return doc.foto;
        } catch(error) {
            throw error;
        }
    }

    async login(email, pwd) {
        const invalidMessage = "Usuario o Contraseña Inválidos";
        try {
            //await new Promise(resolve => setTimeout(_ => resolve(), 2000));
            let colUser = await mongo.collection("user");
            let user = await colUser.findOne({_id:email}, {_id:1, institucion:1, nombre:1, tieneFoto:1, pwd:1});
            if (!user) throw invalidMessage;
            let valid = await this.compareWithEncripted(pwd, user.pwd);
            if (!valid) throw invalidMessage;
            // Buscar token existente y reutilizarlo
            let colSession = await mongo.collection("userSession");
            let session = await colSession.findOne({email:email});
            if (session) {
                await colSession.updateOne({_id:session._id}, {$set:{lastLogin:Date.now()}})
                return {token:session._id,usuario:{email:email, institucion:user.institucion, nombre:user.nombre, tieneFoto:user.tieneFoto}}
            } else {
                let token = this.generaToken();
                await colSession.insertOne({_id:token, email:email, lastLogin:Date.now()});
                return {token:token,usuario:{email:email, institucion:user.institucion, nombre:user.nombre, tieneFoto:user.tieneFoto}}
            }
        } catch(error) {
            throw error;
        }
    }

    async autoLogin(token) {
        try {            
            let colSession = await mongo.collection("userSession");
            let s = await colSession.findOne({_id:token});
            if (!s) throw "Sesión no encontrada";
            let colUser = await mongo.collection("user");
            let user = await colUser.findOne({_id:s.email}, {_id:1, institucion:1, nombre:1, tieneFoto:1});
            if (!user) throw "Usuario no existe";
            await colSession.updateOne({_id:s._id}, {$set:{lastLogin:Date.now()}})
            return {token:s._id,usuario:{email:s.email, institucion:user.institucion, nombre:user.nombre, tieneFoto:user.tieneFoto}}
        } catch(error) {
            throw error;
        }
    }

    async logout(authToken) {
        try {            
            let colSession = await mongo.collection("userSession");
            await colSession.deleteOne({_id:authToken})
        } catch(error) {
            throw error;
        }
    }

    async cambiaPwd(authToken, pwd, newPwd) {
        try {            
            let colSession = await mongo.collection("userSession");
            let s = await colSession.findOne({_id:authToken});
            if (!s) throw "No autorizado";
            let colUser = await mongo.collection("user");
            let user = await colUser.findOne({_id:s.email});
            if (!user) throw "Usuario no existe";
            let valid = await this.compareWithEncripted(pwd, user.pwd);
            if (!valid) throw "La Contraseña actual es inválida";
            let hash = await this.encript(newPwd);
            await colUser.updateOne({_id:s.email}, {$set:{pwd:hash}});
        } catch(error) {
            throw error;
        }
    }

    async getUserConfig(authToken) {
        try {            
            let colSession = await mongo.collection("userSession");
            let s = await colSession.findOne({_id:authToken});
            if (!s) throw "Sesión Inválida";
            let colConfig = await mongo.collection("userConfig");
            let c = await colConfig.findOne({_id:s.email});
            if (!c) return null;
            return c.config;
        } catch(error) {
            throw error;
        }
    }
    async saveUserConfig(authToken, config) {
        try {            
            let colSession = await mongo.collection("userSession");
            let s = await colSession.findOne({_id:authToken});
            if (!s) throw "Sesión Inválida";
            let colConfig = await mongo.collection("userConfig");
            await colConfig.updateOne({_id:s.email}, {$set:{config:config}}, {upsert:true});
        } catch(error) {
            throw error;
        }
    }
}

module.exports = Portal.instance;