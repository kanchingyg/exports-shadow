// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Public library API for exports-shadow.
 * Importing this module does not spawn processes or call process.exit.
 */
export {
  ALL_RUNTIMES,
  BUN_CONDITIONS,
  BROADER_KEYS,
  CONDITIONS_BY_RUNTIME,
  DENO_CONDITIONS,
  NODE_CONDITIONS,
  RUNTIME_SPECIFIC_KEYS,
  WORKERD_CONDITIONS,
  isRuntimeName,
  parseRuntimeList,
  runtimeKeysFor,
  type RuntimeName,
  type RuntimeSpecificKey,
} from "./conditions";
export { applyReorder, undoReorder, type ApplyResult, type ApplyState } from "./apply";
export { loadPackage } from "./load";
export { listSubpaths, resolveSubpath, type ResolveResult } from "./resolve";
export { detectShadow, exportTarget, type ShadowHit } from "./shadow";
export { suggestReorder } from "./reorder";
export { scan, scanPackage } from "./scan";
export { formatSuggestedExports, formatTable } from "./format";
export type {
  PackageJson,
  PackageTarget,
  ResolveCell,
  ScanOptions,
  ScanResult,
  SubpathRow,
} from "./types";
