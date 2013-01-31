var hapi = require('hapi');
var server = module.exports = new hapi.Server('127.0.0.1', 3000);

// handlers

var update = {
  handler: function (request) {
    var body = request.payload;
    var count = body.length;
    console.log("Received " + count + " record" + (count > 1 ? "s" : "") + " to update");

    // describe a bit of what's going on
    body.forEach(function(item) {
      console.log("  Update contact ID: " + item.id);
      console.log("             action: " + item.action);
      console.log("               date: " + (new Date(item.updated_at)).toString());
      console.log(JSON.stringify(item.data));
    });

    request.reply({success: 'true'});
  }
};

// routes

server.addRoute({
  path: '/contacts/update',
  method: 'POST',
  config: update
});

if (!module.parent) {
  server.start();
}
