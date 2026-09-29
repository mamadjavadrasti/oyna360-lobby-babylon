# @oyna360/lobby-babylon

لابی سه‌بعدی **oyna360** برای بازی‌سازان — بر پایه Babylon.js.

پلتفرم هویت، آواتار و اتاق WebSocket را می‌دهد.  
**ظاهر لابی، پورتال‌ها و شروع گیم‌پلی مال شماست.**

**نسخه:** `0.2.0` · وابسته به [`@oyna360/lobby-sdk`](https://www.npmjs.com/package/@oyna360/lobby-sdk) (Core).

> اتصال اولیه (سشن / Authorize) کار [`@oyna360/game-sdk`](https://www.npmjs.com/package/@oyna360/game-sdk) است.

---

## نصب

```bash
npm install @oyna360/lobby-babylon @babylonjs/core
# یا
pnpm add @oyna360/lobby-babylon @babylonjs/core
```

`@oyna360/lobby-sdk` به‌صورت dependency نصب می‌شود.  
`@babylonjs/core` peer است (نسخه ۷ توصیه می‌شود).

```json
{
  "dependencies": {
    "@oyna360/lobby-babylon": "^0.2.0",
    "@babylonjs/core": "^7.44.0"
  }
}
```

### به‌روزرسانی

```bash
npm install @oyna360/lobby-babylon@latest @oyna360/lobby-sdk@latest
```

بعد از آپدیت: `rm -rf node_modules/.vite`

### Vite — جلوگیری از دو کپی Babylon

اگر بازی هم `@babylonjs/core` دارد:

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    dedupe: ['@babylonjs/core', '@babylonjs/loaders'],
  },
});
```

---

## معماری

```text
بازی شما
   ↓
@oyna360/lobby-babylon   ← PlatformLobby, AvatarFactory, Scene
   ↓
@oyna360/lobby-sdk       ← LobbyClient, AvatarState, Protocol
   ↓
Socket.IO /lobby
```

بیشتر نمادهای Core از همین پکیج re-export می‌شوند؛ برای اکثر بازی‌ها یک import کافی است:

```ts
import { PlatformLobby, LobbyClient } from '@oyna360/lobby-babylon';
```

---

## سه حالت ورود

| حالت | کی | API |
|------|-----|-----|
| **Production** | `/play/{slug}` | `createFromPlatform` یا `create({ platformInit })` |
| **Direct Development** | origin بازی + game-sdk Authorize | `create({ platformInit })` |
| **Offline / Fake** | تست UI بدون سرور | `createDev()` |

---

## شروع سریع — با پلتفرم

```ts
import { PlatformSDK } from '@oyna360/game-sdk';
import { PlatformLobby } from '@oyna360/lobby-babylon';

const canvas = document.getElementById('lobby') as HTMLCanvasElement;

const init = await PlatformSDK.init({
  // Direct فقط: platformUrl, platformWebUrl, gameSlug
});

const lobby = await PlatformLobby.create({
  canvas,
  platformInit: init,
  roomId: init.lobby!.roomId,
  wsUrl: init.lobby!.wsUrl,
});

lobby.applyPlazaLayout({
  onRoomStart: (room) => {
    lobby.destroy();
    startGameplay(room.id);
  },
});
```

`wsUrl` / `roomId` را هاردکد نکنید.

---

## شروع سریع — UI آفلاین

```ts
const lobby = await PlatformLobby.createDev({
  canvas,
  roomId: 'game:my-game',
  config: { enableMultiplayer: false },
});
lobby.applyPlazaLayout();
```

---

## Avatar customization (محلی + شبکه)

```ts
lobby.avatar.setSkin({ bodyColor: '#4f46e5' });
lobby.avatar.addAccessory({ id: 'hat-1', itemId: 'cap', slot: 'hat' });
```

State در Core نگه داشته می‌شود؛ Babylon فقط رندر می‌کند. بعد از اتصال، سرور validate می‌کند و به remoteها می‌فرستد.

---

## Migration از `@oyna360/lobby-sdk` ≤ 0.1.x

```diff
- npm install @oyna360/lobby-sdk @babylonjs/core
+ npm install @oyna360/lobby-babylon @babylonjs/core

- import { PlatformLobby } from '@oyna360/lobby-sdk';
+ import { PlatformLobby } from '@oyna360/lobby-babylon';
```

API عمومی `PlatformLobby` همان است (`create` / `createFromPlatform` / `createDev` / `sendChat` / …).

---

## مستندات

| موضوع | فایل |
|--------|------|
| نصب و publish | [docs/02-install.md](./docs/02-install.md) |
| اتصال | [docs/01-connect.md](./docs/01-connect.md) |
| حالت‌ها | [docs/03-modes.md](./docs/03-modes.md) |
| API `PlatformLobby` | [docs/04-api.md](./docs/04-api.md) |
| آواتار، چت، voice، data | [docs/05-features.md](./docs/05-features.md) |
| کنترل‌ها | [docs/06-controls.md](./docs/06-controls.md) |
| عیب‌یابی | [docs/07-troubleshooting.md](./docs/07-troubleshooting.md) |
| Core (بدون Babylon) | [`@oyna360/lobby-sdk`](https://www.npmjs.com/package/@oyna360/lobby-sdk) |

---

## امکانات اصلی

- صحنه Babylon، دوربین سوم‌شخص، برخورد
- آواتار procedural / GLB + اکسسوری
- بازیکنان remote، حرکت، انیمیشن
- چت زنده، presence، voice (اختیاری)
- کانال `lobby:data`
- Plaza / Starter layout، zone، portal، plugin
- AvatarState sync (`lobby:avatar:update`)

---

## لایسنس

MIT
