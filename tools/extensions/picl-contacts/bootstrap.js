
'use strict';

function startup(data, reason) {
  const Cu = Components.utils;
  const contentURL = 'chrome://picl-contacts.js/content/picl-contacts.js';
  const completerURL = 'chrome://picl-contacts.js/content/ContactsSearch.jsm';

  Cu.import('resource://gre/modules/Services.jsm');

  let context = {};
  try {
    Services.scriptloader.loadSubScript(contentURL, context);
    context.PiclContacts.init();

    Services.scriptloader.loadSubScript(completerURL, context);
    context.ContactsCompleter.init();
  } catch(err) {
    dump("ERROR starting services for picl-contacts: " + err + "\n");
  }
}

function shutdown(data, reason) {
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

