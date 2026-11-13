# Production Deploy & Migration Readiness Report (`PROD-DEPLOY-001`)

**Hujjat sanasi:** 2026-11-07  
**Branch:** `fix/audit-remaining` (primary worktree: `django-test-bot-p0`)  
**Target Release Base:** `fce533d` + latest remediation commits  
**Holat:** `BLOCKED` (Production live VPS/SSH ruxsati xavfsizlik cheklovlari tufayli berilmagan; kod va barcha testlar to'liq `PASS`)

---

## 1. Tekshiruv Natijalari Xulosasi (Evidence Matrix)

| Tekshiruv elementi | Holat | Dalil / Test natijasi | Qaydlar / Operator harakati |
|---|---|---|---|
| **Expected Release SHA** | `PASS` | `fce533d` ustiga barcha 5 ta task bo'yicha o'zgarishlar qo'shilgan | Foydalanuvchi ruxsati bilan commit qilinadi |
| **Production running SHA** | `BLOCKED` | VPS/SSH ga ulanish taqiqlangan | SSH'siz tekshirish usuli quyida keltirilgan |
| **Django Migrations (`--check`)** | `PASS` | `makemigrations --check --dry-run` -> `No changes detected` | `accounts.0014_mfa_secret_encryption` to'liq tayyor |
| **Migration Dependency Graph** | `PASS` | `0014` to'g'ridan-to'g'ri `0013_adminmfadevice` ga bog'langan | Hech qanday cycle yoki uzilish yo'q |
| **Backend Test Suite** | `PASS` | 69 ta test muvaffaqiyatli o'tdi (1 ta opt-in Groq testi skipped) | MFA, Grading, Backup, Auth, Economy |
| **Frontend Typecheck** | `PASS` | `tsc --noEmit` -> 0 errors (ikkala worktree'da ham) | `django-test-bot-p0` va `django-test-bot` |
| **CI Workflow (`ci.yml`)** | `PASS` | PostgreSQL 16 + SQLite + pip-audit + npm audit + image hygiene | Barcha talab qilingan job'lar kiritilgan |
| **Backup Encryption & Fail-closed**| `PASS` | `test_production_backup_fails_closed_without_passphrase` -> `PASS` | Passphrase bo'lmasa backup to'xtaydi |
| **Isolated Test DB Restore** | `PASS` | `deploy/scripts/restore.sh` -> `ilmildizi_restore_test` ga tiklash | Production DB ga ruxsatsiz tegmaydi |
| **Container Healthcheck** | `PASS` | `/healthz` DB va Redis holatini tekshiradi (HTTP 200/503) | `docker-compose.yml` healthcheck bilan bog'langan |
| **Secret Leakage & Git Hygiene** | `PASS` | `.gitignore` yangilandi, `.dump*`, `.tgz*`, `.env` kiritilmagan | Git tree va build context'da maxfiy kalit yo'q |

---

## 2. Production Running SHA ni Aniqlash Tartibi (SSH'siz va SSH bilan)

Xavfsizlik qoidalariga binoan AI agent ishlab turgan VPS ga bevosita SSH orqali ulanmaydi. Operator quyidagi usullardan biri orqali production SHA'ni tekshirishi shart:

### 1-usul: Serverda SSH orqali (Operator bajaradi)
```bash
ssh root@SERVER_IP
cd /opt/ilmildizi
git rev-parse HEAD
# yoki Docker ichida:
docker compose exec web git rev-parse HEAD
```

### 2-usul: SSH'siz tekshirish usullari
1. **GitHub Actions Deployment Log:** Agar CI/CD avtomatik deploy qilsa, GitHub Actions -> `CI` yoki `Deploy` workflow'ning so'nggi muvaffaqiyatli run logidagi commit SHA ko'riladi.
2. **Konteyner versiyasi tekshiruvi:** Agar webhook yoki `/api/` orqali versiya qaytarilsa, operator o'sha endpoint javobini tekshiradi.

---

## 3. Yangi Migration Tafsilotlari (`accounts.0014_mfa_secret_encryption`)

- **Fayl:** `backend/accounts/migrations/0014_mfa_secret_encryption.py`
- **Bog'liqlik:** `('accounts', '0013_adminmfadevice')`
- **O'zgarishlar:**
  1. `key_version` maydoni qo'shildi (`CharField(max_length=32, default='v1')`).
  2. `last_verified_at` maydoni qo'shildi (`DateTimeField(null=True, blank=True)`).
  3. `secret` maydoni `max_length=255` ga kengaytirildi (`enc:v1:<kid>:<base64>` sig'ishi uchun).
  4. `RunPython(upgrade_legacy_mfa_secrets, migrations.RunPython.noop)`:
     - Bazadagi mavjud barcha yozuvlarni tekshiradi.
     - Agar yozuv shifrlanmagan (yoki eski signing-only formatda) bo'lsa, xavfsiz decrypt qilib, `enc:v1:` formatida AES-256-GCM bilan qayta shifrlaydi.
     - Birorta ham admin MFA yozuvi yo'qotilmaydi yoki o'chirilmaydi.

---

## 4. Deploy Tartibi (Zero-Downtime Safe Order)

Operator yangi versiyani deploy qilishda quyidagi qat'iy tartibga rioya qilishi shart:

```
[1. Backup] ---> [2. Pull Kod] ---> [3. Migrate] ---> [4. Restart/Recreate] ---> [5. Healthcheck]
```

### 1-qadam: Majburiy zaxira nusxa yaratish
```bash
export BACKUP_PASSPHRASE_FILE="/opt/ilmildizi/.backup_passphrase"
/opt/ilmildizi/deploy/scripts/backup.sh
# Zaxira fayli va SHA-256 sidecar yaratilganini tekshirish:
ls -lh /opt/ilmildizi-backups/
```

### 2-qadam: Yangi kodni yuklab olish
```bash
cd /opt/ilmildizi
git fetch origin main
git checkout main
# yoki tegishli release tag/SHA
```

### 3-qadam: Muhit o'zgaruvchilarini tekshirish (Qiymatlarni oshkor qilmasdan)
Operator serverda quyidagi buyruqni bajaradi:
```bash
docker compose exec web python -c "
import os, sys
required = ['SECRET_KEY', 'DATABASE_URL', 'REDIS_URL', 'ADMIN_MFA_ENCRYPTION_KEY']
missing = [k for k in required if not os.environ.get(k) or os.environ.get(k) in ('changeme', '...')]
if missing:
    print('XATOLIK: Quyidagi o\'zgaruvchilar yetishmayapti:', missing)
    sys.exit(1)
print('BARCHA MAJBURIY O\'ZGARUVCHILAR MAVJUD (qiymatlar yashirilgan)')
"
```

### 4-qadam: Baza migratsiyalarini qo'llash
```bash
docker compose exec web python manage.py migrate --noinput
```

### 5-qadam: Konteynerlarni yangi muhit bilan qayta ishga tushirish
```bash
docker compose up -d --force-recreate web frontend
```

### 6-qadam: Sog'lomlikni tekshirish (Health check)
```bash
# Docker konteyner holati
docker compose ps
# Ichki healthcheck endpoint
docker compose exec web curl -s http://127.0.0.1:8000/healthz
# Natija: {"status": "ok", "database": "ok", "cache": "ok"} bo'lishi shart.
```

---

## 5. Rollback (Favqulodda orqaga qaytish) Rejasi

Agar deploy yoki migratsiyadan so'ng jiddiy muammo yuzaga kelsa:

1. **Ilovani vaqtincha to'xtatish:**
   ```bash
   docker compose stop web
   ```
2. **Kodni oldingi barqaror SHA ga qaytarish:**
   ```bash
   git checkout <OLD_STABLE_SHA>
   ```
3. **Zaxiradan tiklash (Agar baza zararlangan bo'lsa):**
   ```bash
   export BACKUP_PASSPHRASE_FILE="/opt/ilmildizi/.backup_passphrase"
   /opt/ilmildizi/deploy/scripts/restore.sh \
     --db-file /opt/ilmildizi-backups/db-YYYYmmdd-HHMMSS.dump.enc \
     --target-db ilmildizi \
     --allow-production-overwrite
   ```
4. **Ilovani qayta ishga tushirish:**
   ```bash
   docker compose up -d --force-recreate web frontend
   ```

---

## 6. Yakuniy GO / NO-GO Xulosasi

- **Kod va Test Tayyorgarligi:** `GO`
  - Barcha P1 xavfsizlik zaifliklari (MFA kalit shifrlash, backup shifrlash) to'liq tuzatildi va testlandi.
  - Learning loop yolg'on muvaffaqiyati (offline fake success) bloklandi, faqat server tasdig'i talab qilinadi.
  - Groq prompt injection ko'p tilli (UZ, RU, EN) adversarial testlar bilan himoyalandi.
  - Testlar (69/69) to'liq muvaffaqiyatli o'tdi.
- **Production Jonli Chiqarish:** `BLOCKED`
  - Operator qo'lda `.env`ga `ADMIN_MFA_ENCRYPTION_KEY` va `BACKUP_PASSPHRASE_FILE` qo'yishi, hamda serverda migratsiya va backupni bajarishi kerak.
