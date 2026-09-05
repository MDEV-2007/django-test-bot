# Contabo VPS'ga Docker bilan deploy

Noldan boshlab: bo'sh Ubuntu serveridan to ishlayotgan sayt va Telegram botigacha.
Har bir buyruq nusxa-joylashtiriladigan. `ilmildizi.uz` ni o'z domeningizga almashtiring.

Nima ko'tariladi:

| Konteyner | Vazifasi | Port |
|---|---|---|
| `nginx` | yagona kirish nuqtasi, TLS, marshrutlash | 80, 443 |
| `frontend` | Next.js (sayt va Telegram Mini App) | ichki 3000 |
| `web` | Django + Channels (API, admin, bot webhook) | ichki 8000 |
| `db` | PostgreSQL 16 | ichki 5432 |
| `redis` | kesh, sessiya, Arena WebSocket guruhlari | ichki 6379 |

Tashqariga faqat nginx chiqadi. Telegram bot alohida konteyner emas — u **webhook**, ya'ni
Telegram xabarlarni to'g'ridan-to'g'ri `web` konteyneriga yuboradi.

---

## 0. Kerak bo'ladigan narsalar

- Contabo VPS, Ubuntu 22.04 yoki 24.04, kamida **4 GB RAM** (frontend build shuncha talab qiladi)
- Domen va uning A-yozuvi VPS IP manziliga qaratilgan
- BotFather'dan bot tokeni

Domen tayyorligini tekshiring (natija VPS IP'ingiz bo'lishi kerak):

```bash
dig +short ilmildizi.uz
```

Agar bo'sh chiqsa — DNS hali tarqalmagan, kutish kerak. **Bunga ishonch hosil qilmasdan
davom etmang**: sertifikat olish aynan shu tekshiruvga tayanadi.

---

## 1. Serverga kirish va tizimni yangilash

```bash
ssh root@VPS_IP
```

```bash
apt update && apt upgrade -y
```

## 2. Docker o'rnatish

```bash
curl -fsSL https://get.docker.com | sh
```

Tekshirish:

```bash
docker --version && docker compose version
```

## 3. Firewall

```bash
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

Postgres va Redis portlari ochilmaydi — ular faqat Docker tarmog'i ichida ko'rinadi.

## 4. Loyihani ko'chirish

```bash
apt install -y git && git clone https://github.com/MDEV-2007/django-test-bot.git /opt/ilmildizi && cd /opt/ilmildizi
```

## 5. Sozlamalar fayli

```bash
cp backend/.env.example backend/.env && nano backend/.env
```

Quyidagilarni to'ldiring:

```ini
DEBUG=False
SECRET_KEY=<pastdagi buyruq bilan yarating>

TELEGRAM_BOT_TOKEN=<BotFather bergan token>
TELEGRAM_BOT_USERNAME=ilmildiziuz_bot
TELEGRAM_WEBHOOK_SECRET=<pastdagi buyruq bilan yarating>

FRONTEND_URL=https://ilmildizi.uz
WEBAPP_URL=https://ilmildizi.uz
EXTRA_ALLOWED_HOSTS=ilmildizi.uz,www.ilmildizi.uz
FRONTEND_ORIGINS=https://ilmildizi.uz

GROQ_API_KEY=<AI mentor uchun; bo'sh qolsa qoidaga asoslangan javoblar ishlaydi>
```

Ikkita tasodifiy kalit yarating (natijani yuqoridagi joylarga qo'ying):

```bash
docker run --rm python:3.12-slim python -c "import secrets;print('SECRET_KEY=' + secrets.token_urlsafe(50));print('TELEGRAM_WEBHOOK_SECRET=' + secrets.token_urlsafe(32))"
```

> **Bu faylga izoh yozmang.** Unda faqat `KALIT=qiymat` qatorlari bo'lsin.

> `TELEGRAM_WEBHOOK_SECRET` ni o'zingiz o'ylab topmang va `openssl rand -base64` bilan
> ham yaratmang: Telegram sirda faqat `A-Z a-z 0-9 _ -` ni qabul qiladi, base64 esa
> `+ / =` chiqaradi va `setWebhook` "secret token contains unallowed characters"
> deb rad etadi. Xavfsiz yo'l: `openssl rand -hex 32`.

Baza paroli uchun alohida fayl (compose o'qiydi):

```bash
printf 'POSTGRES_USER=ilmildizi\nPOSTGRES_PASSWORD=%s\nPOSTGRES_DB=ilmildizi\nSERVER_NAME=ilmildizi.uz www.ilmildizi.uz\nCERT_NAME=ilmildizi.uz\n' "$(openssl rand -hex 24)" > .env
```

> `SERVER_NAME` — nginx javob beradigan domenlar (bir nechta bo'lsa, bo'sh joy bilan).
> `CERT_NAME` — sertifikat papkasi nomi, ya'ni certbot'ga bergan **birinchi** `-d`
> qiymati. Ular bir xil emas: www qo'shilganda bitta o'zgaruvchi bilan nginx
> "live/ilmildizi.uz www.ilmildizi.uz/fullchain.pem" ni qidirib, ishga tushmay qoladi.

## 6. Birinchi ishga tushirish (HTTP)

```bash
docker compose up -d --build
```

Birinchi qurilish 5–10 daqiqa oladi. Holatni ko'rish:

```bash
docker compose ps
```

Beshta konteyner ham `running` bo'lishi kerak. Sayt ochilishini tekshiring:

```bash
curl -I http://ilmildizi.uz
```

Bosh sahifa uchun `HTTP/1.1 200 OK` kelishi kerak. Kelmasa — 12-bo'limga qarang.

> `curl -I http://ilmildizi.uz/api/auth/config/` esa **301** qaytaradi va bu to'g'ri:
> `DEBUG=False` da Django barcha so'rovlarni HTTPS'ga yo'naltiradi. Sertifikat
> o'rnatilgandan keyin (7-bo'lim) u 200 bo'ladi.

## 7. HTTPS sertifikati

```bash
docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d ilmildizi.uz -d www.ilmildizi.uz --agree-tos -m siz@pochta.uz --no-eff-email
```

Muvaffaqiyatli bo'lsa, nginx sozlamasida HTTPS blokini yoqing:

```bash
nano deploy/docker/nginx.conf
```

- `# return 301 https://$host$request_uri;` qatoridan `#` ni oling
- Fayl oxiridagi `server { listen 443 ... }` blokidan har bir qator boshidagi `# ` ni oling

Keyin:

```bash
docker compose up -d --force-recreate nginx && curl -I https://ilmildizi.uz
```

> `restart` emas, aynan `--force-recreate`: nginx obrazi `${SERVER_NAME}` ni konteyner
> yaratilgan paytdagi muhit bilan almashtiradi. `.env` dagi domenni o'zgartirib `restart`
> qilsangiz, eski domen qoladi va nginx yo'q sertifikatni qidirib ishga tushmaydi
> (`cannot load certificate ... No such file`).

Tekshirish ro'yxati (hammasi 200 bo'lishi kerak):

```bash
for p in / /login /api/auth/config/ /static/admin/css/base.css; do echo "$p -> $(curl -s -o /dev/null -w %{http_code} https://ilmildizi.uz$p)"; done
```

## 8. Telegram botni ulash

```bash
docker compose exec web python manage.py setup_telegram
```

Bu buyruq webhook, menyu tugmasi va buyruqlar ro'yxatini birdaniga o'rnatadi.
Tekshirish:

```bash
docker compose exec web python manage.py setup_telegram --status
```

`So'nggi xato: (yo'q)` bo'lishi kerak. Endi botga `/start` yozing.

## 9. Admin foydalanuvchi va boshlang'ich ma'lumot

```bash
docker compose exec web python manage.py createsuperuser
```

Do'kon mahsulotlarini yaratish (avatar, ramka, unvon, mavzu, Streak Freeze):

```bash
docker compose exec web python manage.py seed_shop
```

Admin panel: `https://ilmildizi.uz/admin/`

## 10. Sertifikatni avtomatik yangilash

Let's Encrypt sertifikati 90 kun amal qiladi. Oyiga bir marta yangilash uchun:

```bash
crontab -e
```

Oxiriga qo'shing:

```cron
0 3 1 * * cd /opt/ilmildizi && docker compose run --rm certbot renew --quiet && docker compose exec -T nginx nginx -s reload
```

## 10.5. Domenni almashtirish (duckdns'dan o'z domeningizga)

Tartib muhim: DNS -> sertifikat -> sozlamalar -> bot.

**1)** Registratorda (ahost va h.k.) ikkita A-yozuv yarating — `@` va `www`, ikkalasi ham
VPS IP'ingizga. Tarqalishini kuting:

```bash
dig +short ilmildizi.uz www.ilmildizi.uz
```

Ikkala qatorda VPS IP chiqmaguncha davom etmang.

**2)** Yangi domenga sertifikat oling. Eski domen ishlab tursa ham bo'ladi — certbot
faqat 80-portdagi `/.well-known/acme-challenge/` yo'lini talab qiladi:

```bash
docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d ilmildizi.uz -d www.ilmildizi.uz --agree-tos -m siz@pochta.uz --no-eff-email
```

**3)** `.env` (`SERVER_NAME`, `CERT_NAME`) va `backend/.env` (`FRONTEND_URL`,
`WEBAPP_URL`, `EXTRA_ALLOWED_HOSTS`, `FRONTEND_ORIGINS`) dagi domenni yangilang, so'ng:

```bash
docker compose up -d --force-recreate nginx web
```

**4)** Botni yangi manzilga qayting — webhook ham, Mini App tugmasi ham shu buyruqda
yangilanadi:

```bash
docker compose exec web python manage.py setup_telegram
```

Eski domen bir muddat ishlab tursin desangiz, uni `SERVER_NAME` ro'yxatida va
`EXTRA_ALLOWED_HOSTS` da qoldiring.


## 10.1. CEFR testlarini yuklash

Ingliz tili fani va A1-C2 darajalari bir marta yaratiladi:

```bash
docker compose exec web python manage.py seed_english_cefr
```

Mock testlar JSON'dan yuklanadi (idempotent — bir xil sarlavha qayta yuklansa,
eski partlar almashtiriladi):

```bash
docker compose exec web python manage.py import_cefr_json tests_app/fixtures/cefr/reading_mock_19.json --publish
docker compose exec web python manage.py import_cefr_json tests_app/fixtures/cefr/writing_mock_1.json --publish
```

Listening uchun audio kerak. Fayllarni konteynerga nusxalang va `--audio-dir` bilan
ko'rsating; `--dry-run` esa bazaga tegmasdan faqat tekshiradi:

```bash
docker compose cp ./audio web:/tmp/audio
docker compose exec web python manage.py import_cefr_json tests_app/fixtures/cefr/listening_mock_16.json --audio-dir /tmp/audio --dry-run
```


## 11. Kundalik ishlar

Yangi versiyani chiqarish:

```bash
cd /opt/ilmildizi && git stash && git pull && git stash pop && docker compose up -d --build
```

`git stash` shart: `deploy/docker/nginx.conf` serverda joyida tahrirlangan (443 bloki
shu yerda ochilgan, repozitoriyada esa izohda turadi), shuning uchun oddiy `git pull`
"local changes would be overwritten" deb to'xtaydi. Agar `stash pop` to'qnashuv bersa,
faylni qo'lda birlashtiring va `git stash drop` bilan yakunlang.

Konteynerlar sog'ligini tekshirish (`healthy` bo'lishi kerak):

```bash
docker compose ps
```

`backend/.env` yoki root `.env` tahrirlangan bo'lsa, `restart` yetmaydi — konteyner
yaratilgandagi muhitni saqlab qoladi:

```bash
docker compose up -d --force-recreate web
```

Loglar:

```bash
docker compose logs -f web        # backend va bot
docker compose logs -f frontend   # Next.js
docker compose logs -f nginx      # kirish so'rovlari
```

Baza zaxirasi (kuniga bir marta cron'ga qo'ying):

```bash
docker compose exec -T db pg_dump -U ilmildizi ilmildizi | gzip > /root/ilmildizi-$(date +%F).sql.gz
```

Zaxiradan tiklash:

```bash
gunzip -c /root/ilmildizi-2026-08-23.sql.gz | docker compose exec -T db psql -U ilmildizi ilmildizi
```

---

## 12. Ishlamasa — nimadan boshlash

**nginx `Restarting` holatida, sayt umuman ochilmaydi**

Logga qarang:

```bash
docker compose logs --tail=20 nginx | grep emerg
```

`cannot load certificate ".../live/<boshqa-domen>/fullchain.pem"` chiqsa — nginx eski
domenni ko'ryapti. `.env` dagi `SERVER_NAME` konteynerga faqat u yaratilganda beriladi:

```bash
docker compose exec nginx printenv SERVER_NAME   # haqiqatda nimani ko'ryapti
docker compose up -d --force-recreate nginx      # yangi qiymat bilan qayta yaratish
```

**Sayt ochilmayapti (`curl` javob bermaydi)**

```bash
docker compose ps
docker compose logs --tail=50 nginx
```

`Exit` holatidagi konteyner bo'lsa — o'shaning logini o'qing.

**502 Bad Gateway** — nginx tirik, lekin orqadagi xizmat emas:

```bash
docker compose logs --tail=80 web
docker compose logs --tail=80 frontend
```

Eng ko'p uchraydigani: `backend/.env` da `DEBUG=False` bo'lgani holda `SECRET_KEY`
to'ldirilmagan, yoki `EXTRA_ALLOWED_HOSTS` da domen yo'q (`DisallowedHost` xatosi).

**Sayt ochiladi, lekin API 400/403 beradi** — domen `EXTRA_ALLOWED_HOSTS` ro'yxatida
yo'q. Qo'shing va qayta ishga tushiring:

```bash
nano backend/.env && docker compose up -d --force-recreate web
```

> Bu yerda ham `restart` yaramaydi: `env_file` faqat konteyner yaratilganda o'qiladi.

**Bot javob bermayapti**

```bash
docker compose exec web python manage.py setup_telegram --status
```

- `Webhook: (yo'q)` → `setup_telegram` ni ishlating
- `So'nggi xato: ...404` yoki `...Connection refused` → domen yoki sertifikat noto'g'ri
- Hammasi joyida, lekin jim → `docker compose logs --tail=100 web` da
  `Telegram API sendMessage failed` qatorini qidiring

**Mini App oq ekran** — Telegram webview eski nusxani keshlaydi. Ilovani butunlay
yopib qayta oching.

**Frontend build "killed" bo'lyapti** — RAM yetmayapti. Vaqtincha swap qo'shing:

```bash
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
```

**Sertifikat olinmayapti** — 80-port band yoki DNS hali tarqalmagan:

```bash
dig +short ilmildizi.uz && curl -I http://ilmildizi.uz/.well-known/acme-challenge/test
```

---

## Nima qayerda

| Yo'l | Nima |
|---|---|
| `docker-compose.yml` | barcha xizmatlar |
| `Dockerfile` | backend obrazi (Django + daphne) |
| `frontend/Dockerfile` | frontend obrazi (Next.js standalone) |
| `deploy/docker/nginx.conf` | server bloklari, TLS |
| `deploy/docker/app_routes.inc` | marshrutlar (HTTP va HTTPS uchun umumiy) |
| `backend/.env` | maxfiy sozlamalar — **git'ga tushmaydi** |
| `.env` | baza paroli va domen (compose uchun) |

To'xtatish va qayta ishga tushirish:

```bash
docker compose stop      # to'xtatadi, ma'lumot saqlanadi
docker compose up -d     # qaytadan ko'taradi
```

Ma'lumotlar Docker volume'larida saqlanadi (`pgdata`, `media`, `redisdata`) —
`docker compose down` ularni o'chirmaydi. **`docker compose down -v` esa o'chiradi.**
