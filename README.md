# MyFirefox Contacts

Goal: Give users a way to access and manage their contacts from FXOS devices
and WebRTC-enabled FX clients.

This is one of a set of experimental identity-attached services that include:

- Passwords: https://github.com/mozilla/gombot
- Bookmarks and Tabs: https://github.com/mozilla/myfx-tabs
- Contacts: (this)
- Backend Server: https://github.com/mozilla/myfx-server 

## `mozContacts` API overview

`navigator.mozContacts` provides an asynchronous interface for working with
contacts, which are stored in the browser using IndexDB.  The 
[FxOS Contacts](https://github.com/mozilla-b2g/gaia/apps/communication/contacts') 
app uses this API.  The API includes:

- `save(contact)`
- `find(options)`
- `remove(record)`
- `clear()`
- `getSimContacts(contactType)`

Each of these function returns a `request` object.  The caller should register
`onsuccess` and `onerror` callbacks on this object; these will be called with
results when the request succeeds or fails.

A successful `find` request will point to a list of json result objects with
`request.result`.  So you can query `request.result.length`, etc.  For example:

```javascript
// Find all the contacts named Juanita.
// Queries can use options like these:
var options = {
  filterBy: ['givenName'],
  filterLimit: FILTER_LIMIT,
  filterOp: 'equals',
  filterValue: 'Juanita'
  sortBy: 'familyName',
  sortOrder: 'ascending'
}
request = navigator.mozContacts.find(options);
request.onsuccess = function() {
  if (request.result.length) {
    // found a record with id=contactId
  }
}
request.onerror = function(message) {
  console.log("error:", message);
}
```

The 
[ContactManager](http://mxr.mozilla.org/mozilla-central/source/dom/contacts/ContactManager.js) 
messages with the 
[ContactService](http://mxr.mozilla.org/mozilla-central/source/dom/contacts/fallback/ContactService.jsm) 
(using cpmm and ppmm message managers respectively); the
ContactService interacts with the 
[ContactDB](http://mxr.mozilla.org/mozilla-central/source/dom/contacts/fallback/ContactDB.jsm), 
which is an IndexedDBHelper.
The ContactManager uses the PermissionPromptHelper to request permission to perform any
of these actions.
These modules are all to be found in gecko `dom/contacts`.

MDN has documentation for [IndexedDB](https://developer.mozilla.org/docs/IndexedDB).




