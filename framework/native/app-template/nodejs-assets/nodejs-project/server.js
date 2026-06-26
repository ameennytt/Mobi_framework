'use strict';
// Embedded Node entry for the React Native shell (nodejs-mobile-react-native).
// Wires rn-bridge so the framework server can notify RN (server-ready,
// room-created, screen-disconnected), then boots the framework HTTP+WS server.
//
// In the packaged app this file sits at nodejs-project/server.js with the
// framework/ and games/<id>/ folders copied alongside it (see README.md).
const bridge = require('rn-bridge');
global.__rnBridge = bridge.channel;

bridge.channel.on('message', (msg) => {
  if (msg === 'shutdown') process.exit(0);
});

// Serves framework/* and games/* and runs the WebSocket relay on port 3000.
require('./framework/core/server.js');
