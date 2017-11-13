var apikey;

function button_state() {
  var save = document.getElementById('save');
  var inpt = document.getElementById('apikey');
  if (inpt.value !== apikey)
    save.removeAttribute('disabled');
  else
    save.setAttribute('disabled', 'disabled');
}

function save_apikey() {
  apikey = document.getElementById('apikey').value;
  chrome.storage.sync.set({apikey: apikey}, button_state);
}

function restore_options() {
  chrome.storage.sync.get({apikey: ''}, function(items) {
    apikey = items.apikey;
    document.getElementById('apikey').value = items.apikey;
    button_state();
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_apikey);
document.getElementById('apikey').addEventListener('keyup', button_state);
