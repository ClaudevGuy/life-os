/**
 * GramJS depends on the Node globals `Buffer` and `process`. Browsers have
 * neither, and Turbopack has no `ProvidePlugin`, so we inject them on the
 * global object. This module MUST be imported before any `telegram` import
 * (telegram.ts imports it first). Importing the SAME `buffer` package
 * everywhere also dodges GramJS issue #789 ("Bytes or str expected, not
 * Buffer") that fires during the 2FA step when two Buffer impls coexist.
 */
import { Buffer } from "buffer";
import process from "process";

if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as {
    Buffer?: typeof Buffer;
    process?: typeof process;
  };
  if (!g.Buffer) g.Buffer = Buffer;
  if (!g.process) g.process = process;
}

export {};
