# VPS'ga to'liq ko'chirish qo'llanmasi (Ubuntu, masalan Contabo Cloud VPS)

Bu fayl avvalgi "7 ta majburiy narsa" ro'yxatining barchasini qamrab oladi:
PostgreSQL, Nginx, SSL, Domen, systemd, Firewall, Backup.

Har bir qadam **aniq nusxa-joylashtiriladigan buyruq** bilan berilgan. `YOUR_DOMAIN`,
`VPS_IP` kabi joylarni o'zingiznikiga almashtiring.

---

## 0. Boshlashdan oldin kerak bo'ladigan narsalar

- VPS'ning IP manzili va root parol/SSH kaliti (Contabo email orqali yuboradi)
- Bir domen nomi (masalan `ilmildizi.uz`) — **buni sotib olish va DNS'da VPS IP'siga
  ko'rsatish (A record) sizning tomoningizda**, men buni siz uchun qila olmayman
- Butun bu loyihaning GitHub repo manzili: `https://github.com/MDEV-2007/django-test-bot`

---

## 1. Serverga birinchi kirish va asosiy sozlash

```bash
ssh root@VPS_IP

# Tizimni yangilash
apt update && apt upgrade -y

# Ilova uchun alohida, root bo'lmagan foydalanuvchi (xavfsizlik uchun — ilova root
# huquqi bilan ishlamasligi kerak)
adduser --disabled-password --gecos "" ilmildizi
usermod -aG sudo ilmildizi
```

## 2. Firewall (7-band)

```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable   # "y" deb tasdiqlang
ufw status
```
Shu bilan faqat SSH (22), HTTP (80) va HTTPS (443) portlari ochiq qoladi — boshqa
hamma narsa (jumladan daphne'ning 8000-porti) tashqaridan yopiq.

## 3. PostgreSQL (1-band)

```bash
apt install -y postgresql postgresql-contrib python3-venv git nginx

sudo -u postgres psql -c "CREATE DATABASE ilmildizi;"
sudo -u postgres psql -c "CREATE USER ilmildizi_db WITH PASSWORD 'MUSTAHKAM_PAROL_BUNI_ALISHTIRING';"
sudo -u postgres psql -c "ALTER ROLE ilmildizi_db SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ilmildizi TO ilmildizi_db;"
```
Keyinroq `.env`da ishlatiladigan `DATABASE_URL`:
```
postgres://ilmildizi_db:MUSTAHKAM_PAROL_BUNI_ALISHTIRING@localhost:5432/ilmildizi
```

## 4. Redis (majburiy)

Redis endi ixtiyoriy emas: `DEBUG=False` bo'lganda `REDIS_URL` o'rnatilmasa, ilova
ishga tushmaydi (`config/settings.py` shuni tekshiradi). Sabab — Redis'siz har bir daphne
process o'zining alohida xotira-ichi cache va channel layer'iga ega bo'ladi: bir nechta
process ishga tushirilganda (6-bandga qarang) cache'lar process'lar orasida mos kelmay
qoladi, va Battle Arena raqib qidiruvi process'lar orasida ishlamay qoladi (ikkita
o'yinchi turli process'ga tushib qolsa, bir-birini topa olmaydi).

```bash
apt install -y redis-server
systemctl enable --now redis-server
```
`.env`da: `REDIS_URL=redis://127.0.0.1:6379/1`

## 5. Loyihani yuklab olish va sozlash

```bash
su - ilmildizi
git clone https://github.com/MDEV-2007/django-test-bot.git /srv/ilmildizi
# Eslatma: /srv/ilmildizi'ga yozish uchun avval sudo bilan papka egasini bering:
#   sudo mkdir -p /srv/ilmildizi && sudo chown ilmildizi:ilmildizi /srv/ilmildizi

cd /srv/ilmildizi
python3 -m venv venv
source venv/bin/activate
pip install -r requirements/prod.txt

cp .env.example .env
nano .env   # pastdagi qiymatlarni to'ldiring
```

`.env`da to'ldirilishi shart bo'lganlar:
```
DEBUG=False
SECRET_KEY=<python -c "import secrets;print(secrets.token_urlsafe(50))" natijasi>
DATABASE_URL=postgres://ilmildizi_db:...@localhost:5432/ilmildizi
REDIS_URL=redis://127.0.0.1:6379/1
WEBAPP_URL=https://YOUR_DOMAIN/
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
TELEGRAM_WEBHOOK_SECRET=<python -c "import secrets;print(secrets.token_urlsafe(32))" natijasi>
GOOGLE_OAUTH_CLIENT_ID=...
```

```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
python manage.py seed_shop
deactivate
```

## 6. systemd — daphne (ko'p process), backup, streak reminder (5-band)

`ilmildizi@.service` — **template unit**: bitta daphne process bitta CPU yadrosinigina
band qiladi (u ichida worker pool yo'q), shuning uchun CPU yadrolar soniga qarab bir
nechta process ishga tushiramiz, Nginx ular orasida load-balance qiladi (7-bandga
qarang). Yadrolar sonini bilish uchun: `nproc`.

```bash
exit   # ilmildizi foydalanuvchisidan chiqib, sudo huquqli foydalanuvchiga qaytish

sudo cp /srv/ilmildizi/deploy/systemd/*.service /srv/ilmildizi/deploy/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload

# 3ta process (8001-8003) — deploy/nginx/ilmildizi.conf'dagi upstream porlariga mos
# bo'lishi kerak; ko'proq/kamroq CPU yadrosi bo'lsa, ikkalasini ham moslang.
sudo systemctl enable --now ilmildizi@8001 ilmildizi@8002 ilmildizi@8003
sudo systemctl enable --now ilmildizi-backup.timer
sudo systemctl enable --now ilmildizi-streak-reminder.timer

# Barchasi ishga tushganini tekshirish:
systemctl status ilmildizi@8001 ilmildizi@8002 ilmildizi@8003
systemctl list-timers ilmildizi-backup.timer ilmildizi-streak-reminder.timer
```

Vaqt zonasini ham sozlang (streak eslatmasi kechqurun 20:00'da kelishi uchun):
```bash
sudo timedatectl set-timezone Asia/Tashkent
```

## 7. Nginx + Domen + SSL (2, 3, 4-band)

```bash
sudo cp /srv/ilmildizi/deploy/nginx/ilmildizi.conf /etc/nginx/sites-available/ilmildizi
sudo nano /etc/nginx/sites-available/ilmildizi   # YOUR_DOMAIN'ni haqiqiy domeningizga almashtiring

sudo ln -s /etc/nginx/sites-available/ilmildizi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**Domen DNS'da VPS IP'ga ko'rsatilgandan keyingina** (bir necha daqiqadan bir necha
soatgacha vaqt olishi mumkin — `dig YOUR_DOMAIN` bilan tekshiring):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```
Certbot HTTPS server blokini va avtomatik yangilanishni o'zi qo'shadi. Tasdiqlash:
```bash
sudo certbot renew --dry-run
```

## 8. Telegram webhook va Google OAuth'ni yangi domenga ko'rsatish

```bash
cd /srv/ilmildizi && source venv/bin/activate
python manage.py set_webhook --url https://YOUR_DOMAIN
```

Google Cloud Console → Credentials → OAuth client → **Authorized JavaScript origins**'ga
`https://YOUR_DOMAIN`ni qo'shing (eski PythonAnywhere domeni bilan bir qatorda qoldirsa
ham bo'ladi, ikkalasi ham ishlaydi).

## 9. Yakuniy tekshiruv

- [ ] `https://YOUR_DOMAIN/accounts/login/` ochiladi, qulf belgisi (SSL) bor
- [ ] Botga Telegram'da `/start` — javob keladi
- [ ] `systemctl status ilmildizi@8001` (va 8002, 8003) — active (running)
- [ ] `systemctl start ilmildizi-backup.service` — qo'lda ishga tushirib, `/srv/ilmildizi/backups/`da fayl paydo bo'lishini tekshiring
- [ ] `ufw status` — faqat 22/80/443 ochiq

---

### Qayta deploy qilish (kodni yangilaganda)

```bash
su - ilmildizi
cd /srv/ilmildizi && source venv/bin/activate
git pull origin main
pip install -r requirements/prod.txt
python manage.py migrate
python manage.py collectstatic --noinput
deactivate
exit
sudo systemctl restart ilmildizi@8001 ilmildizi@8002 ilmildizi@8003
```
