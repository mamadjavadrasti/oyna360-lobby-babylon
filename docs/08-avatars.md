# راه استاندارد آواتار اوینا — مرجع بازی‌ساز و AI

برای لابی سه‌بعدی، **`PlatformSDK.init()` → `PlatformLobby.create({ platformInit })`** مسیر استاندارد است. همین مسیر آواتار واقعی کاربر و بازیکنان دیگر را می‌سازد. Draco فقط فشرده‌سازی بعضی فایل‌های GLB است؛ یک روش جایگزین برای ساخت آواتار نیست و decoder آن در SDK مدیریت می‌شود.

## ۱. نصب و اتصال کامل

```bash
npm install @oyna360/game-sdk @oyna360/lobby-babylon @babylonjs/core@^7.44.0
```

در Vite از دو نسخهٔ Babylon جلوگیری کنید:

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: { dedupe: ['@babylonjs/core', '@babylonjs/loaders'] },
});
```

```html
<canvas id="lobby" style="display:block;width:100%;height:100vh;touch-action:none"></canvas>
```

```ts
import { PlatformSDK } from '@oyna360/game-sdk';
import { PlatformLobby } from '@oyna360/lobby-babylon';

const canvas = document.querySelector<HTMLCanvasElement>('#lobby');
if (!canvas) throw new Error('Lobby canvas is missing');

// داخل iframe پلتفرم:
const platformInit = await PlatformSDK.init();
if (!platformInit.lobby?.roomId || !platformInit.lobby.wsUrl) {
  throw new Error('Platform did not provide lobby connection settings');
}

const lobby = await PlatformLobby.create({
  canvas,
  platformInit, // کل payload اصلی؛ avatar و avatarBases را حذف/جایگزین نکنید
  roomId: platformInit.lobby.roomId,
  wsUrl: platformInit.lobby.wsUrl,
  config: { locale: 'fa' },
});
lobby.applyStarterLayout(); // یا lobby.applyPlazaLayout(...)

// هنگام ترک لابی یا unmount صفحه:
// lobby.destroy();
```

ساخت `PlatformLobby` موتور، صحنه و حلقهٔ رندر خودش را دارد. روی همین canvas موتور دوم نسازید. برای ورود یک کاربر، یک نمونهٔ لابی بسازید. React/Vue باید هنگام unmount آن را destroy کنند؛ اگر create به‌صورت async پس از unmount تمام شد، نمونهٔ تازه‌ساخته‌شده را هم destroy کنید.

در Developer Environment فقط مرحلهٔ init را طبق راهنمای game-sdk با `platformUrl` و `dev.clientId` / `dev.credential` انجام دهید؛ از همان payload واقعی برای create استفاده کنید. `createDev()` هویت و آواتار آزمایشی می‌سازد و جای اتصال کاربر واقعی را نمی‌گیرد.

## ۲. SDK دقیقاً چه چیزی را بارگذاری می‌کند؟

| داده | معنی و نحوهٔ استفاده |
|---|---|
| `platformInit.avatar` | ظاهر انتخاب‌شدهٔ کاربر فعلی؛ ورودی اصلی رندر |
| `avatar.presetKind` | `glb` برای مدل سه‌بعدی، `procedural` برای مدل تولیدشده با کد |
| `avatar.customConfig.glbUrl` | URL فایل GLB انتخاب‌شده؛ فقط وقتی kind برابر glb است |
| `avatar.customConfig.baseAlbedoUrl` | تکسچر لباس/رنگ انتخاب‌شده؛ همراه مدل نگه دارید |
| `avatar.customConfig.accessories` | اکسسوری‌های همراه آواتار |
| `platformInit.avatarBases` | کاتالوگ پایه‌ها برای کش و preload؛ اولین عضو لزوماً آواتار کاربر نیست |
| `player.avatar` | ظاهر هر بازیکن دیگر از سرور لابی؛ از آواتار خودتان برای همه کپی نکنید |

`user.avatarUrl` تصویر پروفایل است؛ ورودی مدل سه‌بعدی نیست. نام فایل یا URL مدل را از userId/presetKey حدس نزنید. URLهای مطلق پلتفرم را به pathname نسبی تبدیل نکنید؛ `/uploads/...` روی origin بازی معمولاً فایل دیگری است یا 404 می‌دهد.

در `PlatformLobby` این مراحل خودکارند: دریافت مدل، آماده‌سازی decoder، کش container در هر scene، ساخت instance با skeleton و material مستقل، تنظیم اندازه/ارتفاع، لباس و اکسسوری، کنترل حرکت و انیمیشن. بازیکن remote ابتدا ممکن است placeholder داشته باشد و سپس مدل واقعی جایگزینش شود. بارگذاری GLB ناموفق نیز می‌تواند به مدل procedural برگردد؛ دیده‌شدن یک آدمک ساده، به‌تنهایی نشانهٔ موفقیت لود GLB نیست.

برای این مسیر `SceneLoader.ImportMeshAsync`، DracoLoader دستی، mesh جایگزین یا سوکت دوم اضافه نکنید. `AvatarFactory.create()` هم روش لود GLB نیست؛ متد sync آن فقط مدل procedural می‌سازد.

## ۳. کار با آواتار داخل لابی

```ts
const appearance = lobby.getAvatar();        // ظاهر، نه mesh
const state = lobby.avatar.getState();       // snapshot مستقل از renderer
const root = lobby.getLocalController().root; // TransformNode فعلی کاربر
const scene = lobby.getScene();

// اکسسوری سادهٔ قابل رندر؛ kind را مشخص کنید، itemId به‌تنهایی مدل تولید نمی‌کند.
lobby.avatar.addAccessory({
  id: 'game-cap', itemId: 'cap', slot: 'hat', kind: 'cap',
});
lobby.avatar.removeAccessory('game-cap');

// فقط برای ظاهر بدون تکسچر لباس: patch فیلدهای دیگر را حفظ می‌کند.
if (!appearance.customConfig.baseAlbedoUrl) {
  lobby.avatar.patchSkin({ bodyColor: '#4f46e5' });
}

const off = lobby.avatar.on('change', ({ state, reason }) => {
  console.log(reason, state.baseId);
});
// هنگام پاکسازی UI اختصاصی:
// off();
```

`patchSkin` تغییر جزئی است؛ `setSkin` کل skin قبلی را جایگزین می‌کند و استفادهٔ اشتباه از آن می‌تواند تکسچر لباس را حذف کند. برای حفظ ظاهر رسمی کاربر، تغییر رنگ/لباس را اختیاری کنید. متریال‌های مدل و تکسچر مشترک کش را مستقیم دستکاری یا dispose نکنید.

محدودیت‌های نسخهٔ فعلی:

| API | رفتار واقعی |
|---|---|
| `patchSkin` / `setSkin` | در لابی، tint/baseAlbedo و اکسسوری از مسیر موجود اعمال می‌شود؛ یک ویرایشگر کامل لباس نیست |
| `addAccessory` | renderer فعلی slotهای `hat/back/face/hand` و primitiveهای `cap/pack/glasses/watch` را می‌شناسد؛ اکسسوری GLB به URL معتبر نیاز دارد |
| `setBase` | Core state را تغییر می‌دهد؛ مدل محلی موجود را زنده تعویض نمی‌کند. برای مدل پایهٔ تازه، لابی را با payload تازه و تأییدشدهٔ پلتفرم دوباره بسازید |
| `attach` / `removeAttachment` | دادهٔ Core هستند؛ renderer فعلی attachmentهای دلخواه را خودکار به mesh تبدیل نمی‌کند |
| `setAnimation` | state است؛ جای کنترل حرکت/حلقهٔ انیمیشن را نمی‌گیرد |

تغییرات ظاهری در اتصال فعال به سرور پیشنهاد و sanitize می‌شوند. این APIها انتخاب رسمی آواتار را در حساب کاربر ذخیره نمی‌کنند. URL مطلق دلخواه برای مدل/تکسچر/اکسسوری در پیام‌های شخصی‌سازی شبکه پذیرفته نمی‌شود؛ مسیر دریافت ظاهر از پلتفرم با مسیر پیشنهاد تغییر توسط بازی فرق دارد. بنابراین از افزودن asset محلی نتیجه نگیرید که همان asset برای دیگران هم نمایش داده می‌شود.

حرکت بازیکن از `LocalPlayerController` انجام می‌شود؛ تغییر مستقیم root در هر فریم با آن تداخل دارد. برای جابه‌جایی از `lobby.getLocalController().teleportTo({ x: 0, y: 0, z: 3 })` و برای ورودی از متدهای `lobby.setMoveStick` / `jump` استفاده کنید. انیمیشن حرکت در لابی آماده خودکار است.

## ۴. آواتار در صحنهٔ Babylon اختصاصی، بدون ساخت لابی دوم

اگر خودتان scene و حلقهٔ رندر دارید، از همان pipeline رسمی استفاده کنید:

```ts
import { AvatarFactory, HumanoidAnimator } from '@oyna360/lobby-babylon';

// scene از موتور موجود بازی است؛ platformInit از game-sdk گرفته شده است.
const avatar = await AvatarFactory.createInstanceAsync(
  scene,
  platformInit.avatar,
  `avatar-${platformInit.user.id}`, // نام یکتا برای هر instance
  platformInit.user.displayName,
  platformInit.user.username,
  { collider: false },
);
avatar.setPosition({ x: 0, y: 0, z: 0 });
const animator = new HumanoidAnimator(avatar);
const observer = scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
  animator.update(dt, 'idle', true, 0);
  // حالت و سرعت واقعی گیم‌پلی: walk/run/jump/fall و grounded را از کنترلر خود بدهید.
});

function disposeAvatar() {
  scene.onBeforeRenderObservable.remove(observer);
  avatar.dispose();
}
```

این مسیر فقط رندر است و کاربر را به اتاق وصل نمی‌کند. برای شبکهٔ سفارشی `LobbyClient` را یک بار بسازید، برای هر `player.avatar` یک instance بسازید و رویدادهای `welcome`، `player:join`، `player:leave`، `player:update` و `player:avatar` را مدیریت کنید. در welcome مجدد، بازیکنان حذف‌شده را هم از scene پاک کنید. این مسئولیت‌ها در `PlatformLobby` آماده انجام می‌شوند.

`avatar.rig`، `avatar.animationGroups`، `avatar.root` و `avatar.getChildMeshes()` برای ابزارهای اختصاصی قابل دسترسی‌اند. اگر استخوان‌ها را دستی animate می‌کنید، هم‌زمان `HumanoidAnimator` را روی همان rig اجرا نکنید. `AvatarFactory` خروجی Babylon می‌دهد؛ آن را مستقیم به scene موتور Three.js اضافه نکنید. پشتیبانی renderer دیگر نیاز به adapter جدا دارد.

## ۵. Draco و میزبانی فایل‌ها

SDK بارگذاری Draco را انجام می‌دهد. در حالت عادی `/vendor/draco` را از origin پلتفرم/والد، referrer، origin فایل مدل و سپس origin بازی جست‌وجو می‌کند؛ `window.__OYNA360_DEV__.platformWebUrl` نیز در صورت وجود استفاده می‌شود. فایل‌ها:

```text
draco_wasm_wrapper_gltf.js
draco_decoder_gltf.wasm
draco_decoder_gltf.js
```

در استقرارهایی که وب، API یا CDN روی origin جدا هستند، origin مدل لزوماً محل decoder نیست. در این حالت یک بار، **پیش از اولین create/preload**، مسیر رسمی decoder را مشخص کنید؛ منطق decode را دوباره ننویسید:

```ts
import { configureAvatarLoader } from '@oyna360/lobby-babylon';

configureAvatarLoader({
  dracoDecoderBaseUrl: 'https://oyna360.ir/vendor/draco',
});
// سپس همان PlatformLobby.create(...) یا AvatarFactory.createInstanceAsync(...)
```

این export در سورس فعلی اضافه شده است؛ برای مصرف خارج از monorepo، ابتدا نسخه‌ای از پکیج حاوی این تغییر باید منتشر و نصب شود. مسیر جایگزین در نسخه‌های قدیمی این است که فایل‌های decoder را در `/vendor/draco` روی origin بازی میزبانی کنید.

میزبان فایل باید CORS را برای درخواست بدون credential از origin بازی مجاز کند. وب پلتفرم برای `/vendor/draco` و assetهای آواتار این دسترسی را می‌دهد؛ اگر nginx/CDN فایل را مستقیم پاسخ می‌دهد، header آن هم باید تنظیم شود. HTML صفحهٔ 404 یا SPA fallback نباید به‌جای JS/WASM با وضعیت 200 برگردد. در CSP محدود، اتصال به میزبان asset و اجرای worker با `blob:` را طبق تنظیمات Babylon محیط خود مجاز کنید.

## ۶. تشخیص علت لود نشدن

1. `presetKind` و `customConfig.glbUrl` را بررسی کنید. آواتار procedural یا mock انتظار GLB ندارد؛ توکن سشن را در log ننویسید.
2. در Network، درخواست GLB، تکسچر لباس و فایل‌های decoder را بررسی کنید: پاسخ 200 با محتوای درست، CORS و HTTPS سازگار.
3. هشدارهای `[lobby-sdk] local Draco decoder missing`، `GLB avatar load failed` و `falling back to procedural` به معنی لود موفق مدل اصلی نیستند.
4. اگر مدل در localhost کار می‌کند ولی در iframe نمی‌آید، URL نسبی، CORS، CSP و چند نسخهٔ Babylon را بررسی کنید.
5. اگر لباس/اکسسوری حذف شده، مطمئن شوید payload را به `{ glbUrl }` خلاصه نکرده‌اید و `setSkin` ناخواسته ظاهر را جایگزین نکرده است.
6. پس از اصلاح فایل یا تنظیم decoder، صفحه را کامل reload کنید؛ تنظیم decoder در هر اجرای SDK یک بار انجام می‌شود.

## متن آماده برای تحویل به AI

> برای اتصال لابی و آواتار واقعی اوینا ابتدا PlatformSDK.init را انجام بده، کل payload را به PlatformLobby.create از @oyna360/lobby-babylon بده و roomId/wsUrl را از همان payload بگیر. آواتار محلی و remote، Draco، skeleton، لباس، کش و انیمیشن حرکت را SDK آماده مدیریت می‌کند. loader یا سوکت موازی، GLB هاردکد و آواتار mock اضافه نکن. برای لابی آماده از AvatarFactory یا SceneLoader مستقیم استفاده نکن. برای شخصی‌سازی، محدودیت‌های بخش ۳ این سند را رعایت کن؛ setBase و attach را معادل تعویض زندهٔ مدل و رندر attachment فرض نکن. در صحنهٔ اختصاصی Babylon از AvatarFactory.createInstanceAsync مطابق بخش ۴ استفاده کن. هنگام خروج destroy/dispose را انجام بده و fallback procedural را با موفقیت لود GLB اشتباه نگیر.

> ارتباطات را طبق [راهنمای تماس و متن](./09-communications.md) از سرویس مستقل بگیر: متن برای همان لابی، تماس پیش‌فرض برای گروه خصوصی دوستان، تماس همگانی فقط opt-in. میکروفون را خودکار روشن نکن و JWT حساب یا متن/صوت را در کانال دادهٔ بازی قرار نده.
