#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ALL_RUNTIMES, parseRuntimeList, type RuntimeName } from "./conditions";
import { applyReorder, undoReorder } from "./apply";
import { formatSuggestedExports, formatTable } from "./format";
import { scan } from "./scan";

const EXIT_OK = 0;
const EXIT_SHADOW = 1;
const EXIT_ERROR = 2;

interface Options {
  target: string;
  json: boolean;
  fix: boolean;
  apply: boolean;
  undo: boolean;
  yes: boolean;
  runtimes: RuntimeName[] | null;
}

function parseArgs(argv: string[]): Options | string {
  const opts: Options = {
    target: ".",
    json: false,
    fix: false,
    apply: false,
    undo: false,
    yes: false,
    runtimes: null,
  };
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--json") opts.json = true;
    else if (arg === "--fix") opts.fix = true;
    else if (arg === "--apply") opts.apply = true;
    else if (arg === "--undo") opts.undo = true;
    else if (arg === "--yes") opts.yes = true;
    else if (arg === "--runtime" || arg === "--runtimes") {
      const next = argv[++i];
      if (!next) return `${arg} needs a comma-separated list`;
      const parsed = parseRuntimeList(next);
      if (typeof parsed === "string") return parsed;
      opts.runtimes = parsed;
    } else if (arg.startsWith("--runtime=")) {
      const parsed = parseRuntimeList(arg.slice("--runtime=".length));
      if (typeof parsed === "string") return parsed;
      opts.runtimes = parsed;
    } else if (arg.startsWith("--runtimes=")) {
      const parsed = parseRuntimeList(arg.slice("--runtimes=".length));
      if (typeof parsed === "string") return parsed;
      opts.runtimes = parsed;
    } else if (arg === "--help" || arg === "-h") {
      return "HELP";
    } else if (arg.startsWith("-")) {
      return `unknown argument: ${arg}`;
    } else {
      positionals.push(arg);
    }
  }
  if (positionals.length > 1) return "pass at most one path or package name";
  if (positionals[0]) opts.target = positionals[0];
  const modes = [opts.fix, opts.apply, opts.undo].filter(Boolean).length;
  if (modes > 1) return "use only one of --fix, --apply, --undo";
  if (opts.yes && !opts.apply && !opts.undo) return "--yes only goes with --apply or --undo";
  return opts;
}

function printHelp(): void {
  console.log(`exports-shadow [path|pkg]

Show which file each runtime resolves for every exports subpath.
Flags shadow when bun/deno/workerd/worker loses to an earlier broader key.

  --json              machine-readable report (schemaVersion 1)
  --runtime <list>    subset of ${ALL_RUNTIMES.join(",")}
  --fix               print a suggested reordered exports object (no write)
  --apply             write that reorder after confirmation (backup first)
  --undo              restore the last --apply backup
  --yes               skip confirmation for --apply / --undo

Exit: 0 ok, 1 shadow found, 2 error`);
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(prompt);
    return answer.trim().toLowerCase() === "apply" || answer.trim().toLowerCase() === "undo";
  } finally {
    rl.close();
  }
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed === "HELP") {
    printHelp();
    return EXIT_OK;
  }
  if (typeof parsed === "string") {
    console.error(parsed);
    return EXIT_ERROR;
  }

  try {
    if (parsed.undo) {
      if (!parsed.yes) {
        const ok = await confirm('Type "undo" to restore the backup: ');
        if (!ok) {
          console.error("aborted");
          return EXIT_ERROR;
        }
      }
      const result = undoReorder(parsed.target);
      console.log(`restored ${result.packageJsonPath} from backup`);
      return EXIT_OK;
    }

    const result = scan(parsed.target, {
      runtimes: parsed.runtimes ?? undefined,
    });

    if (parsed.apply) {
      if (!parsed.yes) {
        console.log(formatSuggestedExports(result.suggestedExports));
        const ok = await confirm('Type "apply" to write this exports reorder (backup first): ');
        if (!ok) {
          console.error("aborted");
          return EXIT_ERROR;
        }
      }
      const applied = applyReorder(parsed.target);
      console.log(`wrote ${applied.packageJsonPath} (backup ${applied.backupPath})`);
      return EXIT_OK;
    }

    if (parsed.fix) {
      if (result.suggestedExports === null) {
        console.error("package has no exports field");
        return EXIT_ERROR;
      }
      process.stdout.write(formatSuggestedExports(result.suggestedExports));
      return result.hasShadow ? EXIT_SHADOW : EXIT_OK;
    }

    if (parsed.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatTable(result));
    }
    return result.hasShadow ? EXIT_SHADOW : EXIT_OK;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return EXIT_ERROR;
  }
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)));
}

export { main, parseArgs };
