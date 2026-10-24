// SPDX-License-Identifier: AGPL-3.0-only
import { copyFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadPackage } from "./load";
import { suggestReorder } from "./reorder";
import type { PackageJson } from "./types";

export const STATE_FILE = ".exports-shadow-state.json";
export const BACKUP_SUFFIX = ".exports-shadow.bak";

export interface ApplyState {
  packageJsonPath: string;
  backupPath: string;
  appliedAt: string;
}

export interface ApplyResult {
  packageJsonPath: string;
  backupPath: string;
  wrote: boolean;
}

/**
 * Write the suggested exports reorder. Copies package.json to a sibling
 * `.exports-shadow.bak` first and records state for `--undo`.
 */
export function applyReorder(target: string, cwd: string = process.cwd()): ApplyResult {
  const pkg = loadPackage(target, cwd);
  if (pkg.packageJson.exports === undefined) {
    throw new Error("package.json has no exports field to reorder");
  }
  const suggested = suggestReorder(pkg.packageJson.exports);
  const backupPath = pkg.packageJsonPath + BACKUP_SUFFIX;
  copyFileSync(pkg.packageJsonPath, backupPath);

  const next: PackageJson = { ...pkg.packageJson, exports: suggested };
  writeFileSync(pkg.packageJsonPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  const state: ApplyState = {
    packageJsonPath: pkg.packageJsonPath,
    backupPath,
    appliedAt: new Date().toISOString(),
  };
  writeFileSync(join(pkg.dir, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`, "utf8");

  return { packageJsonPath: pkg.packageJsonPath, backupPath, wrote: true };
}

/** Restore package.json from the backup recorded by the last --apply in that package. */
export function undoReorder(target: string, cwd: string = process.cwd()): ApplyResult {
  const pkg = loadPackage(target, cwd);
  const statePath = join(pkg.dir, STATE_FILE);
  if (!existsSync(statePath)) {
    throw new Error(`no ${STATE_FILE} in ${pkg.dir}; nothing to undo`);
  }
  const state = JSON.parse(readFileSync(statePath, "utf8")) as ApplyState;
  if (!existsSync(state.backupPath)) {
    throw new Error(`backup missing: ${state.backupPath}`);
  }
  copyFileSync(state.backupPath, state.packageJsonPath);
  unlinkSync(state.backupPath);
  unlinkSync(statePath);
  return { packageJsonPath: state.packageJsonPath, backupPath: state.backupPath, wrote: true };
}
