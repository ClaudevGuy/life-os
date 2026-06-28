// Browser stand-in for Node core modules that GramJS references in its Node
// code paths but never actually uses in the browser. Turbopack aliases
// node:crypto/stream/fs/net/tls/zlib to this when bundling for the browser
// (see next.config.ts). CommonJS so any import shape resolves harmlessly.
module.exports = {};
