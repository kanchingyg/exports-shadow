// SPDX-License-Identifier: AGPL-3.0-only
import { resolve as resolveExports } from "resolve.exports";
import { CONDITIONS_BY_RUNTIME, type RuntimeName } from "./conditions";
import type { PackageJson } from "./types";

export interface ResolveResult {
  resolved: string | null;
  error: string | null;
}

/**
 * Resolve one subpath for one runtime using resolve.exports with `unsafe: true`
 * so only the pinned condition set (+ implicit "default" inside the library) applies.
 * Nested conditions, arrays, subpath patterns, and "types" are handled by resolve.exports.
 */
export function resolveSubpath(
  pkg: PackageJson,
  subpath: string,
  runtime: RuntimeName,
): ResolveResult {
  const conditions = CONDITIONS_BY_RUNTIME[runtime];
  try {
    const out = resolveExports(pkg, subpath, {
      unsafe: true,
      conditions: [...conditions],
    });
    if (out === undefined || out.length === 0) {
      return { resolved: null, error: null };
    }
    const first = out[0];
    return { resolved: first ?? null, error: null };
  } catch (error) {
    return { resolved: null, error: error instanceof Error ? error.message : String(error) };
  }
}

/** List export subpaths from a package.json exports field. */
export function listSubpaths(exportsField: unknown): string[] {
  if (exportsField === undefined || exportsField === null) {
    return ["."];
  }
  if (typeof exportsField === "string" || Array.isArray(exportsField)) {
    return ["."];
  }
  if (typeof exportsField !== "object") {
    return ["."];
  }
  const keys = Object.keys(exportsField as Record<string, unknown>);
  const subpaths = keys.filter((k) => k === "." || k.startsWith("./"));
  if (subpaths.length === 0) {
    // Conditional map at the root (no "." key) — treat as "."
    return ["."];
  }
  return subpaths;
}
