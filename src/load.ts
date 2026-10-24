// SPDX-License-Identifier: AGPL-3.0-only
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { PackageJson, PackageTarget } from "./types";

/**
 * Resolve a user target: folder, path to package.json, or installed package name.
 */
export function loadPackage(target: string, cwd: string = process.cwd()): PackageTarget {
  const trimmed = target.trim();
  if (trimmed.length === 0) {
    throw new Error("empty package target");
  }

  const asPath = isAbsolute(trimmed) ? trimmed : resolve(cwd, trimmed);

  if (existsSync(asPath)) {
    const st = statSync(asPath);
    if (st.isFile()) {
      if (!/(^|[/\\])package\.json$/.test(asPath)) {
        throw new Error(`expected a package.json file, got ${asPath}`);
      }
      return fromPackageJsonPath(asPath);
    }
    if (st.isDirectory()) {
      const pj = join(asPath, "package.json");
      if (!existsSync(pj)) {
        throw new Error(`no package.json in ${asPath}`);
      }
      return fromPackageJsonPath(pj);
    }
  }

  try {
    const req = createRequire(join(cwd, "package.json"));
    const resolved = req.resolve(`${trimmed}/package.json`);
    return fromPackageJsonPath(resolved);
  } catch {
    throw new Error(
      `could not find package "${trimmed}" (tried as path and as installed dependency from ${cwd})`,
    );
  }
}

function fromPackageJsonPath(packageJsonPath: string): PackageTarget {
  // Strip UTF-8 BOM some editors still emit on Windows.
  const raw = readFileSync(packageJsonPath, "utf8").replace(/^\uFEFF/, "");
  let packageJson: PackageJson;
  try {
    packageJson = JSON.parse(raw) as PackageJson;
  } catch (error) {
    throw new Error(`invalid JSON in ${packageJsonPath}: ${String(error)}`);
  }
  return {
    dir: dirname(packageJsonPath),
    name: typeof packageJson.name === "string" ? packageJson.name : null,
    packageJsonPath,
    packageJson,
  };
}
