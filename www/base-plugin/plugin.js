class GEOOSBasePlugin extends GEOOSPlugIn {
    get code() {return "base"}    
    get includeFiles() {return [
        "analysis/object-properties.js", "analysis/time-serie.js",
        "tools/3d-chart.js", "tools/3d-terrain-clouds.js", "tools/distance.js"
    ]}
}

(new GEOOSBasePlugin())