// SPDX-License-Identifier: AGPL-3.0-only
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkVersions, releaseTagToCheck } from "./check-versions";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgVersion = (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string }).version;

describe("releaseTagToCheck", () => {
  test("branch refs do not require a tag match", () => {
    expect(releaseTagToCheck([], { GITHUB_REF: "refs/heads/main", GITHUB_REF_NAME: "main" })).toBeNull();
  });

  test("refs/tags/v* requires the tag name", () => {
    expect(
      releaseTagToCheck([], { GITHUB_REF: "refs/tags/v0.1.0", GITHUB_REF_NAME: "v0.1.0" }),
    ).toBe("v0.1.0");
  });

  test("--tag= always wins over a branch env", () => {
    expect(
      releaseTagToCheck(["--tag=v9.9.9"], { GITHUB_REF: "refs/heads/main", GITHUB_REF_NAME: "main" }),
    ).toBe("v9.9.9");
  });
});

describe("checkVersions", () => {
  test("matching package and jsr versions pass without a tag", () => {
    expect(checkVersions("0.1.0", "0.1.0", null)).toEqual({ ok: true, message: "versions ok: 0.1.0" });
  });

  test("matching tag v+version passes", () => {
    expect(checkVersions("0.1.0", "0.1.0", "v0.1.0").ok).toBe(true);
  });

  test("mismatch fails", () => {
    expect(checkVersions("0.1.0", "0.1.1", null).ok).toBe(false);
  });

  test("repo package.json and jsr.json share the same version", () => {
    const jsr = JSON.parse(readFileSync(join(root, "jsr.json"), "utf8")) as { version: string };
    expect(jsr.version).toBe(pkgVersion);
  });
});
