// SPDX-License-Identifier: AGPL-3.0-only
import { BROADER_KEYS, RUNTIME_SPECIFIC_KEYS } from "./conditions";

const RUNTIME_SET = new Set<string>(RUNTIME_SPECIFIC_KEYS);
const BROADER_SET = new Set<string>(BROADER_KEYS);

/**
 * Suggest a reordered exports tree: at every condition object that mixes
 * runtime-specific keys with broader keys, move runtime-specific keys before
 * broader ones (preserving relative order within each group). Never writes.
 */
export function suggestReorder(exportsField: unknown): unknown {
  return reorderValue(exportsField);
}

function reorderValue(value: unknown): unknown {
  if (value === null || typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(reorderValue);
  if (typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  const runtimeKeys = keys.filter((k) => RUNTIME_SET.has(k));
  const broaderKeys = keys.filter((k) => BROADER_SET.has(k));

  const needsReorder =
    runtimeKeys.length > 0 &&
    broaderKeys.length > 0 &&
    broaderKeys.some((bk) => runtimeKeys.some((rk) => keys.indexOf(bk) < keys.indexOf(rk)));

  const finalKeys = needsReorder
    ? [
        ...keys.filter((k) => k === "types"),
        ...runtimeKeys,
        ...keys.filter((k) => k !== "types" && !RUNTIME_SET.has(k) && !BROADER_SET.has(k)),
        ...broaderKeys,
      ]
    : keys;

  const out: Record<string, unknown> = {};
  for (const key of finalKeys) {
    out[key] = reorderValue(record[key]);
  }
  return out;
}
