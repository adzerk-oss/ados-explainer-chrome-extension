var port = chrome.runtime.connect({name: "ados_explainer"});

window.addEventListener('message', function(event) {
  var data = event.data.ados_explainer;
  if (event.source == window && data) port.postMessage(data);
});

