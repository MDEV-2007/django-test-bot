# Deploy checklist — `fix/ilmildizi-stabilization`

Bu branch backend API kontraktini o'zgartiradi (javob kalitlari GET'dan olib tashlangan, yangi
`/answer/` endpointlari, lid uchun `consent` + `guardian_confirmed`, `/study/start/`, header bilan
fayl yuklash). Shuning uchun **`web` va `frontend` faqat birga** deploy qilinadi.

## 0. Oldindan (deploy kunidan oldin)

- [ ] `main`ga merge qilish uchun ruxsat olingan (PR review).
- [ ] Testlar PostgreSQL'da yurgan (lokalda Docker bilan):
  ```bash
  docker run -d --name ilm-pg -e POSTGRES_PASSWORD=pg -e POSTGRES_DB=ilm -p 55432:5432 postgres:16
  cd backend && DATABASE_URL=postgres://postgres:pg@localhost:55432/ilm REDIS_URL= \
    python manage.py test tests --parallel 1
  ```
  `tests/test_concurrency_postgres.py` faqat PostgreSQL'da ishlaydi (haqiqiy parallel so'rovlar).
- [ ] Qo'lda tekshiruv (staging yoki lokal): Sprint, Blitz, Avtopilot (Loop) to'liq sikl,
  fokus sessiyasi (5+ daqiqa), flashcards, lid yuborish (rozilik + 18+), admin: to'lov cheki,
  o'qituvchini tasdiqlash, post shikoyati / yashirish.

## 1. Zaxira (majburiy)

```bash
/opt/ilmildizi/deploy/scripts/backup.sh
ls -lh /opt/ilmildizi-backups | tail -3   # yangi db-*.dump va media-* borligini tekshiring
```

## 2. Deploy (serverda)

Serverda `deploy/docker/nginx.conf` qo'lda o'zgartirilgan — `git pull`dan oldin stash qiling.

```bash
cd /opt/ilmildizi && \
git stash && git pull origin main && git stash pop && \
docker compose up -d --build --no-deps web frontend && \
docker compose up -d --force-recreate --no-deps nginx
```

- `web` konteyneri ishga tushganda migratsiyalarni o'zi qo'llaydi (alohida `migrate` kerak emas).
- `deploy/docker/app_routes.inc` o'zgargan (`/media/classroom/receipts/` yopildi). U bitta faylli
  bind-mount, shuning uchun `nginx -s reload` yetmaydi — nginx konteyneri qayta yaratiladi (yuqorida).

## 3. Migratsiyalar (hammasi qo'shuvchi; ma'lumot o'chirmaydi)

| Migratsiya | Nima qiladi |
|---|---|
| `sprint.0002_quiz_session` | `QuizSession`, `QuizSessionAnswer` jadvallari |
| `sprint.0003_quiz_session_loop_modes` | mode tanlovlari (faqat choices) |
| `learning_loop.0002_loop_quiz_sessions` | `sprint_session`, `arena_session` (nullable FK) |
| `learning_loop.0003_reset_inflight_sprints` | Deploy paytida sprint o'rtasida turgan sikllarni 1-bosqichga qaytaradi (mukofot yo'qolmaydi) |
| `b2b_ads.0004_campaign_lifecycle_tracking_consent` | `clicks_count`, `starts_at`, `ends_at`, `max_leads`, `consent_at` |
| `b2b_ads.0005_lead_guardian_confirmed` | `guardian_confirmed` |
| `teacher.0003_teacher_verification` | `is_verified`, `verified_at`; **mavjud o'qituvchilar tasdiqlangan deb belgilanadi** |
| `learning.0017_post_moderation` | `CommunityPost.is_hidden`, `CommunityPostReport` |

## 4. Deploydan keyingi tekshiruv (5–10 daqiqa)

```bash
docker compose ps
docker compose logs --tail=100 web | grep -iE "error|traceback" || echo "web: xato yo'q"
curl -fsS https://ilmildizi.uz/api/health/
curl -s -o /dev/null -w "%{http_code}\n" https://ilmildizi.uz/media/classroom/receipts/x.png   # 404 kutiladi
```

Brauzerda: kirish → Sinovlar → Sprint (javob bering, to'g'ri variant javobdan keyin chiqadi) →
Avtopilot → Profil (radar) → Hamjamiyat (lenta, "Ko'proq ko'rsatish") → Super Admin: Audit jurnali.

## 5. Orqaga qaytarish (rollback)

1. Kodni oldingi commitga qaytaring (`git checkout <oldingi-main-commit>`), keyin:
   ```bash
   docker compose run --rm web python manage.py migrate learning 0016
   docker compose run --rm web python manage.py migrate teacher 0002
   docker compose run --rm web python manage.py migrate b2b_ads 0003
   docker compose run --rm web python manage.py migrate learning_loop 0001
   docker compose run --rm web python manage.py migrate sprint 0001
   ```
   Migratsiyalarni **eski kodni ishga tushirishdan oldin**, yangi kod konteynerida orqaga qaytaring
   (yangi migratsiya fayllari faqat yangi kodda bor).
2. `docker compose up -d --build --no-deps web frontend && docker compose up -d --force-recreate --no-deps nginx`
3. Muammo ma'lumotda bo'lsa — 1-bosqichdagi zaxiradan `pg_restore`.

## 6. Bilish kerak bo'lgan xatti-harakat o'zgarishlari

- Sprint / Blitz / Avtopilot: javob kaliti endi faqat javobdan keyin; eski (keshdagi) klient ishlamaydi.
- Ijtimoiy postlardan XP kuniga 3 marta; Sprint XP bermaydi (avval ham bermasdi, faqat UI ko'rsatardi).
- Flashcard mukofoti endi haqiqatan beriladi (endpoint avval 405 qaytarardi).
- Yangi o'z-o'ziga ro'yxatdan o'tgan o'qituvchi Super Admin tasdiqlaguncha nashr / "hammaga xabar" qila olmaydi.
- To'lov tarixi bor foydalanuvchini o'chirib bo'lmaydi — bloklang.
- Lid yuborish uchun "18+ yoki ota-ona roziligi" belgisi majburiy.
- 5 ta turli foydalanuvchi shikoyat qilgan post lentadan yashiriladi (Super Admin → Hamjamiyat → Shikoyatlar).
