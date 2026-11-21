import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const platformVariables: Record<string, string> = {
  NODE_ENV: 'Set by Next.js and Node (development, test, production).',
  CI: 'Set by GitHub Actions and most CI runners.',
  NEXT_RUNTIME: 'Set by Next.js to nodejs or edge.',
};
const platformPrefixes: Record<string, string> = {
  VERCEL_: 'Set by the Vercel platform on every deployment.',
};

const liveCredentialPattern = /pk_live_|sk_live_|neon\.tech|vercel\.(app|com)/i;
const directReadPattern = /\b(?:process\.env|environment|env)(?:\.([A-Z][A-Z0-9_]*)|\[\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\])/g;
const composeReadPattern = /\$\{([A-Z][A-Z0-9_]*)/g;
const quotedNamePattern = /['"]([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)['"]/g;
const exampleLinePattern = /^#?\s*([A-Z][A-Z0-9_]*)=(.*)$/;

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

function codeFiles(): string[] {
  const rootFiles = readdirSync(root).filter((name) => /\.config\.(ts|js|mjs|cjs)$/.test(name) || name === 'docker-compose.yml').map((name) => join(root, name));
  const sourceFiles = [...listFiles(join(root, 'src')), ...listFiles(join(root, 'scripts'))].filter((path) => /\.(ts|tsx)$/.test(path));
  return [...rootFiles, ...sourceFiles];
}

function isPlatformVariable(name: string): boolean {
  return name in platformVariables || Object.keys(platformPrefixes).some((prefix) => name.startsWith(prefix));
}

function readExample(): Map<string, string> {
  const variables = new Map<string, string>();
  for (const line of readFileSync(join(root, '.env.example'), 'utf8').split('\n')) {
    const match = exampleLinePattern.exec(line.trim());
    if (match) variables.set(match[1], match[2]);
  }
  return variables;
}

function readmeVariables(): Set<string> {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const section = /^## Environment variables\n([\s\S]*?)(?=^## )/m.exec(readme)?.[1] ?? '';
  const names = [...section.matchAll(/`([A-Z][A-Z0-9_]*)`/g)].map((match) => match[1]);
  return new Set(names);
}

function addRead(reads: Map<string, Set<string>>, name: string, file: string): void {
  if (isPlatformVariable(name)) return;
  reads.set(name, (reads.get(name) ?? new Set()).add(relative(root, file)));
}

function readsInCode(exampleNames: Set<string>): Map<string, Set<string>> {
  const reads = new Map<string, Set<string>>();
  for (const file of codeFiles()) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(directReadPattern)) addRead(reads, match[1] ?? match[2], file);
    if (file.endsWith('.yml')) for (const match of text.matchAll(composeReadPattern)) addRead(reads, match[1], file);
    // Some modules read a variable through a name constant, so a quoted name that .env.example lists counts as a read.
    for (const match of text.matchAll(quotedNamePattern)) if (exampleNames.has(match[1])) addRead(reads, match[1], file);
  }
  return reads;
}

function filesOf(reads: Map<string, Set<string>>, name: string): string {
  return [...(reads.get(name) ?? [])].join(', ');
}

describe('.env.example and the README match the variables the code reads', () => {
  const example = readExample();
  const exampleNames = new Set(example.keys());
  const reads = readsInCode(exampleNames);
  const documented = readmeVariables();

  it('lists every variable the code reads in .env.example', () => {
    const missing = [...reads.keys()].filter((name) => !exampleNames.has(name)).map((name) => `${name} (read in ${filesOf(reads, name)})`);
    expect(missing, `Add these variables to .env.example, as a line or a commented line:\n${missing.join('\n')}`).toEqual([]);
  });

  it('keeps no variable in .env.example that no code reads', () => {
    const unused = [...exampleNames].filter((name) => !reads.has(name) && !isPlatformVariable(name));
    expect(unused, `No code reads these variables any more; remove them from .env.example and the README: ${unused.join(', ')}`).toEqual([]);
  });

  it('describes every variable the code reads in the README "Environment variables" section', () => {
    const missing = [...reads.keys()].filter((name) => !documented.has(name)).map((name) => `${name} (read in ${filesOf(reads, name)})`);
    expect(missing, `Describe these variables in the README "Environment variables" section:\n${missing.join('\n')}`).toEqual([]);
  });

  it('keeps no variable in the README that .env.example does not list', () => {
    const unknown = [...documented].filter((name) => !exampleNames.has(name));
    expect(unknown, `The README describes variables missing from .env.example: ${unknown.join(', ')}`).toEqual([]);
  });

  it('holds no live-looking credential in .env.example', () => {
    const suspicious = [...example].filter(([, value]) => liveCredentialPattern.test(value)).map(([name]) => name);
    expect(suspicious, `.env.example holds a live-looking value for: ${suspicious.join(', ')}. Use a placeholder.`).toEqual([]);
  });
});
