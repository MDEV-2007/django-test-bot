"""Obuna tariflarining YAGONA manbasi.

NEGA ALOHIDA FAYL
-----------------
Ilgari tariflar ikki joyda ta'riflangan edi: `services.seed_plans_if_needed()` (har
`/api/premium/plans/` so'rovida ishlaydi) va qo'lda admin panelda kiritilgan qatorlar.
Bootstrap funksiyasi tarifni NOM bo'yicha qidirardi (`get_or_create(name=...)`),
shuning uchun tarif nomi o'zgargan zahoti u tarifni "yo'q" deb hisoblab, eski nom,
eski narx va eski matn bilan YANGI qator yaratardi. Natija: katalogda ikki xil narxli
ikkita bir xil tarif.

Endi hamma joy shu fayldagi ro'yxatga tayanadi va tarif `(plan_type, duration_days)`
juftligi bo'yicha topiladi — bu juftlik nomdan farqli o'laroq tarifning o'zgarmas
belgisi, ya'ni nomni istalgan vaqtda (admin panelda ham) o'zgartirsa bo'ladi.

TARIF MAZMUNI HAQIDA
--------------------
Ro'yxatdagi matnlar ataylab faqat HOZIR ishlaydigan narsalarni sanaydi:

  - mock testlar   -> tests_app/api.py, `has_active_premium_lessons` tekshiruvi
  - AI Mentor 50/kun -> learning/services.py, MENTOR_AI_DAILY_LIMIT_PRO

Video/audio darslar VA'DA QILINMAYDI: baza deyarli bo'sh, ularni sotish — bitta
"aldadi" da'vosi bilan ishonchni yo'qotadigan turdagi xato. Buning o'rniga darslar
tayyor bo'lgach obunaga qo'shilishi aytiladi — bu bor narsa haqidagi rost gap.
"""
from decimal import Decimal


def _pro_features():
    # Import funksiya ichida: `learning` ilovasi `premium`ni import qilsa, modul
    # darajasidagi import aylanma bog'lanish hosil qilardi.
    from learning.services import MENTOR_AI_DAILY_LIMIT_FREE, MENTOR_AI_DAILY_LIMIT_PRO

    return [
        "Barcha mock testlar — cheklovsiz kirish",
        f"AI Mentor: kuniga {MENTOR_AI_DAILY_LIMIT_PRO} savol "
        f"(obunasiz: {MENTOR_AI_DAILY_LIMIT_FREE} ta)",
        "Video va audio darslar tayyor bo'lgach — qo'shimcha to'lovsiz ochiladi",
    ]


def plans():
    """Kanonik tariflar ro'yxati. `(plan_type, duration_days)` — tabiiy kalit."""
    pro = _pro_features()
    return [
        {
            'plan_type': 'lessons', 'duration_days': 30, 'order': 1,
            'name': 'PRO — Oylik',
            'description': "Barcha mock testlar va kengaytirilgan AI Mentor. Istalgan vaqtda to'xtatasiz.",
            'price': Decimal('25000'),
            'features': pro + ["30 kun amal qiladi"],
        },
        {
            'plan_type': 'lessons', 'duration_days': 180, 'order': 2,
            'name': 'PRO — 6 oylik',
            'description': "Milliy sertifikat imtihoniga to'liq tayyorgarlik davri uchun.",
            # 15 000/oy — oylikka nisbatan 40% chegirma. Ilgari 120 000 (20 000/oy,
            # atigi 20%) edi: 6 barobar majburiyat uchun juda kichik sabab.
            'price': Decimal('90000'),
            'features': pro + ["15 000 so'm/oy — oylikka nisbatan 40% arzon"],
        },
        {
            'plan_type': 'lessons', 'duration_days': 365, 'order': 3,
            'name': 'PRO — 12 oylik',
            'description': "Eng past oylik narx. Butun o'quv yili davomida amal qiladi.",
            # 12 500/oy — 6 oylikdan ARZON bo'lishi shart, aks holda uzoqroq muddatni
            # tanlashning sababi qolmaydi (ilgari 200 000 = 16 667/oy, ya'ni 6 oylikdan
            # qimmat edi — mantiqan teskari narx zinapoyasi).
            'price': Decimal('150000'),
            'features': pro + ["12 500 so'm/oy — eng past oylik narx"],
        },
        {
            'plan_type': 'mock_test', 'duration_days': 0, 'order': 4,
            'name': 'Mock test — bir martalik',
            'description': "Bitta to'lov, muddatsiz kirish. AI Mentor chegarasi obunasiz darajada qoladi.",
            'price': Decimal('15000'),
            'features': [
                "Barcha rasmiy mock testlar",
                "Muddatsiz kirish",
                "AI natija tahlili",
            ],
        },
    ]


def find_plan(spec):
    """Tarifni tabiiy kaliti bo'yicha topadi (nom bo'yicha EMAS)."""
    from .models import SubscriptionPlan

    return (SubscriptionPlan.objects
            .filter(plan_type=spec['plan_type'], duration_days=spec['duration_days'])
            .order_by('id').first())


def sync_plans(update_existing=False):
    """Yetishmayotgan tariflarni yaratadi.

    `update_existing=False` (bootstrap yo'li) — mavjud qatorlarga TEGILMAYDI, ya'ni
    admin panelda qo'lda kiritilgan narx yoki matn ustidan yozilmaydi.
    `update_existing=True` (management komanda yo'li) — mazmun kanonik holatga
    keltiriladi.

    Qaytadi: (yaratilganlar, yangilanganlar) nomlar ro'yxati."""
    from .models import SubscriptionPlan

    created, updated = [], []
    for spec in plans():
        features_list = '\n'.join(spec['features'])
        plan = find_plan(spec)

        if plan is None:
            SubscriptionPlan.objects.create(
                plan_type=spec['plan_type'], duration_days=spec['duration_days'],
                name=spec['name'], description=spec['description'],
                price=spec['price'], features_list=features_list,
                order=spec['order'], is_active=True,
            )
            created.append(spec['name'])
            continue

        if not update_existing:
            continue

        changed = (
            plan.name != spec['name']
            or plan.description != spec['description']
            or plan.price != spec['price']
            or plan.features_list != features_list
        )
        if changed:
            plan.name = spec['name']
            plan.description = spec['description']
            plan.price = spec['price']
            plan.features_list = features_list
            plan.order = spec['order']
            plan.is_active = True
            plan.save()
            updated.append(spec['name'])

    return created, updated


def duplicate_plans():
    """Bir xil `(plan_type, duration_days)` juftligiga ega ortiqcha qatorlar.

    Eng eski qator (eng kichik id) asosiy deb olinadi — to'lovlar odatda o'shanga
    bog'langan. Qolganlari dublikat hisoblanadi."""
    from .models import SubscriptionPlan

    seen, dupes = {}, []
    for plan in SubscriptionPlan.objects.order_by('id'):
        key = (plan.plan_type, plan.duration_days)
        if key in seen:
            dupes.append(plan)
        else:
            seen[key] = plan
    return dupes
