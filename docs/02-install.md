# نصب — `@oyna360/lobby-babylon`

```bash
npm install @oyna360/lobby-babylon @babylonjs/core
pnpm add @oyna360/lobby-babylon @babylonjs/core
```

```json
{
  "dependencies": {
    "@oyna360/lobby-babylon": "^0.2.0",
    "@babylonjs/core": "^7.44.0"
  }
}
```

Core (`@oyna360/lobby-sdk@^0.2.0`) به‌صورت dependency می‌آید.

جزئیات publish و migration: [`@oyna360/lobby-sdk` docs/02-install.md](../../lobby-sdk/docs/02-install.md).

## Vite dedupe

```ts
resolve: { dedupe: ['@babylonjs/core', '@babylonjs/loaders'] }
```

## سلامت dist

در `node_modules/@oyna360/lobby-babylon/dist` باید `platform-lobby.js` و `avatar-factory.js` باشد.
