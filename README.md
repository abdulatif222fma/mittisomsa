# MittiSomsa — Netlify sayti va Telegram admin bot

Loyiha mobil ekranga mos, oddiy HTML/CSS/JS va Netlify Functions asosida ishlaydi. Katalog Netlify Blobs’da saqlanadi. Telegram admin bot mahsulotlarni qo‘shadi/o‘chiradi, buyurtmalar ikkala admin chatiga yuboriladi.

## 1. Netlify’ga joylash

1. Ushbu papkadagi fayllarni GitHub repository’ga yuklang.
2. Netlify’da **Add new site → Import an existing project** orqali repository’ni ulang.
3. Build command: bo‘sh qoldiring. Publish directory: `.`. `netlify.toml` funksiyalar yo‘lini belgilaydi.
4. Netlify → Site configuration → Environment variables bo‘limida quyidagilarni kiriting:
   - `TELEGRAM_BOT_TOKEN` — BotFather bergan token.
   - `ADMIN_IDS` — ikkita adminning Telegram raqami emas, **Telegram user ID** raqamlari; vergul bilan: `123456789,987654321`
5. O‘zgaruvchilarni saqlagach, saytda **Deploys → Trigger deploy → Clear cache and deploy site** qiling.

## 2. Telegram botni ulash

1. BotFather’da bot yarating va tokenini oling. Tokenni hech qayerda ochiq e’lon qilmang.
2. Har ikkala administrator botni Telegram’da ochib `/start` yuborsin.
3. Har ikkala adminning Telegram **user ID** raqamini aniqlang (masalan, ishonchli ID bot orqali) va Netlify’dagi `ADMIN_IDS` ga yozing. Botga oddiy foydalanuvchilar admin bo‘la olmaydi.
4. Deploy tugagach, brauzerda quyidagi manzilni ochib, `TOKEN` o‘rniga BotFather’dan olingan YANGI bot tokenini qo‘yib webhook o‘rnating:
   `https://api.telegram.org/botTOKEN/setWebhook?url=https://SIZNING-SAYTINGIZ.netlify.app/.netlify/functions/bot`
5. Javobda `"ok":true` chiqishi kerak. Keyin botga `/start` yuboring.

## 3. Mahsulot qo‘shish va o‘chirish

Botga oddiy **Photo** sifatida rasm yuboring va caption’ni quyidagicha yozing:

`Go‘shtli somsa | 1 dona | 8000`

Yoki:

`Oilaviy somsa seti | 6 dona | 45000`

Tartib: **mahsulot nomi | seti/miqdori | narxi**. Narx raqam bo‘lsin. Rasm 1.5 MB dan kichik bo‘lishi kerak. `/catalog` katalogni ko‘rsatadi, har bir mahsulot ostidagi tugma orqali o‘chirish mumkin. `/addadmin TELEGRAM_ID` yangi admin qo‘shadi, `/removeadmin TELEGRAM_ID` adminni olib tashlaydi, `/admins` ro‘yxatni ko‘rsatadi. Har bir admin boshqa adminlarni boshqarishi mumkin. Yangi admin botga o‘zi `/start` yuborishi kerak.

## 4. Hisobotlar

- `/kunlik` — Toshkent vaqti bo‘yicha bugungi buyurtmalar soni va jami savdo.
- `/oylik` — joriy oy buyurtmalari soni va jami savdo.

Hisobotlar buyurtma qiymatini jamlaydi; haqiqiy foyda yoki to‘lov muvaffaqiyatini anglatmaydi.

## 5. Buyurtma va xarita

Mijoz ma’lumotlarini kiritib, xaritadan joy tanlashi mumkin. Joy tanlanganda koordinatalar manzilga qo‘shiladi va Telegram’ga xarita nuqtasi ham yuboriladi. Sayt buyurtmani yuborishdan oldin adminlar konfiguratsiyasi ishlayotganini tekshiradi.

## Muhim eslatmalar

- Birinchi marta katalog bo‘sh bo‘ladi; admin botdan mahsulot qo‘shing.
- Saytni Netlify’da deploy qilish va environment variables/webhook’ni sozlash talab qilinadi. Bu ishlar bajarilmaguncha Telegram buyurtma jo‘natish ishlamaydi.
- Ushbu loyiha to‘lovni avtomatik yechmaydi. “Karta orqali” hozircha mijoz tanlagan to‘lov usuli sifatida adminga yuboriladi; haqiqiy onlayn to‘lov uchun alohida to‘lov provayderi integratsiyasi kerak.
- Xarita OpenStreetMap’ning ommaviy tile xizmatidan foydalanadi; katta trafikda alohida tile provayderi kerak bo‘lishi mumkin.
- Telegram bot tokenini front-end kodga joylamang. Token faqat Netlify environment variables’da saqlanishi kerak.
