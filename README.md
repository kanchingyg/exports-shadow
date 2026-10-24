# exports-shadow

[![npm](https://img.shields.io/npm/v/exports-shadow)](https://www.npmjs.com/package/exports-shadow)
[![JSR](https://jsr.io/badges/@kanchingyg/exports-shadow)](https://jsr.io/@kanchingyg/exports-shadow)

`package.json` `"exports"` conditions match in key order. Bun and Deno both accept `"node"`, so a later `"bun"` or `"deno"` key never wins. Wrangler's defaults are `workerd` / `worker` / `browser` (not `node`); an earlier `"browser"` or `"import"` can hide a Workers file the same way.

exports-shadow prints the file each of node, bun, deno, and workerd resolves for every subpath, and flags shadow when a runtime-specific key loses to an earlier broader one.

## Measured output

Fixture ordered `node` → `bun` → `deno` → `default`, each path a different file. Bun 1.4.2 and Node 22 both printed `RESOLVED=node` when importing it:

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

## Use

```bash
exports-shadow                          # current directory
exports-shadow ./packages/sdk           # folder or package.json path
exports-shadow msgpackr                 # installed dependency name
exports-shadow --json
exports-shadow --runtime bun,workerd
exports-shadow --fix                   # print a suggested reorder (no write)
exports-shadow --apply                  # backup, then write after you type "apply"
exports-shadow --undo                   # restore that backup
```

`--apply` copies `package.json` to `package.json.exports-shadow.bak` and writes `.exports-shadow-state.json` next to it. `--undo` restores the backup.

## Library API

```ts
import { scan, resolveSubpath, detectShadow, suggestReorder } from "exports-shadow";

const report = scan("./packages/sdk");
// report.rows[n].cells[m].resolved / .shadow
// report.suggestedExports — reorder suggestion; scan() does not write files
```

Condition sets live in `src/conditions.ts` (Node, Bun, Deno, Wrangler docs linked there). Resolution uses [`resolve.exports`](https://www.npmjs.com/package/resolve.exports).

## Evidence on public packages

Checked on the installed tarball (npm's web JSON can reorder keys):

| Package | What shadows |
|---|---|
| [msgpackr@2.1.2](https://www.npmjs.com/package/msgpackr/v/2.1.2) | `node` before `bun` on `.`, `./pack`, `./unpack` |
| [ofetch@1.5.1](https://www.npmjs.com/package/ofetch/v/1.5.1) | `browser` before `worker` / `workerd` on `.` |
| [node-fetch-native@1.6.7](https://www.npmjs.com/package/node-fetch-native/v/1.6.7) | `browser` before `worker` / `workerd` on `.` |

## Reported elsewhere

- [oven-sh/bun#15053](https://github.com/oven-sh/bun/issues/15053): Bun matches `"node"`, so `"bun"` after `"node"` is ignored; put `bun` first.
- [denoland/deno#26789](https://github.com/denoland/deno/issues/26789): Deno's condition list includes `"node"`; order still decides.
- [wintercg/runtime-keys#5](https://github.com/wintercg/runtime-keys/issues/5): runtime keys and who should match `"node"`.

## License

[AGPL-3.0-only](https://www.gnu.org/licenses/agpl-3.0.html). Free and open source. If you ship a modified version, or run a modified version as a network service, you must publish that source under the AGPL. Closed-source or proprietary commercial use needs a separate license from the author (dual licensing); ask via GitHub.

Copyright (c) 2026 Augusto Cerrutti (https://github.com/kanchingyg)
