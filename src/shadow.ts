// SPDX-License-Identifier: AGPL-3.0-only
import {
  BROADER_KEYS,
  CONDITIONS_BY_RUNTIME,
  runtimeKeysFor,
  type RuntimeName,
} from "./conditions";

const BROADER = new Set<string>(BROADER_KEYS);

export interface ShadowHit {
  shadow: boolean;
  shadowedKey: string | null;
  winnerKey: string | null;
  matchedCondition: string | null;
}

interface WalkHit extends ShadowHit {
  resolvedLeaf: boolean;
}

/**
 * Walk a conditional exports value the way resolvers do (key order, first match)
 * and detect when a broader key wins while a later runtime-specific key would
 * also have matched under this runtime's conditions.
 */
export function detectShadow(value: unknown, runtime: RuntimeName): ShadowHit {
  const conditions = new Set(CONDITIONS_BY_RUNTIME[runtime]);
  const runtimeKeys = runtimeKeysFor(runtime);
  if (runtimeKeys.size === 0) {
    const matched = matchCondition(value, conditions);
    return {
      shadow: false,
      shadowedKey: null,
      winnerKey: null,
      matchedCondition: matched,
    };
  }
  const hit = walk(value, conditions, runtimeKeys);
  return {
    shadow: hit.shadow,
    shadowedKey: hit.shadowedKey,
    winnerKey: hit.winnerKey,
    matchedCondition: hit.matchedCondition,
  };
}

function walk(
  value: unknown,
  conditions: ReadonlySet<string>,
  runtimeKeys: ReadonlySet<string>,
): WalkHit {
  if (value === null || typeof value === "string") {
    return empty(null);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = walk(item, conditions, runtimeKeys);
      if (hit.matchedCondition !== null || hit.shadow || hit.resolvedLeaf) {
        return hit;
      }
    }
    return empty(null);
  }
  if (typeof value !== "object") {
    return empty(null);
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  const applicableRuntime = keys.filter((k) => runtimeKeys.has(k) && conditions.has(k));

  for (const key of keys) {
    if (key === "types") continue;
    if (!(conditions.has(key) || key === "default")) continue;

    if (runtimeKeys.has(key)) {
      const inner = walk(record[key], conditions, runtimeKeys);
      return {
        shadow: false,
        shadowedKey: null,
        winnerKey: null,
        matchedCondition: inner.matchedCondition ?? key,
        resolvedLeaf: true,
      };
    }

    if (BROADER.has(key) && applicableRuntime.length > 0) {
      const inner = walk(record[key], conditions, runtimeKeys);
      return {
        shadow: true,
        shadowedKey: applicableRuntime[0] ?? null,
        winnerKey: key,
        matchedCondition: inner.matchedCondition ?? key,
        resolvedLeaf: true,
      };
    }

    const child = record[key];
    if (child !== null && typeof child === "object") {
      const inner = walk(child, conditions, runtimeKeys);
      if (inner.shadow || inner.matchedCondition !== null || inner.resolvedLeaf) {
        return {
          ...inner,
          matchedCondition: inner.matchedCondition ?? key,
        };
      }
    }
    return {
      shadow: false,
      shadowedKey: null,
      winnerKey: null,
      matchedCondition: key,
      resolvedLeaf: true,
    };
  }

  return empty(null);
}

function empty(matched: string | null): WalkHit {
  return {
    shadow: false,
    shadowedKey: null,
    winnerKey: null,
    matchedCondition: matched,
    resolvedLeaf: false,
  };
}

function matchCondition(value: unknown, conditions: ReadonlySet<string>): string | null {
  if (typeof value === "string" || value === null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const m = matchCondition(item, conditions);
      if (m !== null) return m;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key === "types") continue;
    if (conditions.has(key) || key === "default") {
      const inner = matchCondition((value as Record<string, unknown>)[key], conditions);
      return inner ?? key;
    }
  }
  return null;
}

/** Get the exports target for one subpath (handles root conditional maps). */
export function exportTarget(exportsField: unknown, subpath: string): unknown {
  if (exportsField === undefined || exportsField === null) return undefined;
  if (typeof exportsField === "string" || Array.isArray(exportsField)) {
    return subpath === "." ? exportsField : undefined;
  }
  if (typeof exportsField !== "object") return undefined;
  const map = exportsField as Record<string, unknown>;
  if (subpath in map) return map[subpath];
  const keys = Object.keys(map);
  const hasSubpathKeys = keys.some((k) => k === "." || k.startsWith("./"));
  if (!hasSubpathKeys && subpath === ".") return exportsField;
  return undefined;
}
