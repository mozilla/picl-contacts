'use strict';

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

XPCOMUtils.defineLazyServiceGetter(this, 'cpmm',
                                   '@mozilla.org/childprocessmessagemanager;1',
                                   'nsIMessageSender');

this.Service = function Service() {
  dump('ID Attached Services constructor\n');
};

this.Service.prototype = {
  classID: Components.ID('{9e970f27-a6e4-4b23-a9ba-2f82b075990f}'),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  init: function myfxContacts_init() {
    dump('** myfx-contacts: service.init()\n');
    this._messages = [
      'Contacts:Find',
      'Contacts:Clear',
      'Contact:Save',
      'Contact:Remove',

      'Contact:Save:Return:OK',
      'Contact:Clear:Return:OK',
      'Contact:Remove:Return:OK'
    ];

    this._messages.forEach((function(msgName) {
      dump('** myfx-contacts binding message: ' + msgName + '\n');
      cpmm.addMessageListener(msgName, this);
    }).bind(this));
  },

  uninit: function myfxContacts_uninit() {
    try {
      for (let msgName of this._messages) {
        cpmm.removeMessageListener(msgName, this);
      }
    } catch (err) {
      // ok if this gets called upwards of one time
    }
  },

  receiveMessage: function(aMessage) {
    dump('** myfx-contacts received: ' + aMessage.name + '\n');

    switch (aMessage.name) {
      case 'Contacts:Find':
      case 'Contacts:Clear':
      case 'Contact:Save':
      case 'Contact:Remove':
        dump('** interesting message!\n');
        break;
      default:
        dump('** uninteresting message\n');
        break;
    }
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([Service]);

this.MyFirefox = new Service();
