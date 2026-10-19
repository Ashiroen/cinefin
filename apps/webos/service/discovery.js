/* Cinefin discovery service.
 * Original implementation of the public Jellyfin UDP protocol
 * (broadcast "Who is JellyfinServer?" on port 7359). Not derived
 * from jellyfin-webos.
 */
var Service = require('webos-service');
var dgram = require('dgram');

var PORT = 7359;
var QUERY = 'Who is JellyfinServer?';
var SCAN_MS = 2500;

var service = new Service('com.cinefin.app.service');

service.register('discover', function handleDiscover(message) {
  var socket = dgram.createSocket('udp4');
  var found = {};
  var finished = false;

  function list() {
    return Object.keys(found).map(function (id) {
      return found[id];
    });
  }

  function reply(done) {
    if (finished && !done) return;
    message.respond({
      returnValue: true,
      servers: list(),
      done: !!done,
    });
  }

  socket.on('error', function () {
    reply(true);
    try {
      socket.close();
    } catch (_e) {
      /* ignore */
    }
  });

  socket.on('message', function (msg) {
    try {
      var data = JSON.parse(msg.toString('utf8'));
      if (!data || typeof data.Id !== 'string' || typeof data.Address !== 'string') return;
      found[data.Id] = {
        id: data.Id,
        name: data.Name || 'Jellyfin',
        address: data.Address,
      };
      reply(false);
    } catch (_e) {
      /* ignore non-JSON */
    }
  });

  socket.on('listening', function () {
    try {
      socket.setBroadcast(true);
    } catch (_e) {
      /* some webOS builds reject this; send anyway */
    }
    var buf = Buffer.from(QUERY);
    socket.send(buf, 0, buf.length, PORT, '255.255.255.255');
  });

  try {
    socket.bind();
  } catch (_e) {
    message.respond({ returnValue: false, servers: [], errorText: 'bind failed' });
    return;
  }

  setTimeout(function () {
    finished = true;
    reply(true);
    try {
      socket.close();
    } catch (_e) {
      /* ignore */
    }
  }, SCAN_MS);
});
