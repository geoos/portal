const MongoClient = require('mongodb').MongoClient;

class MongoDB {
    static instance() {
        if (MongoDB.singleton) return MongoDB.singleton;
        MongoDB.singleton = new MongoDB();
        return MongoDB.singleton;
    }

    constructor() {
        this.client = null;
        this.databaseURL = process.env.MONGO_URL;
        this.databaseName = process.env.MONGO_DATABASE;
        this.db = null;        
    }
    get connected() {return this.client?true:false}

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async init() {
        try {
            this.client = new MongoClient(this.databaseURL, {useNewUrlParser:true, useUnifiedTopology:true});
            await this.client.connect();
            this.db = this.client.db(this.databaseName); 
        } catch(error) {
            console.error("[MongoDB] Cannot connect to Database '" + this.databaseName + "'");
            console.error(error);
            throw error;
        }
    }

    collection(name) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject("MongoDB connection to '" + this.databaseName + "' not initialized");
                return;
            }
            this.db.collection(name, (err, col) => {
                if (err) reject(err);
                else resolve(col);
            });
        });
    }
}

module.exports = MongoDB.instance();