# وصل کردن لابی به بازی

برای آواتار واقعی کاربر، Draco و شخصی‌سازی، [مرجع استاندارد آواتار](./08-avatars.md) را همراه این راهنما بخوانید. `PlatformLobby.create` آواتار محلی و remote را خودکار می‌سازد؛ loader مجزا لازم نیست.

برای رندر از **`@oyna360/lobby-babylon`** استفاده کنید.  
Core خالص: [`@oyna360/lobby-sdk`](https://www.npmjs.com/package/@oyna360/lobby-sdk).

## قرارداد

| پلتفرم می‌دهد | شما می‌سازید |
|---------------|--------------|
| `user`, `session`, `avatar` | صحنه / تم / پورتال |
| `lobby.wsUrl`, `lobby.roomId` | منطق «شروع مسابقه» |
| همگام‌سازی بازیکنان روی سوکت | گیم‌پلی بعد از خروج از لابی |

---

## پیش‌نیاز

1. `@oyna360/lobby-babylon` + `@babylonjs/core` — [02-install.md](./02-install.md)
2. ترجیحاً `@oyna360/game-sdk`
3. بازی در ادمین: `slug`, `entryUrl`, `allowedOrigins`
4. یک `<canvas>` اختصاصی لابی

---

## الگوی توصیه‌شده

```ts
import { PlatformSDK } from '@oyna360/game-sdk';
import { PlatformLobby } from '@oyna360/lobby-babylon';

const init = await PlatformSDK.init(/* Production: خالی | Direct: urls + slug */);

const lobby = await PlatformLobby.create({
  canvas,
  platformInit: init,
  roomId: init.lobby!.roomId,
  wsUrl: init.lobby!.wsUrl,
  config: {
    enableChat: true,
    enableVoice: true,
    locale: 'fa',
  },
});

lobby.applyPlazaLayout({
  onRoomStart: (room) => {
    lobby.destroy();
    startMatch(room.id);
  },
});
```

### `createFromPlatform`

```ts
const lobby = await PlatformLobby.createFromPlatform(canvas, {
  spawnPoint: { x: 0, y: 0, z: 3 },
});
```

---

## اشتباهات تکراری

- import از `@oyna360/lobby-sdk` برای `PlatformLobby` (از `0.2.0` به بعد اشتباه است)
- هاردکد `wsUrl`
- صدا زدن تابع export به‌جای متد `lobby.applyPlazaLayout`
- فراموش کردن `destroy()`
- دو کپی Babylon بدون `resolve.dedupe` در Vite

بعدی: [03-modes.md](./03-modes.md)
