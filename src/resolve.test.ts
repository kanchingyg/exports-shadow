// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPackage } from "./load";
import { listSubpaths, resolveSubpath } from "./resolve";
import { detectShadow, exportTarget } from "./shadow";
import { suggestReorder } from "./reorder";
import { scanPackage } from "./scan";
import type { PackageJson } from "./types";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = join(root, "fixtures", "shadow-order");

describe("listSubpaths", () => {
  test("root string export", () => {
    expect(listSubpaths("./index.js")).toEqual(["."]);
  });

  test("subpath map", () => {
    expect(listSubpaths({ ".": "./a.js", "./x": "./x.js" })).toEqual([".", "./x"]);
  });

  test("root conditional map without dot", () => {
    expect(listSubpaths({ node: "./n.js", default: "./d.js" })).toEqual(["."]);
  });
});

describe("resolveSubpath cases", () => {
  test("nested conditions", () => {
    const pkg: PackageJson = {
      name: "nested",
      exports: {
        ".": {
          import: { node: "./esm-node.js", default: "./esm.js" },
          require: "./cjs.js",
        },
      },
    };
    expect(resolveSubpath(pkg, ".", "node").resolved).toBe("./esm-node.js");
  });

  test("array fallbacks", () => {
    const pkg: PackageJson = {
      exports: {
        ".": [{ node: "./missing-should-still-return.js" }, "./fallback.js"],
      },
    };
    // resolve.exports returns the first matching path string in the array entry
    const r = resolveSubpath(pkg, ".", "node");
    expect(r.resolved).toBe("./missing-should-still-return.js");
  });

  test("types is skipped for runtime resolution", () => {
    const pkg: PackageJson = {
      exports: {
        ".": {
          types: "./index.d.ts",
          import: "./index.js",
        },
      },
    };
    expect(resolveSubpath(pkg, ".", "node").resolved).toBe("./index.js");
  });

  test("subpath patterns", () => {
    const pkg: PackageJson = {
      exports: {
        "./features/*": "./src/features/*.js",
      },
    };
    expect(resolveSubpath(pkg, "./features/foo", "node").resolved).toBe("./src/features/foo.js");
  });
});

describe("phase 0 fixture", () => {
  test("node/bun/deno select node; workerd selects default; bun and deno shadow", () => {
    const pkg = loadPackage(fixtureDir);
    const result = scanPackage(pkg);
    const row = result.rows.find((r) => r.subpath === ".");
    expect(row).toBeDefined();
    const byRuntime = Object.fromEntries(row!.cells.map((c) => [c.runtime, c]));
    expect(byRuntime.node?.resolved).toBe("./dist/node.js");
    expect(byRuntime.bun?.resolved).toBe("./dist/node.js");
    expect(byRuntime.deno?.resolved).toBe("./dist/node.js");
    expect(byRuntime.workerd?.resolved).toBe("./dist/default.js");
    expect(byRuntime.bun?.shadow).toBe(true);
    expect(byRuntime.deno?.shadow).toBe(true);
    expect(byRuntime.node?.shadow).toBe(false);
    expect(byRuntime.workerd?.shadow).toBe(false);
    expect(result.hasShadow).toBe(true);
  });

  test("detectShadow on fixture target", () => {
    const pkg = loadPackage(fixtureDir);
    const target = exportTarget(pkg.packageJson.exports, ".");
    const bun = detectShadow(target, "bun");
    expect(bun.shadow).toBe(true);
    expect(bun.winnerKey).toBe("node");
    expect(bun.shadowedKey).toBe("bun");
  });

  test("suggestReorder puts bun and deno before node", () => {
    const pkg = loadPackage(fixtureDir);
    const suggested = suggestReorder(pkg.packageJson.exports) as {
      ".": Record<string, string>;
    };
    const keys = Object.keys(suggested["."]);
    expect(keys.indexOf("bun")).toBeLessThan(keys.indexOf("node"));
    expect(keys.indexOf("deno")).toBeLessThan(keys.indexOf("node"));
  });
});
