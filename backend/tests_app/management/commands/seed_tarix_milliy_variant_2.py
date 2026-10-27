"""Django management command: Tarix fanidan namunaviy test topshiriqlari — Variant 2 (Milliy Sertifikat).

Muallif: Sodiqov Shohjahon.
Format:
- 1-32: Yopiq test topshiriqlari (A, B, C, D variantli, diagramma va jadvallar bilan).
- 33-35: Umumiy javob bankidan tanlash (A-F guruhlangan savollar).
- 36-45: Ochiq (yozma) topshiriqlar (har birida a va b bandlari bilan).
Jami: 45 ta topshiriq.
Rasch IRT 70 ballik baholash tizimiga to'liq moslangan.

Sozlamalar:
- is_published: False (qoralama holatda)
- is_premium: True (pullik mock imtihon)
- category: 'certificate' (Milliy Sertifikat)
- duration_minutes: 75

Foydalanish:
    python manage.py seed_tarix_milliy_variant_2
    python manage.py seed_tarix_milliy_variant_2 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import ensure_profile_for_user
from tests_app.models import (
    Subject, TestSet, Question, AnswerOption, QuestionGroup, GroupOption, SubQuestion
)


TEST_TITLE = "Tarix fanidan namunaviy test topshiriqlari — Variant 2 (Milliy Sertifikat)"
TEST_DESC = (
    "Tarix fanidan namunaviy test topshiriqlari (Variant 2). "
    "32 ta test, 3 ta moslashtirish va 10 ta yozma ochiq topshiriq. Jami 45 ta topshiriq. "
    "Muallif: Sodiqov Shohjahon. Rasch IRT 70 ballik rasmiy baholash mezoni."
)


class Command(BaseCommand):
    help = "Tarix Milliy Sertifikat Variant 2 (45 ta topshiriq) ni yuklaydi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Mavjud testni o'chirib qayta yaratadi.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get("force", False)

        # ── 1. Fan: Tarix ───────────────────────────────────────────────────
        subject = Subject.objects.filter(slug="tarix").first()
        if not subject:
            subject = Subject.objects.filter(name__icontains="tarix").first()
        if not subject:
            subject, _ = Subject.objects.get_or_create(
                slug="tarix",
                defaults={"name": "Tarix", "icon_name": "landmark", "color": "#a8846b", "order": 1},
            )
        self.stdout.write(f"Fan: {subject.name} (slug={subject.slug})")

        # ── 2. Muallif: Sodiqov Shohjahon ────────────────────────────────────
        teacher_user = User.objects.filter(username__iexact="shohjahon").first()
        if not teacher_user:
            teacher_user = User.objects.filter(first_name__icontains="shohjahon").first()
        if not teacher_user:
            teacher_user = User.objects.create(
                username="shohjahon",
                first_name="Shohjahon",
                last_name="Sodiqov",
                email="shohjahon@ilmildizi.uz",
            )
            teacher_user.set_unusable_password()
            teacher_user.save()
            prof = ensure_profile_for_user(teacher_user)
            prof.role = "teacher"
            prof.save()
        else:
            prof = ensure_profile_for_user(teacher_user)
            if prof.role != "teacher" and not teacher_user.is_superuser:
                prof.role = "teacher"
                prof.save(update_fields=["role"])

        # ── 3. Mavjud testni tekshirish ──────────────────────────────────────
        existing = TestSet.objects.filter(title=TEST_TITLE).first()
        if existing:
            if force:
                self.stdout.write(self.style.WARNING(f"Eski test (#{existing.id}) yangilanmoqda..."))
                if existing.has_attempts:
                    existing.is_archived = True
                    existing.save(update_fields=["is_archived"])
                else:
                    existing.delete()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"'{TEST_TITLE}' mavjud (ID: {existing.id}). Qayta yuklash: --force"
                    )
                )
                return

        # ── 4. TestSet yaratish ─────────────────────────────────────────────
        test_set = TestSet.objects.create(
            title=TEST_TITLE,
            description=TEST_DESC,
            subject=subject,
            category="certificate",
            duration_minutes=75,
            created_by=teacher_user,
            is_published=False,  # Talabga binoan qoralama holatda
            is_premium=True,     # Pullik mock imtihon
            is_random=False,
        )

        questions = []

        # ── 5. Savollar 1-32 (Variantli testlar) ─────────────────────────────
        mcq_list = [
            # 1
            {
                "num": 1,
                "body": (
                    "<p><b>1.</b> Kushonlar davrida Surxon vohasida joylashgan qaysi hududlarda "
                    "<b>katta buddaviylik ibodatxonalari</b> mavjud bo‘lgan?</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Eski Termiz; 2) Kampirtepa; 3) Ayritom; 4) Dalvarzintepa; 5) Surxko‘tal; 6) Xolchayon."
                    "</div>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "1, 3, 4", True),
                    ("B", "1, 3, 5", False),
                    ("C", "2, 3, 6", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 2
            {
                "num": 2,
                "body": (
                    "<p><b>2.</b> Quyidagi shaxslar va ular bilan bog‘liq ma’lumotlar mos ravishda berilgan javobni toping.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "<b>1)</b> Mark Krass; <b>2)</b> Ssipion; <b>3)</b> Miltiad; <b>4)</b> Alarix.<br/>"
                    "<b>a)</b> Fermopil jangida yunonlar qo‘shiniga boshchilik qilgan;<br/>"
                    "<b>b)</b> Zama shahri yaqinida Karfagen qo‘shinini tor-mor etgan;<br/>"
                    "<b>c)</b> Spartak qo‘zg‘alonini bostirgan sarkarda;<br/>"
                    "<b>d)</b> U boshchiligida vestgotlar Rimni egallaydi;<br/>"
                    "<b>e)</b> Marafon jangida yunonlar qo‘shiniga boshchilik qilgan;<br/>"
                    "<b>f)</b> U boshchiligida xunnlar Italiyaga bostirib kiradi."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1-b, 2-c, 3-a, 4-d", False),
                    ("B", "1-c, 2-b, 3-a, 4-f", False),
                    ("C", "1-c, 2-b, 3-e, 4-d", True),
                    ("D", "1-a, 2-d, 3-c, 4-b", False),
                ],
            },
            # 3
            {
                "num": 3,
                "body": (
                    "<p><b>3.</b> Afrikada o‘rta asrlarda yashagan qabilalarni hududlari bilan mos ravishda ko‘rsating.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "<b>1)</b> barbar va tuareg; <b>2)</b> fulbe; <b>3)</b> masai, galla, sidamo, tigre.<br/>"
                    "<b>a)</b> Sahroning janubida; <b>b)</b> G‘arbiy Afrikada; <b>c)</b> Sharqiy Afrikada."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1-c, 2-b, 3-a", False),
                    ("B", "1-b, 2-a, 3-c", False),
                    ("C", "1-a, 2-b, 3-c", True),
                    ("D", "1-c, 2-a, 3-b", False),
                ],
            },
            # 4
            {
                "num": 4,
                "body": (
                    "<p><b>4.</b> Quyidagi tarixiy voqealar (ma’lumotlar) to‘g‘ri xronologik ketma-ketlikda ko‘rsatilgan javobni toping.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Bosniya va Gersegovinada Usmonli davlati mustamlakachiligiga qarshi qo‘zg‘olon ko‘tarildi;<br/>"
                    "2) Avstriya-Vengriya madadiga tayangan Bolgariya o‘zini Usmonli davlatidan to‘la mustaqil deb e’lon qildi;<br/>"
                    "3) Yaponiya Seulda saroy to‘ntarishi uyushtirib, yaponparast hukumat tuzdi;<br/>"
                    "4) AQSh Kongressi Janubdagi sobiq isyonchilarga umumiy afv berish to‘g‘risidagi qonun qabul qildi;<br/>"
                    "5) “Dreyfus ishi” matbuot yuzini ko‘rdi;<br/>"
                    "6) Sudanda mustaqil mahdiylar davlati tuzildi."
                    "</div>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "3, 4, 6, 1, 5, 2", False),
                    ("B", "3, 2, 6, 4, 1, 5", False),
                    ("C", "3, 6, 5, 2, 4, 1", False),
                    ("D", "4, 1, 6, 3, 5, 2", True),
                ],
            },
            # 5
            {
                "num": 5,
                "body": (
                    "<p><b>5.</b> Quyida berilgan atamalar va ularning izohi to‘g‘ri moslashtirilgan javobni toping.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:10px 0;font-size:13px;'>"
                    "<tr style='background:rgba(148,163,184,0.1);'><th style='padding:6px;border:1px solid #cbd5e1;'>Atama</th><th style='padding:6px;border:1px solid #cbd5e1;'>Izoh</th></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'><b>I. Moliya</b></td><td style='padding:6px;border:1px solid #cbd5e1;'><b>a)</b> oddiy boyliklar garovi hisobiga foiz to‘lash va qaytarib berish sharti bilan beriladigan pul yoki boylik</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'><b>II. Trest</b></td><td style='padding:6px;border:1px solid #cbd5e1;'><b>b)</b> sarmoya, o‘z egasiga daromad keltiruvchi jami vositalar va mablag‘lar, ya’ni qiymat keltiruvchi qiymat</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'><b>III. Kapital</b></td><td style='padding:6px;border:1px solid #cbd5e1;'><b>c)</b> ishlab chiqarish va savdoni o‘zlaricha emas, markaziy boshqaruv qarori asosida olib boradigan korxonalar birlashmasi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'><b>IV. Ssuda</b></td><td style='padding:6px;border:1px solid #cbd5e1;'><b>d)</b> maqsadli pul jamg‘armalarini vujudga keltiruvchi, jamlash, taqsimlash va ishlatish bilan bog‘liq munosabatlar</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'>—</td><td style='padding:6px;border:1px solid #cbd5e1;'><b>e)</b> manfaatlar umumiyligi asosida uyushgan korxonalarning yirik birlashmasi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'>—</td><td style='padding:6px;border:1px solid #cbd5e1;'><b>f)</b> bir turdagi mahsulotlar ishlab chiqaradigan korxonalar birlashmasi</td></tr>"
                    "</table>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "I-d, II-b, III-f, IV-c", False),
                    ("B", "I-d, II-c, III-b, IV-a", True),
                    ("C", "I-b, II-d, III-a, IV-f", False),
                    ("D", "I-a, II-d, III-c, IV-e", False),
                ],
            },
            # 6
            {
                "num": 6,
                "body": (
                    "<p><b>6.</b> Quyida berilgan atamalar va ularning izohi to‘g‘ri moslashtirilgan javobni toping.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:10px 0;font-size:13px;'>"
                    "<tr style='background:rgba(148,163,184,0.1);'><th style='padding:6px;border:1px solid #cbd5e1;'>Atama</th><th style='padding:6px;border:1px solid #cbd5e1;'>Izoh</th></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'><b>I. Konsepsiya</b></td><td style='padding:6px;border:1px solid #cbd5e1;'><b>a)</b> diniy ishonch, e’tiqod; shu bilan birga mazhab mazmuniga ega tushuncha</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'><b>II. Dotatsiya</b></td><td style='padding:6px;border:1px solid #cbd5e1;'><b>b)</b> Xalqaro, umuminsoniy, umumxalqiy mazmunlarida qo‘llaniladi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'><b>III. Mentalitet</b></td><td style='padding:6px;border:1px solid #cbd5e1;'><b>c)</b> biror sohani rivojlantirishga qaratilgan keng qamrovli loyiha yoki qarashlar majmui</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'><b>IV. Strategiya</b></td><td style='padding:6px;border:1px solid #cbd5e1;'><b>d)</b> uzoqqa boruvchi ta’sir vositalari va uslublari; maqsadni istiqbolli dinamik aniqlab olish</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'>—</td><td style='padding:6px;border:1px solid #cbd5e1;'><b>e)</b> ma’lum xarajatlarni qoplash uchun iqtisodiyotning bir sub’ekti tomonidan ikkinchisiga qaytarib bermaslik sharti bilan pul berilishi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;'>—</td><td style='padding:6px;border:1px solid #cbd5e1;'><b>f)</b> jamiyat, millat, jamoa yoki alohida shaxsning tarixiy tarkib topgan tafakkur darajasi</td></tr>"
                    "</table>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "I-c, II-e, III-f, IV-d", True),
                    ("B", "I-a, II-f, III-b, IV-c", False),
                    ("C", "I-c, II-f, III-b, IV-a", False),
                    ("D", "I-a, II-e, III-b, IV-d", False),
                ],
            },
            # 7
            {
                "num": 7,
                "body": (
                    "<p><b>7. Tarixiy shaxsni aniqlang.</b><br/>"
                    "U Eronda 1907-yilda taxtga o‘tirgan. U inqilobiy o‘zgarishlarga qarshi kurashni rejalashtirgan. "
                    "Inqilobiy harakat ko‘lami uni Eronda konstitutsiyaviy tartibni saqlab turishga majbur etgan. "
                    "Demokratik harakat ta’siri ostida shoh zamindor zodagonlarning nafaqasini qisqartiradi. "
                    "Feodal zamonga xos bo‘lgan unvonlarni bekor qiladi. Poraxo‘rlik, tamagirlikka qarshi kurash "
                    "to‘g‘risida qonun e’lon qiladi.</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Muhammad Alishoh", True),
                    ("B", "Amir Abdurahmon", False),
                    ("C", "Muzaffariddin", False),
                    ("D", "Habibullo", False),
                ],
            },
            # 8
            {
                "num": 8,
                "body": (
                    "<p><b>8. Tarixiy shaxsni aniqlang.</b><br/>"
                    "U Xorazm jadidchilik harakati yetakchilaridan biri va “Yosh xivaliklar” partiyasining asoschisidir. "
                    "1914-yilda u Jadidlarning “so‘l oqim”idan ajralib chiqqan “Yosh xivaliklar” partiyasini boshqargan. "
                    "U Asfandiyorxonning Jadidlarga qarshi siyosati sabab, 1917-yil oxiridan boshlab Toshkentda 2 yil davomida muhojirlikda yashagan. "
                    "1918-yilda “Yosh xivaliklar” inqilobiy qo‘mitasi raisi etib saylangan. 1919-yildan Turkiston ASSR Milliy ishlar xalq komissarligida "
                    "Turkman sho‘basi boshlig‘i lavozimida ishlagan. 1920-yil 1-fevralda Xiva xonligi tugatilgach, yangi tashkil etilgan XXSR "
                    "Nozirlar Sho‘rosi (hukumat) raisi bo‘lgan.</p>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "Bobooxun Salimov", False),
                    ("B", "Polvonniyoz Yusupov", True),
                    ("C", "Husaynbek Matmurodov", False),
                    ("D", "Davlatmurod mahram", False),
                ],
            },
            # 9
            {
                "num": 9,
                "body": (
                    "<p><b>9. Tarixiy davlatni aniqlang.</b><br/>"
                    "Ushbu davlatda XIX asrda jahon tarixida birinchi marta mamlakat iqtisodiyotida yetakchilik qishloq xo‘jaligidan sanoatga o‘tdi. "
                    "Natijada davlat dunyoning birinchi sanoatlashgan mamlakatiga aylandi. Bu davlatda birinchi bo‘lib huquqiy davlat va fuqarolik "
                    "jamiyati asoslari yaratildi. Fan va texnika taraqqiyoti sanoat to‘ntarishiga olib keldi, natijada davlat “dunyo ustaxonasiga” aylandi. "
                    "To‘xtovsiz urushlar olib borgan ushbu davlat Yer yuzi aholisining chorak qismini birlashtirgan ulkan imperiyani yaratdi.</p>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "Fransiya", False),
                    ("B", "Buyuk Britaniya", True),
                    ("C", "Germaniya", False),
                    ("D", "Rossiya", False),
                ],
            },
            # 10
            {
                "num": 10,
                "body": (
                    "<p><b>10. Tarixiy davlatni aniqlang.</b><br/>"
                    "Xuroson, Shimoliy Hindiston hamda qisman Movarounnahr va Xorazmda hukmronlik qilgan turkiy sulola. "
                    "Sulola nomi saltanatning poytaxt shahri nomidan olingan. Viloyat boshlig‘i voliy deyilgan. Uni oliy hukmdor tayinlagan. "
                    "Viloyatlardagi boshqaruv ishlarini amid olib borgan. Shahar boshlig‘i rais deb atalgan. Shahar miqyosida kutvol, "
                    "sohibi devon kabi amaldorlar ham faoliyat ko‘rsatganlar.</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Qoraxoniylar davlati", False),
                    ("B", "Somoniylar davlati", False),
                    ("C", "G‘aznaviylar davlati", True),
                    ("D", "Tohiriylar davlati", False),
                ],
            },
            # 11
            {
                "num": 11,
                "body": (
                    "<p><b>11.</b> Yaponiyada hukmronlik qilgan <b>Yosimune Tokugava (a)</b> va <b>Mutsuxito (b)</b> boshqaruvi bilan bog‘liq ma’lumotlar to‘g‘ri berilgan javobni belgilang.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Yerni sotish va sotib olishga, uni xususiy mulkka aylantirishga ruxsat bergan;<br/>"
                    "2) qo‘riq yerlarni o‘zlashtirish hisobiga dehqonchilik qiluvchilarni rag‘batlantirish siyosatini yuritgan;<br/>"
                    "3) Ma’muriy sohada o‘tkazgan islohoti natijasida mahalliy knyazlar hokimiyati tugatilgan;<br/>"
                    "4) “100 moddali Farmon” deb nomlangan qonunlar to‘plamini joriy etgan;<br/>"
                    "5) Mamlakatda yagona pul birligi – iyena joriy etilgan;<br/>"
                    "6) sug‘orish inshootlari tizimi takomillashtirilgan;<br/>"
                    "7) yerni sotish, sotib olish yoki garovga qo‘yishni taqiqlovchi qonun chiqargan."
                    "</div>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "a-3, 4, 5, 6; b-1, 2, 7", False),
                    ("B", "a-1, 3, 4, 6; b-2, 5, 7", False),
                    ("C", "a-2, 4, 6, 7; b-1, 3, 5", True),
                    ("D", "a-1, 2, 5, 7; b-3, 4, 6", False),
                ],
            },
            # 12
            {
                "num": 12,
                "body": (
                    "<p><b>12.</b> XIX asrning ikkinchi yarmida yuz bergan voqealarni aniqlang.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Turkiston o‘lkasining bir nechta shaharlarida an’anaviy teatr uyushmalari vujudga keldi;<br/>"
                    "2) Turkiston o‘lkasi tasviriy san’ati an’anaviy devoriy naqshlarida ilgari ishlatilmagan manzaralar — suzib borayotgan kema, temiryo‘llar va hayvonlar tasvirlana boshlandi;<br/>"
                    "3) Farg‘ona vodiysi milliy me’morchiligiga Yevropa me’moriy uslubidagi binolarni qurish an’analari kirib keldi;<br/>"
                    "4) Xiva xonligida taraqqiyparvarlik harakati shakllandi;<br/>"
                    "5) Turkistonda ma’rifatparvarlik harakati vujudga keldi."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1, 3, 5", True),
                    ("B", "2, 4, 5", False),
                    ("C", "1, 4, 5", False),
                    ("D", "2, 3, 5", False),
                ],
            },
            # 13
            {
                "num": 13,
                "body": (
                    "<p><b>13.</b> Xiva xonligidagi qaysi lavozim egasi xonlikda to‘planadigan soliqlarning davlat xazinasiga "
                    "tushishini ta’minlagan, hamda moliya ishlari va qo‘shinning holati uchun javobgar bo‘lgan? (XIX asr I yarmi)</p>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "devonbegi", False),
                    ("B", "yasovulboshi", False),
                    ("C", "otaliq", False),
                    ("D", "qo‘shbegi", True),
                ],
            },
            # 14
            {
                "num": 14,
                "body": (
                    "<p><b>14. Noto‘g‘ri ma’lumot berilgan javobni toping.</b></p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1992-yilda Respublikamizda Davlat mulkini boshqarish va xususiylashtirish Davlat qo‘mitasi ta’sis etildi", False),
                    ("B", "2017-yilda Respublikamizda Millatlararo munosabatlar va xorijiy mamlakatlar bilan do‘stlik aloqalari qo‘mitasi tashkil etildi", False),
                    ("C", "2016-yilda Respublikamizda Fan va texnologiyalarni rivojlantirishni muvofiqlashtirish qo‘mitasi tashkil etildi", True),
                    ("D", "2018-yilda Respublikamizda Jismoniy tarbiya va sport davlat qo‘mitasi tashkil etildi", False),
                ],
            },
            # 15
            {
                "num": 15,
                "body": (
                    "<p><b>15.</b> Tarixiy-mantiqiy ketma-ketlik (moslik) berilgan javobni toping.</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "hukmdor Sundiata Keyt – Mali – Gao", False),
                    ("B", "lashkarboshi Van Gon – Koryo – Pxenyan", False),
                    ("C", "sarkarda Li Son Ge – Choson – Xanson", True),
                    ("D", "imperator Yustinian I – Ispaniya – Ravenna", False),
                ],
            },
            # 16
            {
                "num": 16,
                "body": (
                    "<p><b>16.</b> AQSH prezidenti <b>Ronald Reygan</b> ma’muriyati davrida iqtisodiy inqirozdan chiqish uchun qanday choralar ko‘rilgan?</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) davlatning iqtisodga aralashuvini chekladi;<br/>"
                    "2) davlat xarajatlarini kamaytirdi;<br/>"
                    "3) sarmoya kiritish uchun katta soliq imtiyozlari joriy qildi;<br/>"
                    "4) ijtimoiy to‘lovlar kamaytirildi;<br/>"
                    "5) xususiy tashabbus rag‘batlantirildi."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1, 3, 5", True),
                    ("B", "2, 4, 5", False),
                    ("C", "1, 4, 5", False),
                    ("D", "2, 3, 4", False),
                ],
            },
            # 17 (Xarita savoli)
            {
                "num": 17,
                "body": (
                    "<p><b>17.</b> Xaritada qaysi raqam bilan ko‘rsatilgan hudud (davlat) an’anaviy sivilizatsiya mamlakatlari "
                    "ichida birinchi bo‘lib industrial taraqqiyot yo‘liga kirgan?</p>"
                    "<div style='margin:12px 0;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;text-align:center;'>"
                    "<svg viewBox='0 0 500 280' width='100%' height='240' style='max-width:480px;display:block;margin:0 auto;background:#f1f5f9;border-radius:8px;border:1px solid #e2e8f0;'>"
                    "<text x='130' y='250' font-size='13' font-style='italic' fill='#0284c7' text-anchor='middle'>Hind okeani</text>"
                    "<text x='390' y='190' font-size='13' font-style='italic' fill='#0284c7' text-anchor='middle'>Tinch okean</text>"
                    "<path d='M 40,80 Q 70,60 120,60 Q 180,40 240,50 Q 310,40 370,60 Q 420,80 430,110 L 400,120 Q 380,100 360,110 Q 330,130 350,160 Q 360,200 330,220 Q 300,230 280,200 Q 260,170 230,170 Q 210,180 200,210 Q 180,240 160,240 Q 140,210 130,180 Q 110,170 90,180 Q 70,160 50,140 Z' fill='#e2e8f0' stroke='#94a3b8' stroke-width='2'/>"
                    "<path d='M 130,180 Q 150,200 160,235 Q 170,200 190,180 Z' fill='#cbd5e1' stroke='#64748b' stroke-width='1.5'/>"
                    "<path d='M 345,130 Q 355,140 350,160 Q 340,150 342,130 Z' fill='#cbd5e1' stroke='#64748b' stroke-width='1.5'/>"
                    "<path d='M 390,110 Q 410,130 405,160 Q 395,170 385,150 Q 380,130 390,110 Z' fill='#fef08a' stroke='#ca8a04' stroke-width='2'/>"
                    "<circle cx='155' cy='205' r='13' fill='#ffffff' stroke='#1e293b' stroke-width='2'/>"
                    "<text x='155' y='210' font-size='13' font-weight='bold' fill='#0f172a' text-anchor='middle'>1</text>"
                    "<line x1='155' y1='192' x2='155' y2='175' stroke='#334155' stroke-width='1.5' stroke-dasharray='2,2'/>"
                    "<circle cx='280' cy='95' r='13' fill='#ffffff' stroke='#1e293b' stroke-width='2'/>"
                    "<text x='280' y='100' font-size='13' font-weight='bold' fill='#0f172a' text-anchor='middle'>2</text>"
                    "<line x1='280' y1='108' x2='280' y2='125' stroke='#334155' stroke-width='1.5' stroke-dasharray='2,2'/>"
                    "<circle cx='345' cy='125' r='13' fill='#ffffff' stroke='#1e293b' stroke-width='2'/>"
                    "<text x='345' y='130' font-size='13' font-weight='bold' fill='#0f172a' text-anchor='middle'>3</text>"
                    "<circle cx='415' cy='130' r='13' fill='#ffffff' stroke='#1e293b' stroke-width='2'/>"
                    "<text x='415' y='135' font-size='13' font-weight='bold' fill='#0f172a' text-anchor='middle'>4</text>"
                    "<line x1='402' y1='130' x2='395' y2='130' stroke='#334155' stroke-width='2'/>"
                    "</svg>"
                    "<div style='margin-top:8px;font-size:12px;color:#64748b;font-weight:500;'>"
                    "Xaritadagi raqamlar: <b>1</b> — Hindiston; <b>2</b> — Xitoy; <b>3</b> — Koreya; <b>4</b> — Yaponiya"
                    "</div>"
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1", False),
                    ("B", "2", False),
                    ("C", "3", False),
                    ("D", "4", True),
                ],
            },
            # 18
            {
                "num": 18,
                "body": (
                    "<p><b>18.</b> Tarixiy voqea va uning natijasi o‘zaro mos berilgan qatorlarni aniqlang.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px;'>"
                    "<tr style='background:rgba(148,163,184,0.1);'><th style='padding:6px;border:1px solid #cbd5e1;'>№</th><th style='padding:6px;border:1px solid #cbd5e1;'>Voqea</th><th style='padding:6px;border:1px solid #cbd5e1;'>Natija</th></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>1</td><td style='padding:5px;border:1px solid #cbd5e1;'>Rossiya-Turkiya o‘rtasida San-Stefano shartnomasi imzolandi (1878-yil)</td><td style='padding:5px;border:1px solid #cbd5e1;'>Mustaqil Bolgariya davlati tashkil topdi (qisqa muddatga)</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>2</td><td style='padding:5px;border:1px solid #cbd5e1;'>1965-1973-yillarda AQSH-Vyetnam urushi bo‘lib o‘tdi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Vyetnam uzil-kesil yagona davlatga birlashtirildi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>3</td><td style='padding:5px;border:1px solid #cbd5e1;'>XX asr 40-yillarida XXRda Mao Szedun hokimiyatga keldi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Madaniy inqilob rasman yakunlandi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>4</td><td style='padding:5px;border:1px solid #cbd5e1;'>1963-yil Eronda “Oq inqilob” sodir bo‘ldi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Eron Islom Respublikasi ag‘darilib, pahlaviylar sulolasi hokimiyatga keldi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>5</td><td style='padding:5px;border:1px solid #cbd5e1;'>Birinchi Jahon urushi boshlandi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Fransiyada Uchinchi Respublika tuzumi ag‘darildi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>6</td><td style='padding:5px;border:1px solid #cbd5e1;'>Birinchi Bolqon urushi bo‘lib o‘tdi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Usmonlilar davlatida “Hurriyat va birdamlik” hokimiyati ag‘darildi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>7</td><td style='padding:5px;border:1px solid #cbd5e1;'>Fermopil jangi bo‘lib o‘tdi (mil.avv 480-yil)</td><td style='padding:5px;border:1px solid #cbd5e1;'>Forslar yunonlar ustidan g‘alaba qozondi</td></tr>"
                    "</table>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "2, 3, 4, 7", False),
                    ("B", "1, 3, 6, 7", False),
                    ("C", "2, 4, 5, 7", False),
                    ("D", "1, 2, 6, 7", True),
                ],
            },
            # 19
            {
                "num": 19,
                "body": (
                    "<p><b>19.</b> Jadvalda harflar bilan belgilangan kataklarga quyida berilgan ma’lumotlardan moslarini qo‘yib to‘g‘ri javobni toping.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:10px 0;font-size:12px;'>"
                    "<tr style='background:rgba(148,163,184,0.1);'><th style='padding:5px;border:1px solid #cbd5e1;'>Asr</th><th style='padding:5px;border:1px solid #cbd5e1;'>O‘zbekiston tarixidagi voqea</th><th style='padding:5px;border:1px solid #cbd5e1;'>Jahon tarixidagi voqea</th></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>a</b></td><td style='padding:5px;border:1px solid #cbd5e1;'>Movarounnahrda Temuriylar saltanati to‘la barham topdi</td><td style='padding:5px;border:1px solid #cbd5e1;'><b>b</b></td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>c</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>d</b></td><td style='padding:5px;border:1px solid #cbd5e1;'>Buyuk Britaniya imperiya deb e’lon qilindi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>XV</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>e</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>f</b></td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>g</b></td><td style='padding:5px;border:1px solid #cbd5e1;'>O‘zbekiston Respublikasining “Tashqi siyosiy faoliyati konsepsiyasi” e’lon qilindi</td><td style='padding:5px;border:1px solid #cbd5e1;'><b>h</b></td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>i</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>j</b></td><td style='padding:5px;border:1px solid #cbd5e1;'>Qul savdosida yetakchilikni gollandlar o‘z qo‘liga oldi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>IV</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>k</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>l</b></td></tr>"
                    "</table>"
                    "<div style='margin-top:6px;font-size:11.5px;color:#475569;'>"
                    "<b>Ma’lumotlar:</b> 1) “Juma inqilobi”; 2) 2012-yil; 3) Subxonqulixon Balxni egallaydi; 4) XVI asr; 5) Germaniyada kitob bosish dastgohi ixtiro qilindi; 6) Qo‘qon xonligi tugatildi; 7) XIX asr; 8) Falastin kuzatuvchi-davlat maqomi; 9) XVII asr; 10) Mali davlatiga asos solindi; 11) Rim imperiyasi ikki qismga bo‘lindi; 12) XVI asr; 13) Mirzo Ulug‘bek fulusiy pullar islohoti; 14) Afrig‘iylar poytaxtni Katga ko‘chirdi; 15) XVII asr; 16) Toshkent bekligi tashkil topdi; 17) XVII asr; 18) Kuba Ispaniya mustamlakasiga aylandi; 19) Samoa orollarining bir qismi Germaniyaga qo‘shildi."
                    "</div>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "a-4, b-10, c-9, d-16, e-1, f-18, g-2, h-8, i-12, j-6, k-14, l-3", False),
                    ("B", "a-4, b-18, c-7, d-6, e-13, f-5, g-2, h-8, i-17, j-3, k-14, l-11", True),
                    ("C", "a-4, b-10, c-12, d-16, e-1, f-17, g-2, h-5, i-15, j-6, k-8, l-3", False),
                    ("D", "a-4, b-18, c-15, d-6, e-5, f-19, g-4, h-3, i-12, j-6, k-6, l-11", False),
                ],
            },
            # 20 (Eyler-Venn)
            {
                "num": 20,
                "body": (
                    "<p><b>20.</b> Quyida berilgan ma’lumotlarni tahlil qilib <b>Eyler-Venn diagrammasiga</b> mos keladigan javoblarni aniqlang.</p>"
                    "<div style='margin:12px 0;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;text-align:center;'>"
                    "<svg viewBox='0 0 360 140' width='100%' height='140' style='max-width:360px;display:block;margin:0 auto;'>"
                    "<circle cx='130' cy='75' r='55' fill='#38bdf8' fill-opacity='0.15' stroke='#0284c7' stroke-width='2'/>"
                    "<circle cx='230' cy='75' r='55' fill='#fbbf24' fill-opacity='0.15' stroke='#d97706' stroke-width='2'/>"
                    "<path d='M 180,36 A 55 55 0 0 1 180,114 A 55 55 0 0 1 180,36' fill='#94a3b8' fill-opacity='0.45' stroke='#475569' stroke-width='1.5'/>"
                    "<text x='110' y='80' font-size='16' font-weight='bold' fill='#0369a1' text-anchor='middle'>I</text>"
                    "<text x='180' y='80' font-size='16' font-weight='bold' fill='#0f172a' text-anchor='middle'>III</text>"
                    "<text x='250' y='80' font-size='16' font-weight='bold' fill='#b45309' text-anchor='middle'>II</text>"
                    "<text x='110' y='14' font-size='12' font-weight='600' fill='#0f172a' text-anchor='middle'>Mixail Sakashvili</text>"
                    "<text x='250' y='14' font-size='12' font-weight='600' fill='#0f172a' text-anchor='middle'>Muhammad Rizo Pahlaviy</text>"
                    "</svg>"
                    "<div style='margin-top:12px;text-align:left;font-size:12.5px;line-height:1.7;'>"
                    "<b>a)</b> mamlakatda korrupsiyaga qarshi kurash e’lon qildi;<br/>"
                    "<b>b)</b> soliqlarni kamaytirish, davlat mulkini xususiylashtirish kabi muhim islohotlarni amalga oshirdi;<br/>"
                    "<b>c)</b> iqtisodiyotni modernizatsiya qilish uchun bir qator tadbirlarni amalga oshirdi;<br/>"
                    "<b>d)</b> millatlararo munosabatlar keskinlashib gruzin-abxaz mojarosi kelib chiqdi;<br/>"
                    "<b>e)</b> Konstitutsiya va deyarli barcha demokratik erkinliklar bekor qilindi."
                    "</div>"
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "I-b; II-c; III-a", True),
                    ("B", "I-a; II-d,e; III-b", False),
                    ("C", "I-d; II-b,a; III-e", False),
                    ("D", "I-b; II-c,e; III-a", False),
                ],
            },
            # 21
            {
                "num": 21,
                "body": (
                    "<p><b>21.</b> Quyidagi ixtirolardan qaysi biri Fransiyada <b>ikkinchi imperiya</b> hokimiyati davrida sodir bo‘lgan?</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Tutunsiz porox", False),
                    ("B", "Elementlarning davriy jadvali", False),
                    ("C", "Linde sovutgichi", False),
                    ("D", "Pasterizatsiya usuli", True),
                ],
            },
            # 22
            {
                "num": 22,
                "body": (
                    "<p><b>22.</b> Mustaqil O‘zbekiston tarixi bilan bog‘liq to‘g‘ri ma’lumotlar berilgan javobni aniqlang.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "I. Toshkentda ilk bor trolleybuslar qatnay boshladi;<br/>"
                    "II. Surxondaryo viloyatining markazi – Termiz shahrida Arxeologiya muzeyi ish boshladi;<br/>"
                    "III. O‘zbekiston SSSR Ministrlar Soveti O‘zbekiston SSR Prezidenti huzuridagi Vazirlar Mahkamasiga aylantirildi;<br/>"
                    "IV. Mahalla fuqarolar yig‘ini raisining o‘rinbosari – yoshlar masalalari bo‘yicha maslahatchi lavozimi joriy etildi."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "I va III", False),
                    ("B", "II va IV", True),
                    ("C", "I va IV", False),
                    ("D", "II va III", False),
                ],
            },
            # 23
            {
                "num": 23,
                "body": (
                    "<p><b>23.</b> XIX asr oxiri – XX asr boshlarida quyidagi qaysi davlat <b>temir va po‘lat ishlab chiqarishda</b> jahonda birinchi o‘ringa chiqdi?</p>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "Germaniya", False),
                    ("B", "Fransiya", False),
                    ("C", "Rossiya", False),
                    ("D", "AQSH", True),
                ],
            },
            # 24
            {
                "num": 24,
                "body": (
                    "<p><b>24.</b> Qadimdan to hozirgacha O‘rta Osiyo hududida yetishib chiqqan sarkardalardan qaysilari <b>Hindiston hududlarini</b> qamal qilgan?</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Yevtidem; 2) Aleksandr Makedonskiy; 3) Amir Temur; 4) Kanishka; 5) Z.M. Bobur; 6) Demetriy; 7) Mahmud G‘aznaviy; 8) Qutbiddin Oyboq; 9) Chandragupta I"
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "2, 4, 5, 8, 9", False),
                    ("B", "3, 4, 5, 6, 7", True),
                    ("C", "1, 3, 6, 8, 9", False),
                    ("D", "4, 5, 7, 8, 9", False),
                ],
            },
            # 25
            {
                "num": 25,
                "body": (
                    "<p><b>25.</b> Quyidagi atamalarga tegishli ma’lumotlar mos ravishda berilgan javobni toping.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px;'>"
                    "<tr style='background:rgba(148,163,184,0.1);'><th style='padding:6px;border:1px solid #cbd5e1;'>Zona turi</th><th style='padding:6px;border:1px solid #cbd5e1;'>Tavsifi</th></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>I. Maxsus iqtisodiy zona</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>a)</b> bu zonalarda korxonalar faoliyatini jadallashtirish, sanoatni modernizatsiya qilish, ichki bozorni tovarlar bilan to‘ldirish amalga oshiriladi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>II. Erkin iqtisodiy zona</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>b)</b> bu zonalarda yangi texnologiyalarni o‘zlashtirish, hududning o‘ziga xos imkoniyatlarini hisobga olgan holda maxsus mahsulotlar ishlab chiqarish tashkil etiladi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>III. Maxsus industrial zona</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>c)</b> bu zonalar alohida maqomga ega bo‘ladi, maxsus imtiyoz va chegirma asosida savdo, boj imkoniyatlari beriladi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'>—</td><td style='padding:5px;border:1px solid #cbd5e1;'><b>d)</b> bu zonalarda bozor iqtisodiyotining ochiq tizimi tashkil etiladi, tadbirkorlar uchun qulay, imtiyozli sharoit yaratiladi</td></tr>"
                    "</table>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "I-a; II-b; III-d", False),
                    ("B", "I-c; II-d; III-b", True),
                    ("C", "I-b, II-d; III-a", False),
                    ("D", "I-a; II-c; III-d", False),
                ],
            },
            # 26
            {
                "num": 26,
                "body": (
                    "<p><b>26.</b> Arab xalifaligi davrida tashkil etilgan ilm dargohlari haqidagi ma’lumotlarni moslashtiring.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "<b>I)</b> VIII asrda Tunisda; <b>II)</b> IX asrda Bag‘dodda; <b>III)</b> IX asrda Fesda (Marokash); <b>IV)</b> X asrda Qohirada.<br/>"
                    "<b>a)</b> “Qaroviyun”; <b>b)</b> “Zaytuna”; <b>c)</b> “Bayt ul-hikma”; <b>d)</b> “Al-Azhar”."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "I-b, II-c, III-d, IV-a", False),
                    ("B", "I-a, II-b, III-c, IV-d", False),
                    ("C", "I-b, II-c, III-a, IV-d", True),
                    ("D", "I-a, II-c, III-b, IV-d", False),
                ],
            },
            # 27
            {
                "num": 27,
                "body": (
                    "<p><b>27.</b> Quyidagi ma’lumotlarga mos yakuniy xulosalar (to‘g‘ri/noto‘g‘ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "<b>I.</b> 1870-yil o‘lkada o‘quv bo‘limlarini tashkil etish bo‘yicha maxsus komissiya Qo‘qon shahrida ish boshladi.<br/>"
                    "<b>II.</b> O‘zbekistonda XX asr boshlarida zamonaviy futbol qoidalari asosida o‘yinlar o‘tkazilgan. 1912-yil Qo‘qonda birinchi futbol jamoasi tuzilgan.<br/>"
                    "<b>III.</b> Turkistonda fuqarolarning ijtimoiy-maishiy hayotlarida duch kelishi mumkin bo‘lgan masalalarni shar’iy yo‘l bilan hal qilish maqsadida 1917-yil 10-avgustda ”Fuqaho jamiyati” tashkil topdi."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "I-noto‘g‘ri; II-to‘g‘ri; III-noto‘g‘ri", True),
                    ("B", "I-to‘g‘ri; II-noto‘g‘ri; III-to‘g‘ri", False),
                    ("C", "I-noto‘g‘ri; II-noto‘g‘ri; III-to‘g‘ri", False),
                    ("D", "I-noto‘g‘ri; II-to‘g‘ri; III-to‘g‘ri", False),
                ],
            },
            # 28
            {
                "num": 28,
                "body": (
                    "<p><b>28.</b> 1900-1914-yillar AQSH tarixiga “taraqqiyparvar davr” nomi bilan kirdi. Bunga AQSH prezidentlari "
                    "(Teodor Ruzvelt, Taft, Vudro Vilson)ning monopoliyalarga qarshi kurash olib borganligi sabab bo‘ldi. "
                    "<b>AQSH prezidentlarining monopoliyalarga qarshi kurashishdan maqsadi nima edi?</b></p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "feodal jamiyat ildizlariga to‘la barham berish", False),
                    ("B", "demokratik erkinliklar joriy qilish, oligarxiya tizimini kuchaytirish", False),
                    ("C", "o‘rta tabaqalar manfaatini himoya qilish", True),
                    ("D", "Konstitutsiyaga o‘zgartirish va qo‘shimchalar kiritish", False),
                ],
            },
            # 29
            {
                "num": 29,
                "body": (
                    "<p><b>29.</b> Germaniyada qaysi sulola hukmronligi davrida Iogann Guttenberg tomonidan kitob bosish dastgohi ixtiro etilgan?</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Gabsburglar", True),
                    ("B", "Lyuksemburglar", False),
                    ("C", "Shtaufenlar", False),
                    ("D", "Gogensollernlar", False),
                ],
            },
            # 30
            {
                "num": 30,
                "body": (
                    "<p><b>30.</b> Asarlar va ularning mualliflari to‘g‘ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:1fr 1.2fr;gap:12px;margin:12px 0;'>"
                    "<div style='display:flex;flex-direction:column;gap:8px;justify-content:space-around;'>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>1.</b> “Mujmali Fasihiy”</div>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>2.</b> “Temurnoma”</div>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>3.</b> “Masnaviyi ma’naviy”</div>"
                    "</div>"
                    "<div style='display:flex;flex-direction:column;gap:6px;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>a)</b> Xusrav Dehlaviy</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>b)</b> Ahmad Fasih Havofiy</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>c)</b> Marsel Brion</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>d)</b> Qosim Buxoriy</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>e)</b> Pahlavon Mahmud</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>f)</b> Jaloliddin Rumiy</div>"
                    "</div>"
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1-b; 2-f; 3-a", False),
                    ("B", "1-e; 2-f; 3-c", False),
                    ("C", "1-e; 2-c; 3-d", False),
                    ("D", "1-b; 2-d; 3-f", True),
                ],
            },
            # 31
            {
                "num": 31,
                "body": (
                    "<p><b>31.</b> Chizmada nomi keltirilgan shaxslar va ularga tegishli ma’lumotlar to‘g‘ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:1fr 1.3fr;gap:12px;margin:12px 0;'>"
                    "<div style='display:flex;flex-direction:column;gap:8px;justify-content:space-around;'>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>1.</b> Pavlov</div>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>2.</b> Jukovskiy</div>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>3.</b> Mendeleyev</div>"
                    "</div>"
                    "<div style='display:flex;flex-direction:column;gap:6px;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>a)</b> elektromagnit to‘lqinlari haqida nazariya asoschisi</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>b)</b> irsiyat qonunlari formulasi</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>c)</b> patologik anatomiya asoslari</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>d)</b> qanot ko‘tarish kuchi formulasi</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>e)</b> poloniy va radiy elementlari</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>f)</b> tutunsiz porox</div>"
                    "</div>"
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1-a; 2-e; 3-d", False),
                    ("B", "1-b; 2-d; 3-f", True),
                    ("C", "1-b; 2-a; 3-c", False),
                    ("D", "1-c; 2-a; 3-f", False),
                ],
            },
            # 32
            {
                "num": 32,
                "body": (
                    "<p><b>32.</b> XX asrda amalga oshirilgan quyidagi ixtirolardan qay biri dastavval "
                    "<b>axborotni qayta ishlash va hisoblash</b> uchun yaratilgan edi?</p>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "katta sonlarni hisoblash mashinasi", False),
                    ("B", "uyali telefon", False),
                    ("C", "elektron mikrosxema", False),
                    ("D", "kompyuter", True),
                ],
            },
        ]

        for item in mcq_list:
            q = Question.objects.create(
                body=item["body"],
                difficulty=item.get("diff", "medium"),
                category="certificate",
                question_type="single_choice",
                subject=subject,
                points=1,
            )
            for opt_label, opt_text, is_corr in item["options"]:
                AnswerOption.objects.create(
                    question=q,
                    text=f"{opt_label}) {opt_text}",
                    is_correct=is_corr,
                )
            questions.append(q)

        # ── 6. Savollar 33-35 (Javob bankidan tanlash — QuestionGroup) ──────
        group = QuestionGroup.objects.create(
            test_set=test_set,
            instruction="33-35-test topshiriqlariga mos keluvchi javoblarni (A-F) javob variantlaridan tanlang.",
            order=1,
        )
        group_opts_data = [
            ("A", "Eron islom inqilobi."),
            ("B", "Karib inqirozi."),
            ("C", "Pivo isyoni."),
            ("D", "Avgust inqirozi."),
            ("E", "Noyabr inqilobi."),
            ("F", "Italiya-Usmonli urushi."),
        ]
        opt_map = {}
        for idx, (lbl, txt) in enumerate(group_opts_data):
            g_opt = GroupOption.objects.create(
                group=group,
                label=lbl,
                text=txt,
                order=idx + 1,
            )
            opt_map[lbl] = g_opt

        grouped_questions = [
            (33, "Quyidagi qaysi voqea natijasida Germaniyada Veymar respublikasi davri boshlandi?", "E"),
            (34, "Qaysi voqea Jon Kennedi va Nikita Xrushchyov nomi bilan bog‘liq?", "B"),
            (35, "Quyidagi qaysi voqea boshqalariga nisbatan eng avval yuz bergan?", "F"),
        ]

        for num, text, corr_lbl in grouped_questions:
            q = Question.objects.create(
                body=f"<p><b>{num}.</b> {text}</p>",
                difficulty="medium",
                category="certificate",
                question_type="grouped_item",
                subject=subject,
                group=group,
                correct_group_option=opt_map[corr_lbl],
                points=1,
            )
            questions.append(q)

        # ── 7. Savollar 36-45 (Ochiq yozma topshiriqlar — a va b) ───────────
        open_questions = [
            # 36
            {
                "num": 36,
                "context": "XIV asr Fransiyada toifaviy monarxiya – markazlashgan davlat vujudga keldi.",
                "sub": [
                    ("a", "Mamlakatni markazlashtirish siyosatini boshlagan sulola nomini yozing.", "Kapetinglar"),
                    ("b", "Ushbu sulolaning birinchi vakilini nomini yozing.", "Gugo Kapet"),
                ],
            },
            # 37
            {
                "num": 37,
                "context": (
                    "Ingliz burjua inqilobi natijasida mamlakatda huquqiy davlat va fuqarolik jamiyati tarkib topa boshladi. "
                    "Angliya burjua inqilobi va uning g‘oyalari boshqa Yevropa mamlakatlari rivojiga katta ta’sir ko‘rsatdi."
                ),
                "sub": [
                    ("a", "Burjua inqilobi boshlangan davrda Angliyada hokimiyat tepasida turgan sulola nomini yozing.", "Styuartlar"),
                    ("b", "Ushbu sulolaning so‘nggi vakilini nomini yozing.", "Yakov II"),
                ],
            },
            # 38
            {
                "num": 38,
                "context": (
                    "Ikkinchi jahon urushi davrida nemis fashist agressorlariga qarshi kurashuvchi davlatlar koalitsiyasi tuzilgan. "
                    "1945-yil 16-apreldan 2-maygacha Berlin operatsiyasi amalga oshirilib, shu vaqt ichida Uchinchi reyxning poytaxti o‘rab olindi va shturm bilan zabt etildi."
                ),
                "sub": [
                    ("a", "AQShning antigitlerchilar ittifoqdosh qo‘shiniga rahbarlik qilgan qo‘mondon nomini yozing.", "Duayt Eyzenxauer"),
                    ("b", "Germaniya ustidan qozonilgan g‘alabada muhim rol o‘ynagan ingliz qo‘shinlari qo‘mondonini yozing.", "Bernard Montgomeri"),
                ],
            },
            # 39
            {
                "num": 39,
                "context": "Ma’lumki, qul savdosi Afrikaning sillasini quritish evaziga Yevropa va Amerika mamlakatlarining iqtisodiy gullab-yashnashiga xizmat qildi.",
                "sub": [
                    ("a", "1884-1885-yili Yevropa davlatlari ishtirokida “Qora qit’a” taqdirini muhokama qilishga bag‘ishlangan birinchi maxsus yig‘ilish bo‘lib o‘tgan davlat nomini yozing.", "Germaniya"),
                    ("b", "Ushbu konferensiya tashabbuskori bo‘lgan shaxsni nomini to‘liq yozing. (XIX asrning ikkinchi yarmi)", "Otto fon Bismark"),
                ],
            },
            # 40
            {
                "num": 40,
                "context": "Eftallar davlati janubdan Eron sosoniylaridan, shimoldan esa Turk xoqonligidan 563–567-yillarda zarbaga uchrab tamomila barbod bo‘ladi.",
                "sub": [
                    ("a", "Eftallar davlatining shimoliy hududlari turklar xavfi ostida qolgach, bunday qulay vaziyatdan foydalangan sosoniylar qaysi hududlarni eftallardan tortib oladilar? (ikki hudud nomini yozing)", "Toxariston va Chag'oniyon"),
                    ("b", "Turk xoqonligining eftallar bilan to‘qnashuv xavfi xoqonlikni qaysi davlatlar bilan o‘zaro yaqinlashtirgan? (ikki davlat nomini yozing)", "Eron va Vizantiya"),
                ],
            },
            # 41
            {
                "num": 41,
                "context": "Ma'lumki, Amir Temur ulkan saltanat tasarrufidagi o‘lkalarni asosan to‘rt qism (ulus)ga bo‘lib, o‘g‘illari, nabiralari va xizmat ko‘rsatgan amirlarga suyurg‘ol tarzida in’om qilgan.",
                "sub": [
                    ("a", "Uluslar taqsimotida Sohibqiron tomonidan G‘arbiy Eron, Ozarbayjon, Iroq va Armaniston hududlari mulk qilib berilgan temuriyzodaning nomini yozing.", "Mironshoh"),
                    ("b", "Uluslar taqsimotida Sohibqiron tomonidan Afg‘oniston va Shimoliy Hindiston hududlari mulk qilib berilgan temuriyzodaning nomini yozing.", "Pirmuhammad"),
                ],
            },
            # 42
            {
                "num": 42,
                "context": "Qo‘qon xonligi sarhadlarining xavfsizligini mustahkamlash uchun o‘sha davrda harbiy qal’alar va istehkomlar qurilishi muhim bo‘lgan. Shu sababli bu masalaga alohida e’tibor qaratilgan.",
                "sub": [
                    ("a", "Xonlikning shimoliy qismi mustahkam himoyalangan bo‘lib, bu hududda joylashgan shahar-qal’alardan eng kamida ikkitasini nomini yozing.", "Turkiston, Chimkent, Toshkent"),
                    ("b", "Xonlikning sharqiy qismida joylashgan shahar-qal’alarni nomini yozing.", "O‘sh va Pishpak"),
                ],
            },
            # 43
            {
                "num": 43,
                "context": (
                    "Rossiya imperatori Aleksandr II (1855–1881)ning 1859-yilda Qo‘qon xonligini bosib olishni davom ettirish to‘g‘risidagi "
                    "ko‘rsatmasidan so‘ng harbiy harakatlar kuchaydi. Buning uchun, eng avvalo, xonlikning Toshkent shahri bosib olinishi zarur edi."
                ),
                "sub": [
                    ("a", "Rossiya imperiyasining Toshkentni bosib olish uchun yuborilgan qo‘shinlariga qo‘mondonlik qilgan shaxsni nomini yozing.", "M. Chernyayev"),
                    ("b", "Toshkentni bosib olish uchun harbiy harakatlar qaysi yo‘nalishlardan amalga oshirilgan?", "Perovskiy forti, Verniy shahri"),
                ],
            },
            # 44
            {
                "num": 44,
                "context": "1920-yil tashkil etilgan BXSRda Nozirlar kengashi joriy etilgan edi.",
                "sub": [
                    ("a", "BXSR hukumati tarkibida maorif noziri lavozimida ishlagan shaxsni nomini to‘liq yozing.", "Qori Yo‘ldosh Po‘latov"),
                    ("b", "BXSR hukumati tarkibida favqulodda komissiya raisi lavozimida ishlagan shaxsni nomini to‘liq yozing.", "Yu.Ibrohimov"),
                ],
            },
            # 45
            {
                "num": 45,
                "context": "Amir Temur davrida Samarqand va uning atrofida 10 dan ortiq betakror bog‘lar yaratilgan va ularga o‘ziga xos nomlar qo‘yilgan.",
                "sub": [
                    ("a", "Sohibqiron Samarqand shimolidagi Cho‘ponota maqbarasi yaqinida nabirasi, Mironshohning qiziga atab qurdirgan bog‘ nomini yozing.", "Bog‘i Baland"),
                    ("b", "Sohibqiron zafarli yurishlardan qaytgach, dam olgan, xorijiy elchilarni qabul qilgan bog‘ nomini yozing.", "Bog‘i Davlatobod"),
                ],
            },
        ]

        for item in open_questions:
            body_html = f"<p><b>{item['num']}.</b> {item['context']}</p>"
            q = Question.objects.create(
                body=body_html,
                difficulty="hard",
                category="certificate",
                question_type="open_written",
                subject=subject,
                points=2,
            )
            for sub_order, (lbl, text, ref_ans) in enumerate(item["sub"]):
                SubQuestion.objects.create(
                    question=q,
                    label=lbl,
                    text=text,
                    reference_answer=ref_ans,
                    order=sub_order + 1,
                )
            questions.append(q)

        # ── 8. Savollarni TestSet'ga ulash ──────────────────────────────────
        test_set.questions.set(questions)
        test_set.question_order = [q.id for q in questions]
        test_set.save(update_fields=["question_order"])

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Muvaffaqiyatli yuklandi: '{TEST_TITLE}'\n"
                f"📊 Jami: {len(questions)} ta topshiriq (1-32 MCQ, 33-35 Moslash, 36-45 Ochiq yozma)\n"
                f"👤 Muallif: Sodiqov Shohjahon\n"
                f"🔒 Holati: is_published={test_set.is_published}, is_premium={test_set.is_premium}"
            )
        )
