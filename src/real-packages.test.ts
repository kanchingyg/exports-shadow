// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Real npm packages whose published exports order triggers shadow.
 * Evidence links live in the README "Reported elsewhere" / evidence section.
 */
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scan } from "./scan";

const EVIDENCE = [
  {
    name: "msgpackr",
    version: "2.1.2",
    runtime: "bun" as const,
    why: "node before bun on '.'",
  },
  {
    name: "ofetch",
    version: "1.5.1",
    runtime: "workerd" as const,
    why: "browser before worker/workerd on '.'",
  },
  {
    name: "node-fetch-native",
    version: "1.6.7",
    runtime: "workerd" as const,
    why: "browser before worker/workerd on '.'",
  },
];

function installEvidence(cwd: string): void {
  mkdirSync(cwd, { recursive: true });
  writeFileSync(
    join(cwd, "package.json"),
    JSON.stringify(
      {
        name: "exports-shadow-evidence",
        private: true,
        type: "module",
        dependencies: Object.fromEntries(EVIDENCE.map((e) => [e.name, e.version])),
      },
      null,
      2,
    ),
  );
  const install = Bun.spawnSync(["bun", "install"], { cwd, stdout: "pipe", stderr: "pipe" });
  if (install.exitCode !== 0) {
    throw new Error(`bun install failed: ${install.stderr.toString()}`);
  }
}

describe("real public packages", () => {
  const cwd = mkdtempSync(join(tmpdir(), "exports-shadow-real-"));
  installEvidence(cwd);

  for (const pkg of EVIDENCE) {
    test(`${pkg.name} shadows on ${pkg.runtime} (${pkg.why})`, () => {
      const result = scan(pkg.name, { cwd });
      expect(result.hasShadow).toBe(true);
      const root = result.rows.find((r) => r.subpath === ".");
      expect(root).toBeDefined();
      const cell = root!.cells.find((c) => c.runtime === pkg.runtime);
      expect(cell?.shadow).toBe(true);
    });
  }
});
