# امکانات — آواتار، چت، voice، data

## آواتار

**مرجع کامل: [لود آواتار، شخصی‌سازی، صحنهٔ اختصاصی و راهنمای AI](./08-avatars.md).**

از `platformInit.avatar` ساخته می‌شود (procedural یا GLB).

- رنگ / لباس / اکسسوری از `customConfig`
- `avatarBases` برای پیش‌بارگذاری چند بدنهٔ GLB مشترک
- انیمیشن راه رفتن / دویدن / پرش داخل SDK
- سفارشی‌سازی runtime: `lobby.avatar.setSkin` / `addAccessory` / … (Core) — بعد از اتصال sync می‌شود

برای تغییر جزئی از `patchSkin` استفاده کنید؛ `setSkin` کل skin قبلی را جایگزین می‌کند. `setBase` فعلاً مدل محلی را زنده عوض نمی‌کند و attachmentهای دلخواه Core خودکار رندر نمی‌شوند.

بازی معمولاً لازم نیست `AvatarFactory` را مستقیم صدا بزند مگر ابزار سفارشی بسازید.

URL تکسچر و GLB باید از پلتفرم **مطلق** باشند تا از origin بازی cross-origin لود شوند (CORS روی `/uploads` سمت پلتفرم فعال است).

---

## چت

از نسخهٔ `0.3.0` در iframe اوینا، [متن و تماس زنده](./09-communications.md) از سرویس مستقل communications استفاده می‌کنند. بخش «زنده، بدون ذخیره» پایین برای مسیر قدیمی `communications: false` است؛ متن مسیر جدید در اتاق ارتباطات همان لابی ذخیره می‌شود.

- زنده، بدون ذخیره دائمی
- `enableChat: false` برای خاموش کردن UI پیش‌فرض
- `sendChat(text)` / رویداد `chat`

برای فریم‌های کنترلی بازی (مثلاً matchmaking) از چت استفاده نکنید → کانال data.

---

## Voice

پیش‌فرض جدید تماس گروه خصوصی دوستان است؛ تماس با کل لابی به opt-in صریح نیاز دارد. [جزئیات و TURN](./09-communications.md). توضیحات peer نزدیک پایین مربوط به مسیر قدیمی‌اند.

- با `enableVoice` (پیش‌فرض روشن وقتی مالتی‌پلیر باشد)
- محدودیت تعداد peer نزدیک روی سرور تنظیم می‌شود
- نیاز به مجوز میکروفون مرورگر

---

## کانال `lobby:data`

پیام‌های باینری/متنی کوتاه برای منطق بازی، جدا از چت.

```ts
lobby.sendData('fc.pad-room', frameString);

lobby.on('data', ({ channel, payload, fromUserId }) => {
  if (channel === 'fc.pad-room') handleFrame(payload);
});
```

محدودیت اندازه و نرخ از سمت سرور اعمال می‌شود. چت را sanitize نکنید روی data — فرمت خودتان را validate کنید.

---

## Presence / اتصال

UIهای آماده برای ورود بازیکن و قطع شبکه را می‌توان با فلگ‌های config خاموش کرد و UI خودتان را گذاشت.

بعدی: [06-controls.md](./06-controls.md)
