const config = require("./Config");
const nodemailer = require("nodemailer");
const smtpTransport = require('nodemailer-smtp-transport');


class Mailer {
    static get instance() {
        if (!Mailer.singleton) Mailer.singleton = new Mailer();
        return Mailer.singleton;
    }

    constructor() {
        if (!config.getConfig().smtp || !!config.getConfig().smtp.transport) {
            this.lastConfigTime = 0;
            return;
        }
        this._transport = nodemailer.createTransport(smtpTransport(config.getConfig().smtp.transport));
        this.lastConfigTime = config.lastConfigTime;
    }

    parseTemplate(text, vars) {
        let st = "";
        let i0 = 0;
        let i1 = text.indexOf("${", i0);        
        while (i1 >= 0) {
            let p = text.indexOf("}", i1);
            if (p >= 0) {
                st += text.substring(i0, i1);
                let varName = text.substring(i1+2, p);
                let value = vars[varName];
                if (value !== undefined) {
                    st += value;
                } else {
                    st += "${" + varName + "}";
                }
                i0 = p + 1;
                i1 = text.indexOf("${", i0); 
            } else {
                i1 = -1;
            }
        }
        return st + text.substring(i0);
    }

    sendMail(to, subject, text, html) {
        if (this.lastConfigTime != config.lastConfigTime) {
            if (!config.getConfig().smtp || !config.getConfig().smtp.transport) {
                throw "No se ha configurado un servidor SMTP en este portal";                
            }
            this.lastConfigTime = config.lastConfigTime;
            this._transport = nodemailer.createTransport(smtpTransport(config.getConfig().smtp.transport));
            console.log("*** Recreando transporte SMTP por cambio en configuración");
        }
        return new Promise((onOk, onError) => {
            let message = {
                from: config.getConfig().smtp.from,
                subject: subject,
                to: to,
                text: text,
                html: html
            }
            this._transport.sendMail(message, (err, info) => {
                if (err) {
                    console.error("Error Enviando correo", err);
                    onError("Error enviando el correo: " + err);
                } else { 
                    onOk(info);
                }
            });
        })
    }
}

module.exports = Mailer.instance;