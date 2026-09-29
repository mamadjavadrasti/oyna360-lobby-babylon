import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'packages/lobby-babylon/docs');
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.md')) continue;
  const p = join(dir, f);
  let s = readFileSync(p, 'utf8');
  s = s.replaceAll("from '@oyna360/lobby-sdk'", "from '@oyna360/lobby-babylon'");
  s = s.replaceAll(
    'npm install @oyna360/lobby-sdk @babylonjs/core',
    'npm install @oyna360/lobby-babylon @babylonjs/core',
  );
  s = s.replaceAll(
    'pnpm add @oyna360/lobby-sdk @babylonjs/core',
    'pnpm add @oyna360/lobby-babylon @babylonjs/core',
  );
  s = s.replaceAll('@oyna360/lobby-sdk@latest', '@oyna360/lobby-babylon@latest');
  s = s.replaceAll('node_modules/@oyna360/lobby-sdk', 'node_modules/@oyna360/lobby-babylon');
  s = s.replaceAll(
    '`@oyna360/lobby-sdk` + `@babylonjs/core`',
    '`@oyna360/lobby-babylon` + `@babylonjs/core`',
  );
  s = s.replaceAll('عیب‌یابی — lobby-sdk', 'عیب‌یابی — lobby-babylon');
  s = s.replaceAll(
    "import { ShopZonePlugin, defineLobbyPlugin } from '@oyna360/lobby-sdk'",
    "import { ShopZonePlugin, defineLobbyPlugin } from '@oyna360/lobby-babylon'",
  );
  s = s.replaceAll('lobby-sdk →', 'lobby-babylon →');
  writeFileSync(p, s);
  console.log('updated', f);
}
