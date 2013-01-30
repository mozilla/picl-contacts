'use strict';

const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

XPCOMUtils.defineLazyServiceGetter(this, 'cpmm',
                                   '@mozilla.org/childprocessmessagemanager;1',
                                   'nsIMessageSender');

XPCOMUtils.defineLazyServiceGetter(this, 'ppmm',
                                   '@mozilla.org/parentprocessmessagemanager;1',
                                   'nsIMessageListenerManager');

this.Service = function Service() {
  dump('ID Attached Services constructor\n');
};

this.Service.prototype = {
  classID: Components.ID('{9e970f27-a6e4-4b23-a9ba-2f82b075990f}'),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  init: function myfxContacts_init() {

    // The ContactManager saves contact data passed into the dom by 
    // messaging down to the ContactService.  By subscribing to these
    // messages, we can get the complete payload of saved and modified
    // contacts.
    this._contactManagerMessages = [
      'Contacts:Find',
      'Contacts:Clear',
      'Contact:Save',
      'Contact:Remove',
    ];

    // The ContactService interacts with the ContactDB (indexedDB layer).
    // It receives messages and data from the ContactManager that tell it
    // to find, save, remove, or clear all contacts.  On success it returns
    // an OK message, and on failure a corresponding KO message.  There is 
    // a possibility here to save to MyFirefox contact data that couldn't
    // be saved for one reason or another to the device.  This could be
    // useful.  It could also be confusing.
    this._contactServiceMessages = [
      'Contact:Find:Return:OK',
      'Contact:Save:Return:OK',
      'Contact:Clear:Return:OK',
      'Contact:Remove:Return:OK',
      'Contact:Find:Return:KO',
      'Contact:Save:Return:KO',
      'Contact:Clear:Return:KO',
      'Contact:Remove:Return:KO'
    ];

    this._contactManagerMessages.forEach((function(msgName) {
      dump('** myfx-contacts binding ppmm: ' + msgName + '\n');
      ppmm.addMessageListener(msgName, this);
    }).bind(this));

    this._contactServiceMessages.forEach((function(msgName) {
      dump('** myfx-contacts binding cpmm: ' + msgName + '\n');
      cpmm.addMessageListener(msgName, this);
    }).bind(this));
  },

  uninit: function myfxContacts_uninit() {
    try {
      for (let msgName of this._contactManagerMessages) {
        dump('** myfx-contacts removing ppmm listener: ' + msgName + '\n');
        ppmm.removeMessageListener(msgName, this);
      }
    } catch (err) {
      dump('** WARNING: myfx-contacts: ppmm listener already removed: ' + err);
      // ok if this gets called upwards of one time
    }

    try {
      for (let msgName of this._contactServiceMessages) {
        dump('** myfx-contacts removing cpmm listener: ' + msgName + '\n');
        cpmm.removeMessageListener(msgName, this);
      }
    } catch (err) {
      dump('** WARNING: myfx-contacts: cpmm listener already removed: ' + err);
      // ok if this gets called upwards of one time
    }
  },

  save: function myfxContacts_save(data) {
    dump('** myfx-contacts: todo: push to cloud: ' + JSON.stringify(data) + '\n');
  },

  remove: function myfxContacts_remove(data) {
    // XXX nb, there doesn't currently seem to be a way to remove 
    // contacts using the FXOS Contacts app
    dump('** myfx-contacts: todo: push to cloud: ' + JSON.stringify(data) + '\n');
  },  

  clear: function myfxContacts_clear(data) {
    // What do do?
  },

  receiveMessage: function(aMessage) {
    dump('** myfx-contacts received: ' + aMessage.name + '\n');

    switch (aMessage.name) {
      case 'Contacts:Clear':
        this.clear();
        break;
      case 'Contact:Save':
        this.save(aMessage.json);
        break;
      case 'Contact:Remove':
        this.remove(aMessage.json);
        break;
      default:
        dump('** myfx-contacts: no action for ' + aMessage.name + '\n');
        break;
    }
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([Service]);

this.MyFirefox = new Service();
