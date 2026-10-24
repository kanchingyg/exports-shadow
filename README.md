# exports-shadow

[![ci](https://github.com/kanchingyg/exports-shadow/actions/workflows/ci.yml/badge.svg)](https://github.com/kanchingyg/exports-shadow/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/exports-shadow)](https://www.npmjs.com/package/exports-shadow)
[![JSR](https://jsr.io/badges/@kanchingyg/exports-shadow)](https://jsr.io/@kanchingyg/exports-shadow)
[![license](https://img.shields.io/npm/l/exports-shadow)](https://github.com/kanchingyg/exports-shadow/blob/HEAD/LICENSE)

exports-shadow prints the file Node, Bun, Deno and workerd resolve for each `exports` subpath, and flags runtime keys that an earlier key hides.

```text
┌─ keys are tried top to bottom ─────────────────────────────────┐
│ "exports": { ".": {                                            │
│   "node":    "./dist/node.js",    <- node, bun, deno stop here │
│   "bun":     "./dist/bun.js",     never reached                │
│   "deno":    "./dist/deno.js",    never reached                │
│   "default": "./dist/default.js"  <- workerd stops here        │
│ } }                                                            │
└────────────────────────────────────────────────────────────────┘
```

Each runtime takes the first key in its own condition set. Bun and Deno both include `"node"`, so a `"bun"` or `"deno"` key placed after it never wins. Wrangler's defaults (`workerd`, `worker`, `browser`) leave out `node`, but an earlier `"browser"` or `"import"` key can hide a Workers file the same way.

## Install

[npm](https://www.npmjs.com/package/exports-shadow):

```bash
bun add -d exports-shadow
npm i -D exports-shadow
```

[JSR](https://jsr.io/@kanchingyg/exports-shadow):

```bash
bunx jsr add @kanchingyg/exports-shadow
```

From a clone:

```bash
bun install
bun run build
node dist/cli.js fixtures/shadow-order
```

## Quick start

Fixture ordered `node` → `bun` → `deno` → `default`, each path a different file. Bun 1.4.2 and Node 22 both printed `RESOLVED=node` when importing it. The `deno` row comes from Deno's documented conditions. Deno was not run on this fixture.

```text
$ exports-shadow fixtures/shadow-order

shadow-order-fixture@0.0.0

shadow  .
          node     ./dist/node.js
          bun      ./dist/node.js  <- shadow (node before bun)
          deno     ./dist/node.js  <- shadow (node before deno)
          workerd  ./dist/default.js

shadow: a runtime-specific key exists but an earlier broader key wins
```

Exit `0` when nothing is shadowed, `1` on shadow, `2` on error.

## Use

Pass a directory, a `package.json` path, or an installed package name. Default target is the current directory.

| Flag | What it does | Default |
| --- | --- | --- |
| `--json` | Print a machine-readable report (`schemaVersion` 1) | off |
| `--runtime <list>` | Limit columns to a subset of `node,bun,deno,workerd` | all four |
| `--fix` | Print a suggested reordered `exports` object (no write) | off |
| `--apply` | Write that reorder after you type `apply` (backup first) | off |
| `--undo` | Restore the last `--apply` backup | off |
| `--yes` | Skip confirmation for `--apply` / `--undo` | off |

`--apply` copies `package.json` to `package.json.exports-shadow.bak` and writes `.exports-shadow-state.json` next to it. `--undo` restores the backup.

## Library API

```ts
import { scan, resolveSubpath, detectShadow, suggestReorder } from "exports-shadow";

const report = scan("./packages/sdk");
// report.rows[n].cells[m].resolved / .shadow
// report.suggestedExports: reorder suggestion
// scan() does not write files
```

## How it works

The CLI and `scan()` walk every `exports` subpath for the four runtimes in `ALL_RUNTIMES`: `node`, `bun`, `deno`, and `workerd`. Condition sets are pinned in `src/conditions.ts` from the [Node](https://nodejs.org/api/packages.html#conditional-exports), [Bun](https://bun.com/docs/runtime/module-resolution), [Deno](https://docs.deno.com/runtime/fundamentals/node/), and [Wrangler](https://developers.cloudflare.com/workers/wrangler/bundling/) docs. Resolution goes through [`resolve.exports`](https://www.npmjs.com/package/resolve.exports) with those sets. A cell is shadowed when a runtime-specific key (`bun`, `deno`, `workerd`, `worker`) exists but an earlier broader key (`node`, `import`, `require`, `default`, `browser`, and related) wins.

## Limits

Condition sets are pinned in source. The tool does not read them from the installed runtime. Only `node`, `bun`, `deno`, and `workerd` are covered. Deno and workerd were not run on the `fixtures/shadow-order` fixture. The `deno` and `workerd` columns follow the documented condition lists above.

## Evidence on public packages

Checked on the installed tarball (npm's web JSON can reorder keys):

| Package | What shadows |
|---|---|
| [msgpackr@2.1.2](https://www.npmjs.com/package/msgpackr/v/2.1.2) | `node` before `bun` on `.`, `./pack`, `./unpack` |
| [ofetch@1.5.1](https://www.npmjs.com/package/ofetch/v/1.5.1) | `browser` before `worker` / `workerd` on `.` |
| [node-fetch-native@1.6.7](https://www.npmjs.com/package/node-fetch-native/v/1.6.7) | `browser` before `worker` / `workerd` on `.` |

## Reported elsewhere

- [oven-sh/bun#15053](https://github.com/oven-sh/bun/issues/15053): Bun matches `"node"`, so `"bun"` after `"node"` is ignored. Put `bun` first.
- [denoland/deno#26789](https://github.com/denoland/deno/issues/26789): Deno's condition list includes `"node"`. Order still decides.
- [WinterTC55/runtime-keys#5](https://github.com/WinterTC55/runtime-keys/issues/5): proposes a common WinterCG key so packages can declare Minimum Common API compatibility.

## License

[AGPL-3.0-only](https://www.gnu.org/licenses/agpl-3.0.html). Free and open source. If you ship a modified version, or run a modified version as a network service, you must publish that source under the AGPL. Closed-source or proprietary commercial use needs a separate license from the author (dual licensing); ask via GitHub.

Copyright (c) 2026 Augusto Cerrutti (https://github.com/kanchingyg)
