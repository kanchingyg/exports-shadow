// SPDX-License-Identifier: AGPL-3.0-only
import type { RuntimeName } from "./conditions";

export type { RuntimeName } from "./conditions";

/** One cell in the subpath × runtime matrix. */
export interface ResolveCell {
  /** Runtime column this cell belongs to. */
  runtime: RuntimeName;
  /** Resolved file path relative to the package, or null if unresolved. */
  resolved: string | null;
  /** Condition key that won at the leaf (best-effort), when known. */
  matchedCondition: string | null;
  /**
   * True when a runtime-specific key (bun / deno / workerd / worker) exists
   * for this runtime but an earlier broader key won first.
   */
  shadow: boolean;
  /** The runtime-specific key that was skipped, when shadow is true. */
  shadowedKey: string | null;
  /** The broader key that won, when shadow is true. */
  winnerKey: string | null;
  /** Error message when resolution threw. */
  error: string | null;
}

/** One exports subpath and its per-runtime cells. */
export interface SubpathRow {
  /** Subpath key from the exports map (for example `"."` or `"./pack"`). */
  subpath: string;
  /** One cell per scanned runtime. */
  cells: ResolveCell[];
}

/** A package.json located on disk for scanning or apply/undo. */
export interface PackageTarget {
  /** Absolute path to the package directory. */
  dir: string;
  /** package.json name, when present. */
  name: string | null;
  /** Absolute path to package.json. */
  packageJsonPath: string;
  /** Parsed package.json object. */
  packageJson: PackageJson;
}

/** Subset of package.json fields used by the scanner. */
export interface PackageJson {
  /** Package name from package.json. */
  name?: string;
  /** Package version from package.json. */
  version?: string;
  /** Module type field (`"module"` or `"commonjs"`). */
  type?: string;
  /** Legacy main entry. */
  main?: string;
  /** Legacy ESM entry. */
  module?: string;
  /** Conditional exports map or string. */
  exports?: unknown;
  /** Other package.json keys left untyped. */
  [key: string]: unknown;
}

/** Full scan report returned by `scan` / `scanPackage`. */
export interface ScanResult {
  /** Report format version. Always 1. */
  schemaVersion: 1;
  /** Identity of the scanned package. */
  package: {
    /** package.json name, or null when missing. */
    name: string | null;
    /** package.json version, or null when missing. */
    version: string | null;
    /** Absolute path to the package directory. */
    dir: string;
  };
  /** Runtimes included as columns in this report. */
  runtimes: RuntimeName[];
  /** One row per exports subpath. */
  rows: SubpathRow[];
  /** True when any cell has shadow. */
  hasShadow: boolean;
  /** Suggested exports object with runtime-specific keys moved before broader ones. */
  suggestedExports: unknown | null;
}

/** Options for `scan` and `scanPackage`. */
export interface ScanOptions {
  /** Runtimes to include. Defaults to node, bun, deno, and workerd. */
  runtimes?: readonly RuntimeName[];
}
