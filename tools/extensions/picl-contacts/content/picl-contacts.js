'use strict';

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
const PICL_CONTACTS_SERVER_URL = 'http://127.0.0.1:3000';
// #define NS_RILCONTENTHELPER_CONTRACTID "@mozilla.org/ril/content-helper;1"

// ridiculously short interval for testing
const DEFER_INTERVAL = 1 * 1000;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

XPCOMUtils.defineLazyServiceGetter(this, 'cpmm',
                                   '@mozilla.org/childprocessmessagemanager;1',
                                   'nsIMessageSender');

XPCOMUtils.defineLazyServiceGetter(this, 'ppmm',
                                   '@mozilla.org/parentprocessmessagemanager;1',
                                   'nsIMessageListenerManager');

XPCOMUtils.defineLazyModuleGetter(this, 'DeferredTask', 
                                    'resource://gre/modules/DeferredTask.jsm');

/**
 * stringify() - converts a thing to a string
 * This is a utility function for log()
 */
function stringify(obj) {
  let type = typeof obj;
  let str = '<<' + type + '>>';
  switch (type) {
    case 'object':
      try {
        str = JSON.stringify(obj, null, 2);
      } catch (err) {
        str = '<<object>>';
      }
      break;

    case 'number':
    case 'string':
    case 'boolean':
      str = obj.toString();
      break;

    case 'function':
      str = '<<function>>';
      break;

    default:
      str = '<<something>>';
      break;
  }
  return str;
}

/**
 * Log one or more things in a debugging message
 */
function log(...aMessageArgs) {
  dump('picl-contacts: ' +
       aMessageArgs.map(stringify).join(' ') +
       '\n');
}

this.Service = function Service() {
  log('Hello, world');
};

this.Service.prototype = {
  classID: Components.ID('{9e970f27-a6e4-4b23-a9ba-2f82b075990f}'),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  init: function piclContacts_init() {
    log("** picl is in tha house!");
    this._outboundUpdates = {};

    // The ContactManager saves contact data passed into the dom by
    // messaging down to the ContactService.  By subscribing to these
    // messages, we can get the complete payload of saved and modified
    // contacts.
    this._contactManagerMessages = [
      'Contacts:Find',
      'Contacts:Clear',
      'Contact:Save',
      'Contact:Remove'
    ];

    // The ContactService interacts with the ContactDB (indexedDB layer).
    // It receives messages and data from the ContactManager that tell it
    // to find, save, remove, or clear all contacts.  On success it returns
    // an OK message, and on failure a corresponding KO message.  There is
    // a possibility here to save to PiclContacts data that couldn't
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
      ppmm.addMessageListener(msgName, this);
    }).bind(this));

    this._contactServiceMessages.forEach((function(msgName) {
      cpmm.addMessageListener(msgName, this);
    }).bind(this));

    log('init() complete');
  },

  uninit: function piclContacts_uninit() {
    try {
      for (let msgName of this._contactManagerMessages) {
        ppmm.removeMessageListener(msgName, this);
      }
    } catch (err) {
      log('WARNING: ppmm listener already removed:', err);
      // ok if this gets called upwards of one time
    }

    try {
      for (let msgName of this._contactServiceMessages) {
        cpmm.removeMessageListener(msgName, this);
      }
    } catch (err) {
      log('WARNING: cpmm listener already removed:', err);
      // ok if this gets called upwards of one time
    }

    log('uninit() complete');
  },

  get _deferredUpdate() {
    if (!this._deferredUpdateTask) {
      this._deferredUpdateTask = new DeferredTask(
          this._maybePostUpdates.bind(this), DEFER_INTERVAL);
    }
    return this._deferredUpdateTask;
  },

  /**
   * _afterPostUpdates - called by _postUpdates; figures out what to do next
   *
   * @param success
   *        (boolean)   data was successfully posted to remote server
   *
   * @param postedData
   *        (object)    required on success.  The data posted to the server.
   *
   * If the push failed, or if there is still data that needs posting, schedule
   * another update to be done shortly.
   */
  _afterPostUpdates: function piclContacts__afterPostUpdates(success, postedData) {
    let tryAgain = true;
    if (success) {
      postedData.forEach(function(blob) {
        let update = this._outboundUpdates[blob.id];
        if (update && update.updated_at <= blob.updated_at) {
          delete this._outboundUpdates[blob.id];
        }
      }.bind(this));
      tryAgain = Object.keys(this._outboundUpdates).length > 0;
    }

    if (tryAgain) {
      log('Still have updates to post; will try again in', DEFER_INTERVAL);
      this._deferredUpdate.start();
    }
  },

  /**
   * _postUpdates - try to send updated contact data to the server.
   */
  _postUpdates: function piclContacts__postUpdates() {
    let outboundUpdateKeys = Object.keys(this._outboundUpdates);
    if (outboundUpdateKeys.length) {
      // keep track of each id and the update time.  If our server push
      // is successful, we will remove from the _outboundUpdates dictionary
      // all the items that have not changed again in the interim.
      let bodyData = [];
      outboundUpdateKeys.forEach(function(update_id) {
        bodyData.unshift(this._outboundUpdates[update_id]);
      }.bind(this));

      // XXX try/catch stringify
      let body = JSON.stringify(bodyData);
      let req = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
                  .createInstance(Ci.nsIXMLHttpRequest);

      req.open('POST', PICL_CONTACTS_SERVER_URL + '/contacts/update', true);
      req.responseType = 'json';
      req.setRequestHeader('Content-Type', 'application/json');
      req.mozBackgroundRequest = true;

      req.onload = function piclContacts__postUpdate_onload() {
        log('server returned', req.status);
        if (req.status === 200) {
          this._afterPostUpdates(true, bodyData);
        } else {
          this._afterPostUpdates(false);
        }
      }.bind(this);

      req.onerror = function piclContacts__postUpdate_onerror() {
        log('request error:', req.status, req.statusText);
        this._afterPostUpdates(false);
      }.bind(this);

      req.send(body);
    }
  },
  /**
   * _maybePostUpdates - see if it's a good idea to try to send data 
   * to the server
   */
  _maybePostUpdates: function piclContacts__maybePostUpdates() {
    // XXX check have bandwidth
    if (Services.io.offline) {
      log('offline; will try again in', DEFER_INTERVAL);
      this._deferredUpdate.start();
    } else {
      this._postUpdates();
    }
  },

  receiveMessage: function(aMessage) {
    switch (aMessage.name) {
      case 'Contact:Save':
      case 'Contact:Remove':
        let contact = aMessage.json.options.contact;
        let update = {
           type: 'contact',
           id: contact.id,
           updated_at: (new Date()).getTime(),
           action: aMessage.json.options.reason,
           data: contact.properties};
        this._outboundUpdates[contact.id] = update;
        this._maybePostUpdates();
        break;
      default:
        log('no action for message:', aMessage.name);
        break;
    }
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([Service]);

this.PiclContacts = new Service();
