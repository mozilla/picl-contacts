
'use strict';

function startup(data, reason) {
  const Cu = Components.utils;
  Cu.import('resource://gre/modules/Services.jsm');

  const contentURL = 'chrome://myfx-contacts.js/content/myfx-contacts.js';
  let myfx = {};
  Services.scriptloader.loadSubScript(contentURL, myfx);
  dump("myfx has: " + Object.keys(myfx) + "\n");
  myfx.MyFirefox.init();

  dump('** myfx startup done\n');
}

function shutdown(data, reason) {
}

function install(data, reason) {
}

function uninstall(data, reason) {
}

