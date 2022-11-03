var zClientURLPrefix = null;
var zClientDefaultErrorHandler = error => console.error(error);
window.zSecurityToken = null;

function zPost(url, args, onOk, onError) {
    if (!onOk && !onError) return zPostProm(url, args);
    let finalUrl = zClientURLPrefix?zClientURLPrefix + url:url;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", finalUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (window.zSecurityToken) {
        xhr.setRequestHeader('Authorization', "Bearer " + window.zSecurityToken);
    }
    xhr.send(JSON.stringify(args?args:{}));
    xhr.onload = () => {
        if (xhr.status != 200) {
            let msg = xhr.responseText?xhr.responseText:xhr.statusText;
            if (onError) onError(msg)
            else zClientDefaultErrorHandler(msg)
            return;
        }
        let rt = xhr.responseText;
        if (!rt) onOk(rt);
        else {
            try {
                let j = JSON.parse(rt);
                onOk(j);
            } catch(error) {
                onOk(JSON.parse(JSON.stringify({value:rt})).value);
            }
        }
    }
    xhr.onerror = () => {
        let msg = xhr.responseText?xhr.responseText:xhr.statusText;
        if (onError) onError(msg)
        else zClientDefaultErrorHandler(msg)
    }
    return xhr;
}

function zPostProm(url, args) {
    return new Promise((onOk, onError) => {
        zPost(url, args, ret => onOk(ret), err => onError(err));
    })
}