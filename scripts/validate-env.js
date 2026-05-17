#!/usr/bin/env node
/**
 * Checks that every env var referenced in src/ is present in .env.example.
 * Run with: node scripts/validate-env.js
 * CI fails if exit code is non-zero.
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob'); // uses Node 22 built-in glob or falls back

const examplePath = path.resolve(__dirname, '../.env.example');
const exampleKeys = new Set(
  fs.readFileSync(examplePath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=')[0].trim())
);

const srcFiles = fs.readdirSync(path.resolve(__dirname, '../src'), { recursive: true })
  .filter(f => f.endsWith('.ts'))
  .map(f => path.resolve(__dirname, '../src', f));

const missing = [];
for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = [...content.matchAll(/process\.env\.([A-Z_]+)/g)];
  for (const [, key] of matches) {
    if (!exampleKeys.has(key)) missing.push({ key, file });
  }
}

if (missing.length) {
  console.error('Missing from .env.example:');
  missing.forEach(({ key, file }) => console.error(`  ${key}  (${file})`));
  process.exit(1);
}

console.log('All env vars documented in .env.example ✓');
