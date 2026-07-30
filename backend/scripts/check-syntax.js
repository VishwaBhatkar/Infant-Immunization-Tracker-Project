import { readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Recursively collect all JavaScript files from a directory
function collectJavaScriptFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
    } else if (
      entry.isFile() &&
      extname(entry.name) === '.js'
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

// Resolve project root directory
const projectRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..'
);

// Collect all JavaScript source files
const files = collectJavaScriptFiles(
  join(projectRoot, 'src')
);

let failed = false;

// Check each JavaScript file for syntax errors
for (const file of files) {
  const result = spawnSync(
    process.execPath,
    ['--check', file],
    {
      stdio: 'inherit'
    }
  );

  if (result.status !== 0) {
    failed = true;
  }
}

// Stop execution if any syntax errors are found
if (failed) {
  process.exit(1);
}

// Verify that the main application module imports successfully
const importCheck = spawnSync(
  process.execPath,
  [
    '--input-type=module',
    '--eval',
    "await import('./src/app.js')"
  ],
  {
    stdio: 'inherit',
    cwd: projectRoot
  }
);

// Stop execution if module import fails
if (importCheck.status !== 0) {
  process.exit(importCheck.status || 1);
}

console.log(
  `Syntax and module import checks passed for ${files.length} JavaScript files.`
);