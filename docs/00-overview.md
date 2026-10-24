# نمای کلی — `@oyna360/lobby-babylon`

رندر Babylon لابی oyna360. روی Core (`@oyna360/lobby-sdk`) سوار است.

دو مرجع اصلی برای پیاده‌سازی و تحویل به AI: [آواتار واقعی و شخصی‌سازی](./08-avatars.md) و [چت متن و تماس زندهٔ گروه دوستان](./09-communications.md).

| این پکیج | Core | پلتفرم | بازی |
|----------|------|--------|------|
| PlatformLobby، Avatar، صحنه | LobbyClient، AvatarState | هویت / سشن | تم، پورتال، شروع مسابقه |

جریان:

```text
PlatformSDK.init()
  → PlatformLobby.create({ platformInit })
  → applyPlazaLayout / portals
  → destroy() → gameplay
```

نصب: [02-install.md](./02-install.md)
