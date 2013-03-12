let DB_NAME = "contacts-completer-extension";
let DB_VERSION = 1;
let STORE_NAME = "terms";
let MAX_ROWS = 50;

/**
 * to use indexedDB component from chrome, we use its 
 * initWindowless method to bind to a variable.  As far
 * as I know, the only documentation for this is the 
 * discussion in https://bugzilla.mozilla.org/show_bug.cgi?id=587797
 * and the idl file:
 * http://mxr.mozilla.org/mozilla-central/source/dom/indexedDB/nsIIndexedDatabaseManager.idl#74
 */
let dbContext = this;

let Cc = Components.classes;
let Ci = Components.interfaces;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/IndexedDBHelper.jsm");

XPCOMUtils.defineLazyServiceGetter(this, "ppmm",
                                   "@mozilla.org/parentprocessmessagemanager;1",
                                   "nsIMessageListenerManager");

function ContactsCompleterService(onready) {
  this._db = null;
}

ContactsCompleterService.prototype = {
  classID: Components.ID('{138e624a-fc66-4417-b349-c9d1f0a4bab1}'),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  init: function Completer_init() {
    this._messages = [
      "Contact:Save",
      "Contacts:Remove",
      "Contacts:Clear",
      "Contacts:Find:Completions",
      "child-process-shutdown"
    ];

    this._messages.forEach(function(name) {
      ppmm.addMessageListener(name, this);
    }.bind(this));

    Services.obs.addObserver(this, "profile-before-change", false);

    this.open();
  },

  uninit: function Completer_unint() {
  },

  observe: function Completer_observe(aSubject, aTopic, aData) {
    // observed profile-before-change; shutting down
    dbContext = null;

    this._messages.forEach(function(name) {
      ppmm.removeMessageListener(name, this);
    }.bind(this));

    Services.obs.removeObserver(this, "profile-before-change");

    ppmm = null;

    if (this._db) {
      this._db.close();
    }
    this._db = null;

  },

  receiveMessage: function Completer_receiveMessage(aMessage) {
    switch (aMessage.name) {
      case "Contact:Save":
        this.addContact(aMessage.json.options.contact);
        break;
      case "Contacts:Remove":
        // XXX remove contacts from index
        dump("** contacts completer: not implemented: Contacts:Remove\n");
        break;
      case "Contacts:Clear":
        // XXX remove all contacts from index
        dump("** contacts completer: not implemented: Contacts:Clear\n");
        break;
      case "Contacts:Find:Completions":
        dump("** contacts completer: Find completions: not implemented yet\n");
        dump(aMessage.json);
        break;
    }
  },

  /**
   * Open the database; callback with any error
   */
  open: function Completer_open(callback) {
    callback = callback || function() {};
    let idbManager = Cc["@mozilla.org/dom/indexeddb/manager;1"]
                       .getService(Ci.nsIIndexedDatabaseManager);

    idbManager.initWindowless(dbContext);
    //this.initDBHelper(DB_NAME, DB_VERSION, [STORE_NAME], dbContext);

    let req = dbContext.indexedDB.open(DB_NAME);

    /**
     * onupgradeneeded will be invoked on first creation and 
     * subsequent version increments for the db.  This is the 
     * only way that the database schema can be set or adjusted.
     * So if something goes wrong and you start getting errors
     * about the database or object store not being found,
     * just destroy the db and try again:
     * indexedDB.destroyDatabase('contacts-completer');
     */
    req.onupgradeneeded = function(event) {
      let db = event.target.result;
      db.createObjectStore(STORE_NAME, {keyPath: "term"});
    };

    req.onerror = function() {
      console.error(req.errorCode);
      callback(req.errorCode);
    };

    req.onsuccess = function(event) {
      this._db = req.result;
      callback(null);
    }.bind(this);
  },

  /**
   * Close the database
   */
  close: function Completer_close(callback) {
    this._db.close(callback);
  },

  /**
   * Asynchronously add a word to the database.
   *
   * Word will be a part of the contact record to index.
   * For a name like 'Sterling Otremba', the words 'Sterling'
   * and 'Otremba' will be added separately.
   *
   * Labels is a list of text representations of the contact.
   * It's a list because a person can have more than one email.
   * So for example:
   *   ['Sterling Otremba sotremba8711@ya.rux']
   *
   * Id is the id of the full contact in the Contacts db.  E.g.,
   *   '73246fbe37891f4caffa56122b540dc8'
   */
  add: function Completer_add(word, labels, id) {
    if (this._db === null) return;

    word = word.trim().toLowerCase();

    let trans = this._db.transaction([STORE_NAME], "readwrite");
    trans.onerror = function(event) { 
      console.error("Transaction error: " + event.target.error.name);
    };

    let store = trans.objectStore(STORE_NAME);
    for (let i = 1; i <= word.length; ++i) {
      store.put({term: word.slice(0, i)});
    }

    for (let label of labels) {
      store.put({term: word + "*" + label + "*" + id + "*"});
    }
  },

  /**
   * Add contact from json data
   */
  addContact: function Completer_addContact(contact) {
    let data = contact.properties;
    if (!(data.name && data.email)) {
      return;
    }

    let fullName = data.name[0].trim();
    let tokens = fullName.split(/\s+/);
    let labels = [];

    for (let email of data.email) {
      labels.push(fullName + " <" + email.value + ">");
    }

    for (let token of tokens) {
      this.add(token, labels, contact.id);
    }
  },

  /**
   * Asynchronously query the database.  Callback with a list of words 
   * begin with the query.
   */
  find: function Completer_find(query, callback) {
    if (this._db === null) return;

    query = query.trim().toLowerCase();
    let store = this._db.transaction(STORE_NAME).objectStore(STORE_NAME);
    let range = store.openCursor(IDBKeyRange.lowerBound(query));
    let found = 0;
    let results = [];

    range.onsuccess = function(event) {
      found += 1;
      let cursor = event.target.result;
      if (!cursor) {
        return callback(results);
      }

      let term = cursor.value.term;
      if ((found > MAX_ROWS) ||
          (term.slice(0, query.length) !== query)) {
        return callback(results);
      }

      if (term[term.length-1] === "*") {
        results.push(term.slice(0, term.length-1));
      }
      cursor.continue();
    };
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([ContactsCompleterService]);

this.ContactsCompleter = new ContactsCompleterService()
