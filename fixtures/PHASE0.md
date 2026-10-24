# Phase 0 — real runtime resolution

Fixture: `fixtures/shadow-order` with exports ordered `node` → `bun` → `deno` → `default`, each pointing at a different file that prints `RESOLVED=<name>`.

## Condition sets (pinned docs)

| Runtime | Active conditions | Source |
|---|---|---|
| node (ESM) | `node-addons`, `node`, `import`, `module-sync`, `default` | https://nodejs.org/api/packages.html#conditional-exports |
| bun (ESM) | `bun`, `node-addons`, `node`, `import`, `default` | https://bun.com/docs/runtime/module-resolution |
| deno (ESM) | `deno`, `node`, `import`, `module-sync`, `default` | https://docs.deno.com/runtime/fundamentals/node/ (Control package export conditions) |
| workerd | `workerd`, `worker`, `browser`, `import`, `default` | Wrangler `getBuildConditions()` → `["workerd","worker","browser"]`; esbuild always keeps `default`; ESM adds `import`. https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/deployment-bundle/bundle.ts |

## Measured imports (consumer `import "shadow-order-fixture"`)

| Runtime | Printed | Notes |
|---|---|---|
| Node v22.23.1 | `RESOLVED=node` | Matches docs: first applicable key is `node`. |
| Bun 1.4.2 | `RESOLVED=node` | Matches docs and [oven-sh/bun#15053](https://github.com/oven-sh/bun/issues/15053): Bun treats `node` as applicable, so `node` before `bun` wins. |
| Deno | (not installed on this machine) | Docs say Deno ESM conditions include `deno` then `node`; with this fixture Deno should also select `node` and shadow `deno`. |

Real run wins over speculation: Bun selected `node`, not `bun`.
