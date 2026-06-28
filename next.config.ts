import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GramJS (the `telegram` MTProto client) runs client-side and expects Node
  // globals/modules. We inject Buffer/process globally (see
  // src/lib/messaging/polyfill.ts) and, for the browser bundle, alias the Node
  // core modules it references to an empty module so Turbopack can bundle it.
  turbopack: {
    resolveAlias: {
      buffer: { browser: "buffer" },
      process: { browser: "process/browser" },
      crypto: { browser: "./empty-module.js" },
      stream: { browser: "./empty-module.js" },
      path: { browser: "./empty-module.js" },
      fs: { browser: "./empty-module.js" },
      net: { browser: "./empty-module.js" },
      tls: { browser: "./empty-module.js" },
      zlib: { browser: "./empty-module.js" },
    },
  },
};

export default nextConfig;
