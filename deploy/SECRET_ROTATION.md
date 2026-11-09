# IlmIldizi — Production Secret Rotation Runbook (TASK 3 / SEC-ROT-001)

> **Holat (Status):** `BLOCKED` (Live production `.env` va VPS/provider konsollariga to'g'ridan-to'g'ri kirish talab etiladi — quyidagi runbook va komandalar production operator tomonidan bajarilishi uchun to'liq tayyorlandi).

---

## 1. Maxfiy Kalitlar Inventari (Secret Inventory)

| Kalit nomi | Qayerda ishlatiladi | Ta'sir doirasi (Rotation Impact) |
|---|---|---|
| `SECRET_KEY` | `backend/config/settings.py`, `SIMPLE_JWT` (`SIGNING_KEY`), `django.core.signing` | Barcha joriy JWT (`access` va `refresh`) tokenlar, Django admin sessiyalari, parol tiklash tokenlari va ota-ona to'lov havolalari (`parent_pay_link`) darhol bekor bo'ladi. Barcha foydalanuvchilar qayta login qiladi. |
| `TELEGRAM_BOT_TOKEN` | `backend/telegrambot/client.py`, `backend/accounts/utils.py` (`validate_telegram_init_data`) | @BotFather orqali yangilanganda eski token darhol o'chadi; webhook qayta o'rnatilishi (`set_webhook`) va Mini App `initData` HMAC tekshiruvi yangi tokenga o'tishi shart. |
| `TELEGRAM_WEBHOOK_SECRET` | `backend/telegrambot/views.py` (`X-Telegram-Bot-Api-Secret-Token`), `set_webhook` | Webhook autentifikatsiyasi. `.env` yangilangach, darhol `python manage.py set_webhook` ishga tushirilishi kerak, aks holda Telegram POST so'rovlari `403 Forbidden` oladi. |
| `GROQ_API_KEY` | `backend/core/ai_client.py`, `growth/ai_grader.py`, `tests_app/services/grading.py` | AI mentor, ochiq savol va esse baholash. Yangi kalit `.env` ga yozilib `web` konteyner restart qilingach, eski kalit Groq Console'dan o'chiriladi (zero-downtime). |
| `POSTGRES_PASSWORD` / `DATABASE_URL` | `docker-compose.yml` (`db` va `web`), `backend/config/settings.py` | Avval PostgreSQL ichida `ALTER ROLE` bajariladi, so'ng `.env` yangilanib `web` konteyner restart qilinadi. |

---

## 2. Kod va Infra Himoyasi Tekshiruvi

1. **`.gitignore`:** `.env`, `*.local`, `backups/`, `*.backup-*` git tomonidan bloklangan.
2. **`Dockerfile`:** Haqiqiy `.env` fayli Docker image ichiga `COPY` qilinmaydi (`collectstatic` faqat `SECRET_KEY=build-only DATABASE_URL=sqlite:///build-only.db` vaqtinchalik qiymati bilan bajariladi).
3. **`docker-compose.yml`:** `POSTGRES_PASSWORD` uchun default (`ilmildizi`) olib tashlangan (`${POSTGRES_PASSWORD:?...}`).
4. **`backend/config/settings.py`:** `DEBUG=False` bo'lganda bo'sh yoki default (`ilmildizi`, `postgres`, `password`, `changeme`, `admin`, `123456`) parol va `django-insecure` `SECRET_KEY` bilan server ishga tushishdan bosh tortadi (`ImproperlyConfigured`).

---

## 3. Bosqichma-Bosqich Rotation Tartibi (Production VPS)

> **Ogohlantirish:** Hech qachon yangi kalitlarni terminal tarixiga (`history`) yoki CI/CD loglariga ochiq (`echo $SECRET`) chiqarmang. Barcha o'zgarishlarni serverdagi `backend/.env` faylida (`chmod 600 backend/.env`) bajaring.

### 3.1. Yangi kriptografik kalitlarni generatsiya qilish (Serverda)

```bash
# 1. SECRET_KEY (50 bayt URL-safe random):
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(50))"

# 2. TELEGRAM_WEBHOOK_SECRET (64 hex belgi):
python3 -c "import secrets; print('TELEGRAM_WEBHOOK_SECRET=' + secrets.token_hex(32))"

# 3. POSTGRES_PASSWORD (32 bayt URL-safe random, ':' va '@' belgilarisiz):
python3 -c "import secrets, string; alphabet = string.ascii_letters + string.digits + '_-'; print('POSTGRES_PASSWORD=' + ''.join(secrets.choice(alphabet) for _ in range(40)))"
```

### 3.2. PostgreSQL parolini yangilash (`POSTGRES_PASSWORD` + `DATABASE_URL`)

1. `backend/.env` faylidan zaxira nusxa oling:
   ```bash
   cp backend/.env backend/.env.bak.$(date +%Y%m%d_%H%M%S)
   chmod 600 backend/.env.bak.*
   ```
2. PostgreSQL konteynerida foydalanuvchi parolini yangilang (parolni terminal logida qoldirmaslik uchun `psql` interaktiv yoki stdin orqali):
   ```bash
   docker compose exec db psql -U ilmildizi -d ilmildizi -c "\password ilmildizi"
   ```
3. `backend/.env` hamda root `.env` (agar mavjud bo'lsa) ichida `POSTGRES_PASSWORD` va `DATABASE_URL` qiymatlarini yangi parolga o'zgartiring.

### 3.3. Groq API Key (`GROQ_API_KEY`) rotation

1. [Groq Cloud Console](https://console.groq.com/keys) ichida yangi API key yarating.
2. `backend/.env` ichidagi `GROQ_API_KEY` qiymatini yangilang.
3. Yangi konteyner ishga tushgach, Groq Console'dan eski kalitni **Revoke / Delete** qiling.

### 3.4. Telegram Bot Token va Webhook Secret rotation

1. Telegram'da `@BotFather` -> `/mybots` -> botni tanlang -> **API Token** -> **Revoke current token**.
2. Yangi `TELEGRAM_BOT_TOKEN` va yangi generatsiya qilingan `TELEGRAM_WEBHOOK_SECRET` ni `backend/.env` ga yozing.

### 3.5. Django `SECRET_KEY` rotation va Xizmatlarni Qayta Ishga Tushirish

1. Yangi `SECRET_KEY` ni `backend/.env` ga yozing.
2. Konteynerlarni yangilangan `.env` bilan qayta ishga tushiring:
   ```bash
   docker compose up -d --force-recreate db redis web frontend
   ```
3. Telegram Webhook'ni yangi token va yangi `TELEGRAM_WEBHOOK_SECRET` bilan ro'yxatdan o'tkazing:
   ```bash
   docker compose exec web python manage.py set_webhook
   ```
4. Barcha eski refresh tokenlarni va sessiyalarni tozalang:
   ```bash
   docker compose exec web python manage.py flushexpiredtokens
   docker compose exec web python manage.py clearsessions
   ```

---

## 4. Rotation'dan Keyingi Tekshiruv (Post-Rotation Verification)

```bash
# 1. Healthcheck (DB + Redis ulanishi):
curl -fsS https://ilmildizi.uz/healthz

# 2. Telegram Webhook holatini tekshirish (pending_update_count va last_error_message bo'sh bo'lishi kerak):
docker compose exec web python -c "from telegrambot.client import api_call; info = api_call('getWebhookInfo'); print({'ok': info.get('ok'), 'has_url': bool((info.get('result') or {}).get('url')), 'pending': (info.get('result') or {}).get('pending_update_count')})"

# 3. Eski JWT token rad etilishini tekshirish (401 Unauthorized qaytishi shart):
curl -i -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <OLD_TOKEN>" https://ilmildizi.uz/api/auth/me/
```
