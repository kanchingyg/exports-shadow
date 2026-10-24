// SPDX-License-Identifier: AGPL-3.0-only
import type { ResolveCell, ScanResult, SubpathRow } from "./types";

/** Human-readable table: subpath × runtime → file, with shadow marks. */
export function formatTable(result: ScanResult): string {
  const lines: string[] = [];
  const title = result.package.name ?? result.package.dir;
  const ver = result.package.version ? `@${result.package.version}` : "";
  lines.push(`${title}${ver}`);
  lines.push("");

  for (const row of result.rows) {
    lines.push(formatRow(row));
  }

  if (result.hasShadow) {
    lines.push("");
    lines.push("shadow: a runtime-specific key exists but an earlier broader key wins");
  } else {
    lines.push("");
    lines.push("ok: no shadowed runtime keys");
  }
  return lines.join("\n");
}

function formatRow(row: SubpathRow): string {
  const lines: string[] = [];
  const anyShadow = row.cells.some((c) => c.shadow);
  lines.push(`${anyShadow ? "shadow" : "ok".padEnd(6)}  ${row.subpath}`);
  for (const cell of row.cells) {
    lines.push(formatCell(cell));
  }
  return lines.join("\n");
}

function formatCell(cell: ResolveCell): string {
  const label = cell.runtime.padEnd(8);
  if (cell.error) {
    return `          ${label} (error: ${cell.error})`;
  }
  const file = cell.resolved ?? "(unresolved)";
  if (cell.shadow) {
    return `          ${label} ${file}  <- shadow (${cell.winnerKey} before ${cell.shadowedKey})`;
  }
  return `          ${label} ${file}`;
}

/** Pretty-print an exports value as indented JSON with a trailing newline. */
export function formatSuggestedExports(exportsField: unknown): string {
  return `${JSON.stringify(exportsField, null, 2)}\n`;
}
