import { readFile } from "node:fs/promises";
import path from "node:path";

import { testIgnoreRules, validateIgnoreRules } from "../core/ignore.js";

interface RunIgnoreValidateCommandOptions {
  fileName?: string;
  samples?: string[];
}

export async function runIgnoreValidateCommand(targetPath: string, options: RunIgnoreValidateCommandOptions = {}): Promise<void> {
  const fileName = options.fileName ?? ".ai-track-ignore";
  const filePath = path.join(targetPath, fileName);
  const content = await readFile(filePath, "utf8");
  const rules = content.split(/\r?\n/);
  const errors = validateIgnoreRules(rules);

  if (errors.length === 0) {
    process.stdout.write("Ignore rules hợp lệ.\n");
  } else {
    for (const error of errors) {
      process.stdout.write(`${error.line}: ${error.rule} -> ${error.message}\n`);
      if (error.suggestion) {
        process.stdout.write(`  gợi ý: ${error.suggestion}\n`);
      }
    }
  }

  if (options.samples && options.samples.length > 0) {
    const results = testIgnoreRules(rules, options.samples);
    for (const result of results) {
      process.stdout.write(`${result.sample}: ${result.ignored ? "ignored" : "tracked"}\n`);
    }
  }
}
