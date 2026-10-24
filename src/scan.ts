// SPDX-License-Identifier: AGPL-3.0-only
import { ALL_RUNTIMES, type RuntimeName } from "./conditions";
import { loadPackage } from "./load";
import { listSubpaths, resolveSubpath } from "./resolve";
import { suggestReorder } from "./reorder";
import { detectShadow, exportTarget } from "./shadow";
import type { PackageTarget, ResolveCell, ScanOptions, ScanResult, SubpathRow } from "./types";

/**
 * Build a subpath × runtime report for an already loaded package.
 * Does not write package.json.
 */
export function scanPackage(target: PackageTarget, options: ScanOptions = {}): ScanResult {
  const runtimes = options.runtimes?.length ? [...options.runtimes] : [...ALL_RUNTIMES];
  const exportsField = target.packageJson.exports;
  const subpaths = listSubpaths(exportsField);
  const rows: SubpathRow[] = [];
  let hasShadow = false;

  for (const subpath of subpaths) {
    const targetValue = exportTarget(exportsField, subpath);
    const cells: ResolveCell[] = [];
    for (const runtime of runtimes) {
      const resolved = resolveSubpath(target.packageJson, subpath, runtime);
      const shadowInfo =
        targetValue === undefined
          ? { shadow: false, shadowedKey: null, winnerKey: null, matchedCondition: null }
          : detectShadow(targetValue, runtime);
      const cell: ResolveCell = {
        runtime,
        resolved: resolved.resolved,
        matchedCondition: shadowInfo.matchedCondition,
        shadow: shadowInfo.shadow,
        shadowedKey: shadowInfo.shadowedKey,
        winnerKey: shadowInfo.winnerKey,
        error: resolved.error,
      };
      if (cell.shadow) hasShadow = true;
      cells.push(cell);
    }
    rows.push({ subpath, cells });
  }

  const suggestedExports =
    exportsField === undefined ? null : suggestReorder(exportsField);

  return {
    schemaVersion: 1,
    package: {
      name: target.name,
      version: typeof target.packageJson.version === "string" ? target.packageJson.version : null,
      dir: target.dir,
    },
    runtimes,
    rows,
    hasShadow,
    suggestedExports,
  };
}

/**
 * Load a package from a path, package.json file, or installed dependency name,
 * then return the same report as {@link scanPackage}.
 */
export function scan(target: string, options: ScanOptions & { cwd?: string } = {}): ScanResult {
  const pkg = loadPackage(target, options.cwd ?? process.cwd());
  return scanPackage(pkg, options);
}

export type { RuntimeName };
