var icon_path = {true: 'img/icon_enabled.png', false: 'img/icon_disabled.png'};
var header    = {name: 'X-Adzerk-Explain'};
var urlParser = document.createElement('a');
var enabled   = false;
var apikey    = '';

function urlPath(url) {
  urlParser.href = url;
  return urlParser.pathname;
}

function evalTab(str) {
  chrome.tabs.executeScript(null, {code: str});
}

function hex2buf(hex) {
  return forge.util.createBuffer(forge.util.hexToBytes(hex), 'raw');
}

function md(algo, str) {
  return forge.md[algo].create().update(str).digest().toHex().toUpperCase();
}

function sha1(str) {
  return md('sha1', str);
}

function sha256(str) {
  return md('sha256', str);
}

function hmac(str, key) {
  var hmac = forge.hmac.create();
  hmac.start('sha256', key);
  hmac.update(str);
  return hmac.digest().toHex();
}

function decrypt(msg, key) {
  var decipher, [iv, ciphertxt, mac] = msg.split(':');
  if (hmac(iv + ciphertxt, apikey) == mac) {
    decipher = forge.cipher.createDecipher('AES-CBC', hex2buf(sha256(key)));
    decipher.start({iv: hex2buf(iv)});
    decipher.update(hex2buf(ciphertxt));
    if (decipher.finish())
      return forge.util.decodeUtf8(decipher.output);
  }
}

function getConfig() {
  chrome.storage.local.get('enabled', function(items) {
    enabled = !!(items||{}).enabled;
    updateIcon();
  });
  chrome.storage.sync.get({apikey: ''}, function(items) {
    apikey = sha1(items.apikey);
  });
}

function updateIcon() {
  chrome.browserAction.setIcon({path: icon_path[enabled]});
}

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
  if (enabled && urlPath(details.url) === '/ados') {
    var now = '' + new Date().valueOf();
    header.value = now + ':' + hmac(now, apikey);
    details.requestHeaders.push(header);
  }
  return {requestHeaders: details.requestHeaders};
}, {urls: ['<all_urls>']}, ['blocking', 'requestHeaders']);

chrome.browserAction.onClicked.addListener(function(tab) {
  enabled = !enabled;
  chrome.storage.local.set({enabled: enabled});
  updateIcon();
});

chrome.storage.onChanged.addListener(function(changes, areaName) {
  if (areaName === 'sync' && changes.apikey)
    apikey = sha1(changes.apikey.newValue);
});

chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == 'ados_explainer');
  port.onMessage.addListener(function(msg) {
    var data = decrypt(msg, apikey), code;
    if (data) {
      evalTab(`(function() {
        var k, ados_explain = JSON.parse(${JSON.stringify(data)});
        for (k in ados_explain) {
          window.console.group("Ados Explainer -- DIV " + k + ":");
          window.console.log("Buckets:", ados_explain[k].buckets);
          window.console.log("RTB Log:", ados_explain[k].rtb_log);
          window.console.table(ados_explain[k].results);
          window.console.groupEnd();
        }
      })();`);
    }
  });
});

getConfig();
