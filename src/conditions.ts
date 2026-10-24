// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Pinned condition sets per runtime. Order in this array does not matter for
 * resolve.exports (key order in package.json does). Comments cite the docs.
 *
 * Phase 0 real runs (fixtures/PHASE0.md): Node and Bun both printed
 * RESOLVED=node for exports ordered node → bun → deno → default. Deno was not
 * installed on the build machine; docs say Deno ESM also includes "node", so
 * the same fixture would select node and shadow "deno".
 */

export const ALL_RUNTIMES = ["node", "bun", "deno", "workerd"] as const;
export type RuntimeName = (typeof ALL_RUNTIMES)[number];

/** Keys that are runtime-specific entry points (shadow candidates). */
export const RUNTIME_SPECIFIC_KEYS = ["bun", "deno", "workerd", "worker"] as const;
export type RuntimeSpecificKey = (typeof RUNTIME_SPECIFIC_KEYS)[number];

/**
 * Broader keys that can win before a runtime-specific key.
 * Spec: node, import, require, default (+ module-sync / node-addons / browser
 * when the runtime's condition set includes them).
 */
export const BROADER_KEYS = [
  "node",
  "node-addons",
  "import",
  "require",
  "module-sync",
  "default",
  "browser",
] as const;

/**
 * Node.js ESM conditions.
 * https://nodejs.org/api/packages.html#conditional-exports
 * Listed most-specific → least-specific in the Node docs; we pass them as the
 * active set (package.json key order still decides the winner).
 */
export const NODE_CONDITIONS: readonly string[] = [
  "node-addons",
  "node",
  "import",
  "module-sync",
  "default",
];

/**
 * Bun ESM conditions (documented check order for which keys Bun understands).
 * https://bun.com/docs/runtime/module-resolution
 * Bun treats "node" as applicable, so "node" before "bun" selects the Node file
 * ([oven-sh/bun#15053](https://github.com/oven-sh/bun/issues/15053)).
 * Phase 0 measured: Bun 1.4.2 printed RESOLVED=node on the shadow-order fixture.
 */
export const BUN_CONDITIONS: readonly string[] = [
  "bun",
  "node-addons",
  "node",
  "import",
  "default",
];

/**
 * Deno ESM / npm import conditions.
 * https://docs.deno.com/runtime/fundamentals/node/ — "Control package export conditions"
 * Official list: ["deno", "node", "import", "module-sync", "default"]
 */
export const DENO_CONDITIONS: readonly string[] = [
  "deno",
  "node",
  "import",
  "module-sync",
  "default",
];

/**
 * Wrangler / workerd bundling defaults.
 * getBuildConditions() returns ["workerd", "worker", "browser"] when unset:
 * https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/deployment-bundle/bundle.ts
 * Wrangler comment: esbuild always keeps "default"; ESM resolution also matches "import".
 * Docs: https://developers.cloudflare.com/workers/wrangler/bundling/
 */
export const WORKERD_CONDITIONS: readonly string[] = [
  "workerd",
  "worker",
  "browser",
  "import",
  "default",
];

export const CONDITIONS_BY_RUNTIME: Record<RuntimeName, readonly string[]> = {
  node: NODE_CONDITIONS,
  bun: BUN_CONDITIONS,
  deno: DENO_CONDITIONS,
  workerd: WORKERD_CONDITIONS,
};

/** Runtime-specific keys that apply when analyzing a given runtime column. */
export function runtimeKeysFor(runtime: RuntimeName): ReadonlySet<string> {
  switch (runtime) {
    case "node":
      return new Set();
    case "bun":
      return new Set(["bun"]);
    case "deno":
      return new Set(["deno"]);
    case "workerd":
      return new Set(["workerd", "worker"]);
    default: {
      const _exhaustive: never = runtime;
      return _exhaustive;
    }
  }
}

export function isRuntimeName(value: string): value is RuntimeName {
  return (ALL_RUNTIMES as readonly string[]).includes(value);
}

export function parseRuntimeList(raw: string): RuntimeName[] | string {
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return "empty --runtime list";
  const out: RuntimeName[] = [];
  for (const part of parts) {
    if (!isRuntimeName(part)) {
      return `unknown runtime: ${part} (use ${ALL_RUNTIMES.join(", ")})`;
    }
    if (!out.includes(part)) out.push(part);
  }
  return out;
}
