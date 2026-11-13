# ILMILDIZI — FINAL SECURITY REVIEW

Oxirgi commit: `3ef4a6fb44b50fd37d53678eb234832f2b540448`

Faqat quyidagi 3 ta masalani tekshir va kerak bo'lsa minimal fix qil:

1. SEC-001:
   - JWT revoke Redis ishlamasa ham ishlashi kerak.
   - DB authoritative source bo'lsin.
   - Redis cache xatosi authentication'ni 500 ga olib kelmasin.
   - Eski cache qiymati DB'dagi yangi revoke holatini yashirmasin.
   - Redis outage test yoz.

2. SEC-002:
   - Telegram replay ledger uchun retention/cleanup mexanizmini tekshir.
   - 15 daqiqadan o'tgan initData qayta ishlatilmasin.
   - Cleanup faol initData replay himoyasini buzmasin.
   - PostgreSQL test yoz.

3. JWT timestamp:
   - RewardClaim.count orqali timestamp saqlashni tekshir.
   - 32-bit overflow xavfini bartaraf et.
   - Migratsiya va regression test qo'sh.

Qoidalar:
- Faqat tegishli fayllarni o'qi.
- Keraksiz refactoring qilma.
- Avval regression test yoz.
- PostgreSQL'da tekshir.
- Mavjud testlarni buzma.
- Secretlarni chiqarma.
- Commit/push qilma.

Yakunida:
- O'zgargan fayllar.
- Yangi testlar.
- Test natijalari.
- Qolgan xavflar.
- GO / NO-GO release xulosasi.

Test bajarilmagan bo'lsa, FIXED deb yozma.