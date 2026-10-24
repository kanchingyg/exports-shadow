// SPDX-License-Identifier: AGPL-3.0-only
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyReorder, undoReorder } from "./apply";
import { scan } from "./scan";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makePkg(): string {
  const dir = mkdtempSync(join(tmpdir(), "exports-shadow-apply-"));
  dirs.push(dir);
  mkdirSync(join(dir, "dist"));
  writeFileSync(join(dir, "dist", "node.js"), "export default 1;\n");
  writeFileSync(join(dir, "dist", "bun.js"), "export default 2;\n");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "apply-fixture",
        version: "0.0.0",
        type: "module",
        exports: {
          ".": {
            node: "./dist/node.js",
            bun: "./dist/bun.js",
            default: "./dist/node.js",
          },
        },
      },
      null,
      2,
    ) + "\n",
  );
  return dir;
}

describe("apply / undo", () => {
  test("round-trip restores original key order", () => {
    const dir = makePkg();
    const before = readFileSync(join(dir, "package.json"), "utf8");
    const beforeScan = scan(dir);
    expect(beforeScan.hasShadow).toBe(true);

    applyReorder(dir);
    const mid = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
      exports: { ".": Record<string, string> };
    };
    const keys = Object.keys(mid.exports["."]);
    expect(keys.indexOf("bun")).toBeLessThan(keys.indexOf("node"));
    expect(scan(dir).hasShadow).toBe(false);

    undoReorder(dir);
    const after = readFileSync(join(dir, "package.json"), "utf8");
    expect(after).toBe(before);
    expect(scan(dir).hasShadow).toBe(true);
  });
});
