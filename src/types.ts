// SPDX-License-Identifier: AGPL-3.0-only
import type { RuntimeName } from "./conditions";

export type { RuntimeName } from "./conditions";

/** One cell in the subpath × runtime matrix. */
export interface ResolveCell {
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

export interface SubpathRow {
  subpath: string;
  cells: ResolveCell[];
}

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

export interface PackageJson {
  name?: string;
  version?: string;
  type?: string;
  main?: string;
  module?: string;
  exports?: unknown;
  [key: string]: unknown;
}

export interface ScanResult {
  schemaVersion: 1;
  package: {
    name: string | null;
    version: string | null;
    dir: string;
  };
  runtimes: RuntimeName[];
  rows: SubpathRow[];
  /** True when any cell has shadow. */
  hasShadow: boolean;
  /** Suggested exports object with runtime-specific keys moved before broader ones. */
  suggestedExports: unknown | null;
}

export interface ScanOptions {
  runtimes?: readonly RuntimeName[];
}
