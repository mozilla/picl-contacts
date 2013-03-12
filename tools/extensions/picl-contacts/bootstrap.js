
'use strict';

function startup(data, reason) {
  dump("** picl-contacts: startup\n");
  dump("          reason: " + reason + "\n");
  const Cu = Components.utils;
  const contentURL = 'chrome://picl-contacts.js/content/picl-contacts.js';
  const completerURL = 'chrome://picl-contacts.js/content/ContactsSearch.jsm';

  Cu.import('resource://gre/modules/Services.jsm');

  let context = {};
  Services.scriptloader.loadSubScript(contentURL, context);
  context.PiclContacts.init();

  dump("*starging completer service\n");
  try {
  Services.scriptloader.loadSubScript(completerURL, context);
  context.Completer.init();
  } catch(err) {
    dump("oh noes\n");
    dump(err);
    dump("\n * * * ** *\n");
  }

  dump('picl-contacts startup done\n');
}

function shutdown(data, reason) {
  dump("** picl-contacts: shutdown\n");
  dump("          reason: " + reason + "\n");
}

function install(data, reason) {
  dump("** picl-contacts: install\n");
  dump("          reason: " + reason + "\n");
}

function uninstall(data, reason) {
  dump("** picl-contacts: uninstall\n");
  dump("          reason: " + reason + "\n");
}

