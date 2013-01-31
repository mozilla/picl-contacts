# MyFirefox Contacts

Status: This project only just got started a few days ago and is already on
hold.  Ah, well.  Please feel free to experiment with it and contribute to it,
but do not expect the maintainers to be doing much with it at the present
moment.

Goal: Give users a way to access and manage their contacts from FXOS devices
and WebRTC-enabled FX clients.

This is one of a set of experimental identity-attached services that include:

- Passwords: https://github.com/mozilla/gombot
- Bookmarks and Tabs: https://github.com/mozilla/myfx-tabs
- Contacts: (this)
- Backend Server: https://github.com/mozilla/myfx-server 

## Overview

There are two pieces to this project:

1. A FirefoxOS add-on that listens for updates to contacts
2. A simple server for receiving published updates

When the add-on detects a change to your contacts, it tries to POST the changes
to the local server.

## Demo

https://vimeo.com/58592827

## Next Steps and Questions

- Acquire user's identity from device
- Make it a proper id-attached service, with auth by identity assertion
- Associate contacts on server with user's identity
- Retry sending updates on failure
- Batch updates with a maximum size
- Don't send updates if bandwidth is poor
- Poll server periodically for contacts updates
- Pull down updates and merge new data (nb, contacts ids are uuids, so this
  will work)

## Installation

This can be installed as an add-on for FirefoxOS.

```
ln -s `pwd`/tools/extensions/myfx-contacts@labs.mozilla.org $GAIA_DIR/tools/extensions
ln -s `pwd`/tools/extensions/myfx-contacts $GAIA_DIR/tools/extensions
cd $GAIA_DIR
rm -rf profile && DEBUG=1 make
```

Now run b2g with this profile.

To run the server to receive contacts updates:

```
npm install
npm start
```

## Contacts Data Structure and API Notes

- Start here: https://groups.google.com/d/topic/mozilla.dev.webapi/O9NvczNs54M/discussion
- philikon's webcontacts proposal: https://github.com/philikon/webcontacts
- W3C Contacts Writer proposal: http://w3c-test.org/dap/contacts/Writer.html
- W3C Pick Contacts webintent: http://w3c-test.org/dap/contacts/
- Portable Contacts spec: http://portablecontacts.net/draft-spec.html

## `mozContacts` API Overview

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




