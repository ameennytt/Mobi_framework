'use strict';
// DEFAULT no-op enrichment (pass-through relay). Ships with every app so the
// static `require('./shared/relay-enrich')` in index.js ALWAYS resolves — Metro
// resolves requires at bundle time and ignores the try/catch, so a missing file
// silently misaligns the module dependency map (relay → staticHttp, undefined
// createRelay). scripts/sync-assets.js OVERWRITES this with the game's own
// games/<id>/shared/relay-enrich.js when the game ships one.
module.exports = null;
