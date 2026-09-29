/**
 * Rewrite ../../core and ../../../core imports to @oyna360/lobby-sdk in lobby-babylon.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = join(process.cwd(), 'packages/lobby-babylon/src');

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (extname(p) === '.ts') rewrite(p);
  }
}

function rewrite(file) {
  let src = readFileSync(file, 'utf8');
  const before = src;
  // from '../../core/foo' or "../../core/foo.js"
  src = src.replace(
    /from\s+['"](?:\.\.\/){2,}core\/([^'"]+)['"]/g,
    (_m, spec) => {
      const clean = spec.replace(/\.js$/, '');
      return `from '@oyna360/lobby-sdk'`;
    },
  );
  // export { x } from '../../core/...'
  src = src.replace(
    /export\s+(\{[^}]+\}|\*)\s+from\s+['"](?:\.\.\/){2,}core\/([^'"]+)['"]/g,
    (_m, clause) => `export ${clause} from '@oyna360/lobby-sdk'`,
  );
  if (src !== before) {
    writeFileSync(file, src);
    console.log('rewrote', file);
  }
}

walk(root);
console.log('done');
