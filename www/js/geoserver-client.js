class GEOServerClient {
    constructor(serverURL) {        
        this.serverURL = serverURL;
        this.workingListener = null;
        this.nWorking = 0;
    }

    setServerURL(serverURL) {
        this.serverURL = serverURL
        if (this.serverURL.endsWith("/")) this.serverURL = this.serverURL.substr(0, this.serverURL.length - 1);
    }
    setWorkingListener(l) {this.workingListener = l}

    async _incWorking() {
        if (++this.nWorking == 1 && this.workingListener) await this.workingListener.start();   
    }
    async _decWorking() {
        if (!(--this.nWorking) && this.workingListener) await this.workingListener.stop();
    }

    _getJSON(url, args, signal) {
        let urlArgs = "";
        for (const argName in args) {
            urlArgs = urlArgs?(urlArgs + "&"):"?";
            urlArgs += argName + "=" + encodeURI(args[argName]);
        }
        this._incWorking();
        return new Promise((resolve, reject) => {
            fetch(this.serverURL + "/" + url + urlArgs, {signal:signal})
                .then(res => {
                    if (res.status != 200) {
                        this._decWorking()
                        res.text()
                            .then(txt => reject(txt))
                            .catch(_ => reject(res.statusText))
                        return;
                    }
                    res.json()
                        .then(json => {this._decWorking(); resolve(json)})
                        .catch(err => {this._decWorking(); reject(err)})
                })
                .catch(err => {
                    console.log("falla fetch")
                    this._decWorking();
                    reject(err.name == "AbortError"?"aborted":err)
                });
        })
    }
    async readMetadata() {
        this.metadata = await this._getJSON("metadata");
        return this.metadata;
    }

    formatValue(dataSetCode, varCode, value, includeUnit = true) {
        let dataSet = this.metadata.dataSets.find(ds => ds.code == dataSetCode);
        if (!dataSet) throw "DataSet '" + dataSetCode + "' not found"
        let variable = dataSet.variables.find(v => v.code == varCode);
        if (!variable) throw "Variable '" + varCode + "' not found in DataSet '" + dataSetCode + "'"
        let decimals = variable.options.decimals || 2
        let pow = Math.pow(10, decimals);
        let txt = Math.floor(value * pow) / pow + "";
        if (includeUnit) txt += "[" + variable.unit + "]";
        return txt;
    }


    // Raster
    valueAtPoint(dataSetCode, varCode, time, lat, lng, level) {
        let controller = new AbortController();
        return {
            promise:this._getJSON(dataSetCode + "/" + varCode + "/valueAtPoint", {time, lat, lng, level}, controller.signal),
            controller:controller
        }
    }

    isolines(dataSetCode, varCode, time, n, w, s, e, level) {
        let controller = new AbortController();
        return {
            promise:this._getJSON(dataSetCode + "/" + varCode + "/isolines", {time, n, w ,s, e, level}, controller.signal),
            controller:controller
        }
    }
    isobands(dataSetCode, varCode, time, n, w, s, e, level) {
        let controller = new AbortController();
        return {
            promise:this._getJSON(dataSetCode + "/" + varCode + "/isobands", {time, n, w ,s, e, level}, controller.signal),
            controller:controller
        }
    }
    grid(dataSetCode, varCode, time, n, w, s, e, margin, level) {
        let controller = new AbortController();
        return {
            promise:this._getJSON(dataSetCode + "/" + varCode + "/grid", {time, n, w ,s, e, margin, level}, controller.signal),
            controller:controller
        }
    }
    vectorsGrid(dataSetCode, varCode, time, n, w, s, e, margin) {
        let controller = new AbortController();
        return {
            promise:this._getJSON(dataSetCode + "/" + varCode + "/vectorsGrid", {time, n, w ,s, e, margin}, controller.signal),
            controller:controller
        }
    }

    // GeoJson
    fileMetadata(dataSetCode, fileName, time) {
        let controller = new AbortController();
        return {
            promise:this._getJSON(dataSetCode + "/" + fileName + "/metadata", {time}, controller.signal),
            controller:controller
        }
    }
    fileGeoJson(dataSetCode, fileName, time) {
        let controller = new AbortController();
        return {
            promise:this._getJSON(dataSetCode + "/" + fileName + "/geoJson", {time}, controller.signal),
            controller:controller
        }
    }
    fileGeoJsonTile(dataSetCode, fileName, time, z, x, y) {
        let controller = new AbortController();
        return {
            promise:this._getJSON(dataSetCode + "/" + fileName + "/tile/" + z + "/" + x + "/" + y, {time:time?time:0}, controller.signal),
            controller:controller
        }
    }
}