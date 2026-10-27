"""Django management command: Tarix fanidan namunaviy test topshiriqlari — Variant 1 (Milliy Sertifikat).

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
    python manage.py seed_tarix_milliy_variant_1
    python manage.py seed_tarix_milliy_variant_1 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import ensure_profile_for_user
from tests_app.models import (
    Subject, TestSet, Question, AnswerOption, QuestionGroup, GroupOption, SubQuestion
)


TEST_TITLE = "Tarix fanidan namunaviy test topshiriqlari — Variant 1 (Milliy Sertifikat)"
TEST_DESC = (
    "Tarix fanidan namunaviy test topshiriqlari (Variant 1). "
    "32 ta test, 3 ta moslashtirish va 10 ta yozma ochiq topshiriq. Jami 45 ta topshiriq. "
    "Muallif: Sodiqov Shohjahon. Rasch IRT 70 ballik rasmiy baholash mezoni."
)


class Command(BaseCommand):
    help = "Tarix Milliy Sertifikat Variant 1 (45 ta topshiriq) ni yuklaydi."

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
                    "<p><b>1.</b> Quyidagilardan <b>nomuvofiqlik</b> saqlangan javobni aniqlang.</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Kiaksar - Midiya davlati podshosi", False),
                    ("B", "Artakserks - Fors davlati hukmdori", False),
                    ("C", "Diomed (Diadot)- Yunon-Baqtriya davlati podshosi", True),
                    ("D", "Nin - Ossuriya davlati podshosi", False),
                ],
            },
            # 2
            {
                "num": 2,
                "body": (
                    "<p><b>2.</b> Quyidagi hukmdorlar va ular bosib olgan hududlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "<b>1)</b> Kir II; <b>2)</b> Filipp II; <b>3)</b> Trayan; <b>4)</b> Kudzula Kadfiz.<br/>"
                    "<b>a)</b> Afg‘oniston va Kashmir;<br/>"
                    "<b>b)</b> Yangi Bobil podsholigi;<br/>"
                    "<b>c)</b> Yunoniston;<br/>"
                    "<b>d)</b> Suriya va Mesopotamiya."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1-d; 2-a; 3-c; 4-b", False),
                    ("B", "1-b; 2-c; 3-d; 4-a", True),
                    ("C", "1-a; 2-d; 3-b; 4-d", False),
                    ("D", "1-c; 2-b; 3-d; 4-a", False),
                ],
            },
            # 3
            {
                "num": 3,
                "body": (
                    "<p><b>3.</b> Uchinchi salib yurishida ishtirok etgan Angliya qirolini aniqlang.</p>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "Genrix II", False),
                    ("B", "Ioann", False),
                    ("C", "Richard II", False),
                    ("D", "Richard I", True),
                ],
            },
            # 4
            {
                "num": 4,
                "body": (
                    "<p><b>4.</b> Quyidagi tarixiy voqealar (ma’lumotlar) to‘g‘ri xronologik ketma-ketlikda ko‘rsatilgan javobni toping.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Suvaysh kanali ochildi;<br/>"
                    "2) Usmonli davlatida ikki palatali parlament joriy etildi;<br/>"
                    "3) Tabrizda Eron tarixida birinchi marta parlament – Masjlis tuzildi;<br/>"
                    "4) Xitoy Markaziy Vyetnam ustidan rasmiy hukmronligidan voz kechdi;<br/>"
                    "5) Italiyada cherkov va davlat munosabatini tartibga soluvchi qonun qabul qilindi;<br/>"
                    "6) Rossiyada rangli metallurgiya sohasida “Med” jamiyati tashkil etildi."
                    "</div>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "2, 1, 3, 4, 6, 5", False),
                    ("B", "4, 6, 5, 2, 1, 3", False),
                    ("C", "5, 2, 1, 3, 4, 6", False),
                    ("D", "1, 5, 2, 4, 3, 6", True),
                ],
            },
            # 5
            {
                "num": 5,
                "body": (
                    "<p><b>5.</b> Quyida berilgan atamalar va ularning izohi to‘g‘ri moslashtirilgan javobni toping.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px;'>"
                    "<tr style='background:rgba(148,163,184,0.1);'><th style='padding:6px;border:1px solid #cbd5e1;'>Atama</th><th style='padding:6px;border:1px solid #cbd5e1;'>Izoh</th></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>I. Simpozium</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>a)</b> milliy valutaning amaldagi kurs bo‘yicha boshqa xorijiy valutalarga erkin va cheklanmagan miqdorda almashtirilishi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>II. Tolerantlik</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>b)</b> iqtisodiyotda ishlab chiqarishning nisbatan mo‘tadil pasayishini yoki iqtisodiy o‘sish sur’atlarining sekinlashuvini anglatadi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>III. Konvertatsiya</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>c)</b> biror ilmiy masala bo‘yicha o‘tkaziladigan xalqaro ilmiy kengash</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>IV. Sekta</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>d)</b> ichki bozorni ma’lum cheklovlar orqali chet el raqobatidan himoya qilishga qaratilgan siyosat</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>V. Proteksionizm</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>e)</b> o‘zgalarning fikr-g‘oyalari, e’tiqodi, his-tuyg‘ulari, turmush tarzi va xulq-atvoriga nisbatan sabr-toqatli bo‘lish</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'>—</td><td style='padding:5px;border:1px solid #cbd5e1;'><b>f)</b> binoning ikki qismini birlashtiruvchi usti yopiq uzun yo‘lak</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'>—</td><td style='padding:5px;border:1px solid #cbd5e1;'><b>g)</b> kishilarning ko‘pincha tor, o‘ta mutaassib va ekstremistik qarashlar doirasida birlashishi</td></tr>"
                    "</table>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1-c, 2-e, 3-a, 4-g, 5-d", True),
                    ("B", "1-e, 2-d, 3-b, 4-a, 5-f", False),
                    ("C", "1-f, 2-g, 3-d, 4-a, 5-c", False),
                    ("D", "1-c, 2-a, 3-b, 4-g, 5-d", False),
                ],
            },
            # 6
            {
                "num": 6,
                "body": (
                    "<p><b>6.</b> Quyida berilgan atamalar va ularning izohi to‘g‘ri moslashtirilgan javobni toping.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px;'>"
                    "<tr style='background:rgba(148,163,184,0.1);'><th style='padding:6px;border:1px solid #cbd5e1;'>Atama</th><th style='padding:6px;border:1px solid #cbd5e1;'>Izoh</th></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>I. Eserlar</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>a)</b> biror-bir partiyaning parlamentdagi a’zolari yoki siyosiy partiya ichidagi alohida guruh</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>II. Avtonomiya</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>b)</b> ba’zi muassasa, tashkilotda rahbarlik ishini olib borish maqsadida saylanadigan kollegial organ</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>III. Byuro</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>c)</b> bir irqning boshqalardan ustunligini da’vo qiluvchi, millatlar o‘rtasida nizo urug‘ini sochuvchi ashaddiy millatchilik</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>IV. Shovinizm</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>d)</b> sovetlar ichida dehqonlar manfaatini himoya qiluvchi guruh</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'><b>V. Fraksiya</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>e)</b> davlatlarning o‘z siyosiy mustaqilligini muayyan doirada cheklash yo‘li bilan yagona ittifoqqa birlashuvi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'>—</td><td style='padding:5px;border:1px solid #cbd5e1;'><b>f)</b> biror-bir hududning qonun bilan chegaralangan davlat hokimiyatini mustaqil amalga oshirish huquqi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;'>—</td><td style='padding:5px;border:1px solid #cbd5e1;'><b>g)</b> hech qanday cheklovlarsiz, hukmron sinfning kuchiga tayanib ish yurituvchi hokimiyat</td></tr>"
                    "</table>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1-a, 2-e, 3-c, 4-d, 5-b", False),
                    ("B", "1-b, 2-c, 3-f, 4-a, 5-e", False),
                    ("C", "1-d, 2-f, 3-b, 4-c, 5-a", True),
                    ("D", "1-c, 2-g, 3-a, 4-b, 5-f", False),
                ],
            },
            # 7
            {
                "num": 7,
                "body": (
                    "<p><b>7. Tarixiy shaxsni aniqlang.</b><br/>"
                    "U Fransiyaning 1917-1920-yillarda Bosh vaziri bo‘lib xizmat qilgan va Birinchi jahon urushining oxirida mamlakatni g‘alabaga yetaklashda muhim rol o‘ynagan. "
                    "U “Urushning otasi” sifatida tanilgan, chunki uning rahbarligi ostida Fransiya urushni muvaffaqiyatli yakunladi. "
                    "Shuningdek, u Parij tinchlik shartnomasining asosiy tashabbuskorlaridan biri bo‘lib, 1919-yilda Versal tinchlik shartnomasini imzolashda faol ishtirok etdi. "
                    "U o‘zining jo‘shqin nutqlari bilan ajralib turar va o‘ta qiziqqonligi tufayli “yo‘lbars” degan laqab olgan edi.</p>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "E. Dalade", False),
                    ("B", "J. Klemanso", True),
                    ("C", "E. Errio", False),
                    ("D", "A. Puankare", False),
                ],
            },
            # 8
            {
                "num": 8,
                "body": (
                    "<p><b>8. Tarixiy shaxsni aniqlang.</b><br/>"
                    "U Buxoroda amirlik tuzumi ag‘darilgach, 1920-yil kuziga kelib G‘arbiy Buxoro hududida qizil armiyaga qarshi milliy ozodlik kurashi olib borgan. "
                    "Uning rahbarligida Buxoro, Karmana va Nurota viloyatlarida o‘nlab qo‘rboshi guruhlari faoliyat ko‘rsatgan. "
                    "Uning qo‘l ostida Buxoroning g‘arbiy qismida 20 nafar qo‘rboshi birlashgan. U Qizilqumda qizil askarlarga qarshi bo‘lgan janglarning birida 1924-yilning oxirida halok bo‘lgan.</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Ibrohimbek", False),
                    ("B", "Mulla Nafis", False),
                    ("C", "Junaidxon", False),
                    ("D", "Mulla Abdulqahhor", True),
                ],
            },
            # 9
            {
                "num": 9,
                "body": (
                    "<p><b>9. Tarixiy davlatni aniqlang.</b><br/>"
                    "Ushbu davlatning saltanat darajasidagi rivoji va taraqqiyoti X asrning ikkinchi yarmiga to‘g‘ri keladi. "
                    "Bu davlat Markaziy Osiyoda barpo etilgan ilk turkiy-islomiy davlatdir. Ushbu davlat Sharqiy Turkiston, "
                    "Yettisuv va Tyanshanning janubiy yonbag‘rida tashkil topgan. Bu davlatning barpo etilishida qarluq, chigil va yag‘mo qabilalari yetakchi rol o‘ynagan.</p>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "O‘g‘uzlar davlati", False),
                    ("B", "Xorazmshohlar davlati", False),
                    ("C", "Qoraxoniylar davlati", True),
                    ("D", "Somoniylar davlati", False),
                ],
            },
            # 10
            {
                "num": 10,
                "body": (
                    "<p><b>10.</b> Quyida berilgan ma’lumotlar qaysi tarixiy davlat haqida ekanligini aniqlang.<br/>"
                    "Ushbu davlat Koreya yarimorolining shimoli-g‘arbida joylashgan. I–II asrlarda qudratli davlatga aylangan. "
                    "Uning asoschisi Tonmyon bo‘lgan. Dastlabki poytaxti Kunneson qal’asi bo‘lgan, V asrda Pxenyanga ko‘chirilgan. "
                    "Ushbu davlat qo‘shini o‘zining jangovarligi bilan ajralib turgan. IV asr boshlarida xitoyliklarni o‘z hududidan "
                    "batamom surib chiqaradi va har jihatdan rivojlangan qudratli davlatga aylanadi.</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Koryo qirolligi", False),
                    ("B", "Silla qirolligi", False),
                    ("C", "Pekche qirolligi", False),
                    ("D", "Koguryo qirolligi", True),
                ],
            },
            # 11
            {
                "num": 11,
                "body": (
                    "<p><b>11.</b> Quyida berilgan qaysi davlatlar <b>1949-yili tuzilgan Yevropa Kengashi (YK)ning ta’sischilari</b> bo‘lgan?</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Fransiya; 2) GFR; 3) Shvetsiya; 4) Italiya; 5) Turkiya; 6) Niderlandlar qirolligi; 7) SSSR; 8) Daniya; 9) Lyuksemburg; 10) Buyuk Britaniya; 11) Irlandiya; 12) Portugaliya; 13) Belgiya; 14) Norvegiya"
                    "</div>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "1, 3, 4, 6, 8, 9, 10, 11, 13, 14", True),
                    ("B", "2, 3, 4, 5, 6, 7, 8, 9, 11, 12", False),
                    ("C", "2, 3, 5, 6, 8, 9, 10, 11, 12, 13", False),
                    ("D", "1, 4, 5, 6, 7, 9, 10, 11, 12, 14", False),
                ],
            },
            # 12
            {
                "num": 12,
                "body": (
                    "<p><b>12.</b> Qadimgi Rimda dastlab faxriy harbiy unvon, keyinchalik mutlaq hukmdorga tegishli nom qanday atalgan?</p>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "Diktator", False),
                    ("B", "Imperator", True),
                    ("C", "Senat", False),
                    ("D", "Konsul", False),
                ],
            },
            # 13
            {
                "num": 13,
                "body": (
                    "<p><b>13.</b> Quyida berilgan ma’lumotlardan qaysi biri <b>XIX asr O‘rta Osiyo davlatlari tarixi</b> uchun xos?</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Buxoro xonligida Abdullaxon II rasman xonlik taxtini egalladi", False),
                    ("B", "Xiva xoni Said Muhammadxon qoraqalpoq xalqining qattiq bosimi ostida ularga o‘zini o‘zi boshqarish huquqini berdi", True),
                    ("C", "Norbo‘tabiy Qo‘qon xonlaridan birinchi bo‘lib xonlikning fals deb atalgan o‘z pulini zarb ettirdi", False),
                    ("D", "Xiva xoni Abulg‘oziy Bahodirxon katta qo‘shin bilan yurish qilib, Buxoro atroflarini ikki bor talon-taroj qildi", False),
                ],
            },
            # 14
            {
                "num": 14,
                "body": (
                    "<p><b>14.</b> 1920-yil 10-martda bo‘lgan Turkiston ASSR MIK va Turkiston Kompartiyasining birlashgan kengashida "
                    "qaysi atoqli partiya xodimlari <b>Sovet Sotsialistik Respublikalarining O‘rta Osiyo federatsiyasini</b> tuzish taklifi bilan chiqqan?</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Fayzulla Xo‘jayev; 2) Sanjar Asfandiyorov; 3) Qalandar Odinayev; 4) N.Paskutskiy; 5) Sultonbek Xo‘janov; 6) Turor Risqulov."
                    "</div>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "1, 3, 5", False),
                    ("B", "2, 3, 4", False),
                    ("C", "2, 4, 5", True),
                    ("D", "1, 4, 6", False),
                ],
            },
            # 15
            {
                "num": 15,
                "body": (
                    "<p><b>15.</b> Arab xalifaligi davrida VIII asrda Tunisda tashkil etilgan ilm dargohini aniqlang.</p>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "“Zaytuna”", True),
                    ("B", "“Bayt ul-hikma”", False),
                    ("C", "“Al-Azhar”", False),
                    ("D", "“Qaroviyun”", False),
                ],
            },
            # 16
            {
                "num": 16,
                "body": (
                    "<p><b>16.</b> Quyidagi tarixiy voqealar (ma’lumotlar) to‘g‘ri xronologik ketma-ketlikda ko‘rsatilgan javobni toping.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Sharqiy Dashti Qipchoqda O‘zbek ulusi davlati tuzildi;<br/>"
                    "2) Amir Nasrullo harbiy islohot o‘tkazdi;<br/>"
                    "3) Shohrux Mirzo nevarasi Sulton Muhammad isyonini bostirish vaqtida Ray viloyatida olamdan o‘tdi;<br/>"
                    "4) Bobur Mirzo Kobul viloyatida o‘z hokimiyatini o‘rnatdi;<br/>"
                    "5) Farg‘ona vodiysi Buxoro tarkibidan ajralib chiqdi;<br/>"
                    "6) Imomqulixon Toshkentni qozoqlardan ozod etdi."
                    "</div>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "2, 1, 3, 4, 6, 5", False),
                    ("B", "4, 6, 5, 2, 1, 3", False),
                    ("C", "5, 2, 1, 3, 4, 6", False),
                    ("D", "1, 3, 4, 6, 5, 2", True),
                ],
            },
            # 17 (Xarita)
            {
                "num": 17,
                "body": (
                    "<p><b>17.</b> XIX asr oxiri – XX asr boshlarida G‘arbiy Sudan, Senegal va Nil daryosi havzasi "
                    "xaritada ko‘rsatilgan qaysi davlatlar o‘rtasida <b>raqobat maydoniga</b> aylangan?</p>"
                    "<div style='margin:12px 0;padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;text-align:center;'>"
                    "<div style='display:inline-block;border:1px solid #94a3b8;border-radius:8px;padding:10px;background:#fff;max-width:420px;width:100%;'>"
                    "<p style='font-size:12px;color:#475569;margin-bottom:8px;'><b>YEVROPA XARITASI (Belgilangan davlatlar):</b></p>"
                    "<p style='font-size:13px;line-height:1.8;text-align:left;padding:0 15px;'>"
                    "📍 <b>1</b> — Buyuk Britaniya<br/>"
                    "📍 <b>2</b> — Ispaniya / Marokash<br/>"
                    "📍 <b>3</b> — Fransiya<br/>"
                    "📍 <b>4</b> — Rossiya imperiyasi<br/>"
                    "📍 <b>5</b> — Italiya<br/>"
                    "📍 <b>6</b> — Germaniya"
                    "</p>"
                    "</div>"
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1, 3, 6", True),
                    ("B", "2, 4, 6", False),
                    ("C", "1, 2, 5", False),
                    ("D", "2, 3, 4", False),
                ],
            },
            # 18
            {
                "num": 18,
                "body": (
                    "<p><b>18.</b> Tarixiy voqea va uning natijasi o‘zaro mos berilgan qatorlarni aniqlang.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px;'>"
                    "<tr style='background:rgba(148,163,184,0.1);'><th style='padding:6px;border:1px solid #cbd5e1;'>№</th><th style='padding:6px;border:1px solid #cbd5e1;'>Voqea</th><th style='padding:6px;border:1px solid #cbd5e1;'>Natija</th></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>1</td><td style='padding:5px;border:1px solid #cbd5e1;'>Avstriya-Vengriya taxt vorisi Frans Ferdinand o‘ldirildi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Birinchi jahon urushi boshlandi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>2</td><td style='padding:5px;border:1px solid #cbd5e1;'>1904-1905-yillarda Rus-yapon urushi sodir bo‘ldi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Saxalin orolining janubiy qismi Yaponiyaga berildi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>3</td><td style='padding:5px;border:1px solid #cbd5e1;'>Subhonqulixon Buxoro taxtiga o‘tirdi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Mahmudbiy otaliq Balxda o‘zini xon deb e’lon qildi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>4</td><td style='padding:5px;border:1px solid #cbd5e1;'>Salohiddin Ayubiy 1187-yilda Quddusni salibchilardan tortib oldi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Ikkinchi salib yurishlari boshlandi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>5</td><td style='padding:5px;border:1px solid #cbd5e1;'>Fidel Kastro Kubada hokimiyat tepasiga keldi</td><td style='padding:5px;border:1px solid #cbd5e1;'>“Karib inqirozi” tugadi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>6</td><td style='padding:5px;border:1px solid #cbd5e1;'>Eron Islom Respublikasi prezidentligi lavozimiga Muhammad Hotamiy keldi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Eronda demokratik va tolerant jamiyat qurishga qaratilgan islohotlar boshlangan</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'>7</td><td style='padding:5px;border:1px solid #cbd5e1;'>1905-yilda Eron tarixida inqilob boshlandi</td><td style='padding:5px;border:1px solid #cbd5e1;'>Qojarlar, ruhoniylar, savdogarlar, hunarmandlar, zamindorlar va dehqonlar saylov huquqiga ega bo‘ldi</td></tr>"
                    "</table>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "1, 2, 3, 5", False),
                    ("B", "1, 3, 6, 7", False),
                    ("C", "1, 4, 5, 7", False),
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
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>a</b></td><td style='padding:5px;border:1px solid #cbd5e1;'>“dehqon” degan tushuncha o‘zining “qishloq hokimi”ni anglatuvchi asl ma’nosini yo‘qotdi</td><td style='padding:5px;border:1px solid #cbd5e1;'><b>b</b></td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>c</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>d</b></td><td style='padding:5px;border:1px solid #cbd5e1;'>Angliyada abolitsionizm shakllandi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>XIX</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>e</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>f</b></td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>g</b></td><td style='padding:5px;border:1px solid #cbd5e1;'>Surxondaryo viloyatining markazi Termiz shahrida Arxeologiya muzeyi ish boshladi</td><td style='padding:5px;border:1px solid #cbd5e1;'><b>h</b></td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>i</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>j</b></td><td style='padding:5px;border:1px solid #cbd5e1;'>“O‘ttiz yillik” urush bo‘lib o‘tdi</td></tr>"
                    "<tr><td style='padding:5px;border:1px solid #cbd5e1;text-align:center;'><b>IV</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>k</b></td><td style='padding:5px;border:1px solid #cbd5e1;'><b>l</b></td></tr>"
                    "</table>"
                    "<div style='margin-top:6px;font-size:11.5px;color:#475569;'>"
                    "<b>Ma’lumotlar:</b> 1) Qoraqum eshon madrasasi qurildi; 2) 2002-yil; 3) Subxonqulixon Balxni egallaydi; 4) XI-XII asrlar; 5) Imperializm atamasi keng iste’molga aylandi; 6) Xiva xonligi ikki marta Buxoro tomonidan bosib olingan; 7) XVI asr; 8) Polsha Yevroittifoqqa a’zo bo‘ldi; 9) XVII asr; 10) Yaponiyada yer egaligi munosabatlari o‘rnatildi; 11) Rim imperiyasi ikki qismga bo‘linib ketdi; 12) XVI asr; 13) Buxoro, Karki, Termiz, Kogonda Rossiya firmalari omborlari ochildi; 14) Afrig‘iylar poytaxtni Katga ko‘chirdi; 15) XIV asr; 16) Toshkent bekligi tashkil topdi; 17) XVII asr; 18) Hindiston shimolida turk va afg‘on qabilalari joylashuvi kuchaydi; 19) AQSH Gavayini anneksiya qilib, Filippinni bosib oldi."
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
                    "<text x='110' y='14' font-size='13' font-weight='600' fill='#0f172a' text-anchor='middle'>AQSH</text>"
                    "<text x='250' y='14' font-size='13' font-weight='600' fill='#0f172a' text-anchor='middle'>Yaponiya</text>"
                    "</svg>"
                    "<div style='margin-top:10px;text-align:left;'>"
                    "<p style='font-size:12px;color:#64748b;margin-bottom:6px;'><i>Davr: XIX asr II yarmi - XX asr boshlari</i></p>"
                    "<p style='font-size:12.5px;line-height:1.7;margin:0;'>"
                    "<b>a)</b> mamlakatda fuqarolar urushi bo‘lib o‘tdi;<br/>"
                    "<b>b)</b> yerni mayda bo‘laklarga bo‘linib ketishiga qarshi qonun qabul qilindi;<br/>"
                    "<b>c)</b> qullik bekor qilindi;<br/>"
                    "<b>d)</b> “Gomstedlar to‘g‘risida”gi qonun qabul qilindi;<br/>"
                    "<b>e)</b> mamlakatda yagona pul birligi – iyena joriy etildi;<br/>"
                    "<b>f)</b> Sanoatning yangi tarmoqlari – samolyotsozlik, elektrotexnika va kimyo paydo bo‘ldi;<br/>"
                    "<b>g)</b> 10 yillik qurollanish dasturini qabul qildi;<br/>"
                    "<b>h)</b> Puerto-Riko va Guam orollarini o‘zining yarimmustamlakasiga aylantirdi;<br/>"
                    "<b>i)</b> Koreya yarimorolini harbiy kuch bilan o‘ziga qo‘shib oldi;<br/>"
                    "<b>j)</b> Panamada Kolumbiyaga qarshi isyon tashkil etib, u yerda “qo‘g‘irchoq” hukumat tuzdi."
                    "</p>"
                    "</div>"
                    "</div>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "I-d, f, h, g; II-a, b, c, e; III-i", False),
                    ("B", "I-a, c, j, f; II-d, e, h, i; III-b", False),
                    ("C", "I-b, d, f, j; II-c, e, g, i; III-a", False),
                    ("D", "I-c, d, h, j; II-b, e, g, i; III-a", True),
                ],
            },
            # 21
            {
                "num": 21,
                "body": (
                    "<p><b>21.</b> Jaloliddin Manguberdi qaysi davlatlar hukmdorlarini mo‘g‘ullarga qarshi kurash yo‘lida "
                    "birlashtirish harakati behuda ketgan?</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Ko‘niya, Sultoniya, Misr, Dehli", False),
                    ("B", "Ko‘niya, Jazira, Damashq, Misr", True),
                    ("C", "Bog‘dod, Misr, Damashq, Dehli", False),
                    ("D", "Bog‘dod, Jazira, Basra, Kirmon", False),
                ],
            },
            # 22
            {
                "num": 22,
                "body": (
                    "<p><b>22.</b> 1878-yilda Berlin kongressida Turkiya to‘lashi lozim bo‘lgan tovonning katta qismi evaziga "
                    "Rossiyaga Kavkazning Botumi, Kars va Ardagan hududlari berilgan edi. <b>Qaysi shartnomaga ko‘ra, bu hududlar Turkiyaga qaytarib berilgan?</b></p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Sevr shartnomasi", False),
                    ("B", "Lozanna shartnomasi", False),
                    ("C", "Brest tinchlik shartnomasi", True),
                    ("D", "Versal tinchlik shartnomasi", False),
                ],
            },
            # 23
            {
                "num": 23,
                "body": (
                    "<p><b>23.</b> Quyidagilardan boshqalariga nisbatan <b>ENG AVVAL (a)</b> va <b>ENG KEYIN (b)</b> sodir bo‘lganlarini aniqlang.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Fransiya mustamlakasi Suriya o‘z mustaqilligini e’lon qildi;<br/>"
                    "2) Iordaniya G‘arbiy qirg‘oq bilan har qanday aloqani uzdi;<br/>"
                    "3) Eronda “Islom inqilobi” sodir bo‘ldi;<br/>"
                    "4) Portugaliya rivojlanishining iqtisodiy modeli avtarkiya bo‘lib qoldi;<br/>"
                    "5) Fransua Mitteran birinchi marta prezidentlik saylovlarida g‘olib bo‘ldi;<br/>"
                    "6) Janubiy Koreya Respublikasi tashkil topdi;<br/>"
                    "7) Pokistonda Respublika boshqaruv tizimi o‘rnatildi;<br/>"
                    "8) Husni Muborak Misr prezidenti etib saylandi."
                    "</div>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "a-2; b-7", False),
                    ("B", "a-6; b-3", False),
                    ("C", "a-1; b-2", True),
                    ("D", "a-8; b-4", False),
                ],
            },
            # 24
            {
                "num": 24,
                "body": (
                    "<p><b>24.</b> O‘zbekiston Respublikasida 2023-yil 9-iyulda bo‘lib o‘tgan prezidentlik saylovlarida "
                    "Shavkat Mirziyoyev qaysi siyosiy partiyalar tomonidan yagona nomzod qilib ko‘rsatilgan?</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) O‘zbekiston Liberal-demokratik partiyasi (O‘zLiDeP);<br/>"
                    "2) “Adolat” sotsial-demokratik partiyasi;<br/>"
                    "3) “Vatan taraqqiyoti” partiyasi;<br/>"
                    "4) “Milliy tiklanish” demokratik partiyasi;<br/>"
                    "5) “Fidokorlar” milliy demokratik partiyasi;<br/>"
                    "6) Xalq demokratik partiyasi."
                    "</div>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "2, 6", False),
                    ("B", "1, 3", False),
                    ("C", "4, 5", False),
                    ("D", "1, 4", True),
                ],
            },
            # 25
            {
                "num": 25,
                "body": (
                    "<p><b>25.</b> Amir Temur hukmronligi davrida Oq O‘rda va Xorazm hukmdorlari birlashib "
                    "Movarounnahrning qaysi hududlariga talonchilik yurishlarini amalga oshirgan?</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Toshkent; 2) Buxoro; 3) Jizzax; 4) Chorjo‘y; 5) Termiz; 6) Qarshi."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1, 3, 5", False),
                    ("B", "3, 5, 6", False),
                    ("C", "1, 4, 5", False),
                    ("D", "2, 4, 6", True),
                ],
            },
            # 26
            {
                "num": 26,
                "body": (
                    "<p><b>26.</b> Quyida keltirilganlar orasidan <b>XX asrning ikkinchi yarmida</b> tuzilgan xalqaro tashkilotlarni aniqlang.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Birlashgan Millatlar Tashkiloti (1945);<br/>"
                    "2) O‘zaro Iqtisodiy Yordam kengashi (1949);<br/>"
                    "3) Yevropa Iqtisodiy hamjamiyati (1957);<br/>"
                    "4) Millatlar Ligasi (1919);<br/>"
                    "5) Jahon savdo tashkiloti (1995);<br/>"
                    "6) Yevropa ko‘mir va po‘lat birlashmasi (1951);<br/>"
                    "7) Qo‘shilmaslik harakati (1961);<br/>"
                    "8) Mustaqil Davlatlar Hamdo‘stligi (1991);<br/>"
                    "9) Yevropa iqtisodiy hamkorlik tashkiloti (1948);<br/>"
                    "10) Shimoliy Atlantika Shartnomasi (1949);<br/>"
                    "11) Afrika Milliy Kongresi (1912);<br/>"
                    "12) Britaniya Millatlar Hamdo‘stligi (1931);<br/>"
                    "13) ASEAN (1967)."
                    "</div>"
                ),
                "diff": "hard",
                "options": [
                    ("A", "1, 3, 5, 7, 11", False),
                    ("B", "3, 6, 7, 8, 13", True),
                    ("C", "2, 4, 6, 10, 13", False),
                    ("D", "4, 7, 8, 9, 12", False),
                ],
            },
            # 27
            {
                "num": 27,
                "body": (
                    "<p><b>27.</b> Quyida berilgan davlatlardan <b>1977-yilda (a)</b> va <b>1979-yilda (b)</b> rasmiy nomi o‘zgarganlarini aniqlang.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Myanma; 2) Liviya; 3) Eron; 4) Efiopiya; 5) Tunis."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "a-2; b-3", True),
                    ("B", "a-1; b-3", False),
                    ("C", "a-1; b-4", False),
                    ("D", "a-2; b-5", False),
                ],
            },
            # 28
            {
                "num": 28,
                "body": (
                    "<p><b>28.</b> XIX asr ikkinchi yarmiga kelib Yaponiya hukmron doiralari qaysi masalaga chet davlatlarning "
                    "mamlakat ichki ishlariga aralashuvi xavfidan himoya qiluvchi <b>asosiy omil</b> sifatida qaragan?</p>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "Yaponiya xalqining imperator atrofida jipslashuvi", False),
                    ("B", "Chet davlatlarga Yaponiyani yopiq deb e’lon qilinishi", False),
                    ("C", "Ishlab chiqarishni sanoatlashtirish", True),
                    ("D", "Xristian dinini tarqalishini taqiqlash", False),
                ],
            },
            # 29
            {
                "num": 29,
                "body": (
                    "<p><b>29.</b> Quyidagi ma’lumotlarga mos yakuniy xulosalar (to‘g‘ri/noto‘g‘ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "<b>I.</b> Ikkinchi jahon urushidan keyin kapron, perlon, sintetik qatron kabi sun’iy tolalar ommaviy ishlab chiqarila boshlandi.<br/>"
                    "<b>II.</b> Ikkinchi jahon urushi davrida nemis va italyan qo‘shinlari egallagan Liviyaga BMT 1952-yil mustaqillik berdi.<br/>"
                    "<b>III.</b> Ikkinchi jahon urushi davrida Eshon Boboxon ibn Abdumajidxon boshchiligidagi vakillar ilk bor Saudiya Arabistoniga haj safariga yo‘l oldilar."
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "I-noto‘g‘ri; II-to‘g‘ri; III-noto‘g‘ri", False),
                    ("B", "I-to‘g‘ri; II-noto‘g‘ri; III-to‘g‘ri", True),
                    ("C", "I-noto‘g‘ri; II-noto‘g‘ri; III-to‘g‘ri", False),
                    ("D", "I-to‘g‘ri; II-noto‘g‘ri; III-noto‘g‘ri", False),
                ],
            },
            # 30
            {
                "num": 30,
                "body": (
                    "<p><b>30.</b> Asarlar va ularning mualliflari to‘g‘ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:1fr 1.2fr;gap:12px;margin:12px 0;'>"
                    "<div style='display:flex;flex-direction:column;gap:8px;justify-content:space-around;'>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>1.</b> “Mantiq ut-tayr”</div>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>2.</b> “Usuldagi tartibotlar”</div>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>3.</b> “Kafansiz ko‘milganlar”</div>"
                    "</div>"
                    "<div style='display:flex;flex-direction:column;gap:6px;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>a)</b> Mahmud az-Zamaxshariy</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>b)</b> Farididdin Attor</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>c)</b> Shuhrat</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>d)</b> Shukrullo</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>e)</b> Alisher Navoiy</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>f)</b> Abu Mansur al-Moturidiy</div>"
                    "</div>"
                    "</div>"
                ),
                "diff": "medium",
                "options": [
                    ("A", "1-b; 2-a; 3-d", True),
                    ("B", "1-e; 2-f; 3-c", False),
                    ("C", "1-e; 2-c; 3-d", False),
                    ("D", "1-b; 2-d; 3-a", False),
                ],
            },
            # 31
            {
                "num": 31,
                "body": (
                    "<p><b>31.</b> Chizmada nomi keltirilgan shaxslar va ularga tegishli ma’lumotlar to‘g‘ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:1fr 1.3fr;gap:12px;margin:12px 0;'>"
                    "<div style='display:flex;flex-direction:column;gap:8px;justify-content:space-around;'>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>1.</b> Tomas Nyukomen</div>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>2.</b> S. Arrenius</div>"
                    "<div style='border:1.5px solid #0284c7;border-radius:10px;padding:8px 10px;background:#f0f9ff;font-size:12.5px;text-align:center;'><b>3.</b> R. Virxov</div>"
                    "</div>"
                    "<div style='display:flex;flex-direction:column;gap:6px;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>a)</b> diazotlash reaksiyasini kashf qildi</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>b)</b> bug‘ mashinasini ixtiro qildi</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>c)</b> amyoba dizenteriyasini tug‘diruvchi mikrobni topdi</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>d)</b> elektrolit dissotsiatlash nazariyasini yaratdi</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>e)</b> bo‘g‘ma tug‘diruvchi mikrobni topdi</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#f8fafc;font-size:12px;'><b>f)</b> patologik anatomiya asoslarini yaratdi</div>"
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
                    "<p><b>32.</b> O‘zbekiston Respublikasining Qurolli Kuchlari beshta harbiy okrugdan iborat bo‘lib, "
                    "quyidagilar orasidan <b>Toshkent harbiy okrugiga</b> kiradigan viloyatlarni aniqlang.</p>"
                    "<div style='margin:8px 0;padding:8px 12px;background:rgba(148,163,184,0.08);border-radius:8px;'>"
                    "1) Jizzax viloyati; 2) Toshkent shahri; 3) Sirdaryo viloyati; 4) Samarqand viloyati; 5) Navoiy viloyati; 6) Toshkent viloyati."
                    "</div>"
                ),
                "diff": "easy",
                "options": [
                    ("A", "1, 2, 5", False),
                    ("B", "2, 4, 5", False),
                    ("C", "1, 2, 6", False),
                    ("D", "2, 3, 6", True),
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
            ("A", "Rappallo shartnomasi imzolandi."),
            ("B", "“Chinnigullar inqilobi” bo‘lib o‘tdi."),
            ("C", "“Postindustrial sivilizatsiya” atamasi muomalaga kiritildi."),
            ("D", "Lozanna shartnomasi imzolandi."),
            ("E", "Sevr shartnomasi imzolandi."),
            ("F", "Varshava shartnomasi tarqalib ketdi."),
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
            (33, "Berilgan voqealardan qaysi biri eng keyin sodir bo‘lgan?", "F"),
            (34, "Qaysi voqea natijasida Turkiyaning Diyorbakr viloyati Buyuk Britaniya ixtiyoriga o‘tgan?", "E"),
            (35, "Berilgan voqealardan qaysi biri Janubiy Yevropa mamlakatlari tarixiga aloqador?", "B"),
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
                "context": "Saljuqiylar davlati 1038-1308-yillarda mavjud bo‘lgan.",
                "sub": [
                    ("a", "Ushbu davlatning asoschisini yozing.", "To'g'rulbek"),
                    ("b", "Ushbu davlatning qaysi hukmdori Sharqiy Rim imperiyasini mag‘lub etgan?", "Alp Arslon"),
                ],
            },
            # 37
            {
                "num": 37,
                "context": "XX asr boshlarida AQSH prezidentlari monopoliyalarga qarshi kurash olib borgan.",
                "sub": [
                    ("a", "Ushbu davr AQSH tarixiga qanday nom bilan kirganligini yozing.", "Taraqqiyparvarlik davri"),
                    ("b", "Ushbu davrdagi qaysi AQSH prezidenti trestlarga qarshi ko‘plab sud jarayonini tashkil etgan?", "Teodor Ruzvelt"),
                ],
            },
            # 38
            {
                "num": 38,
                "context": "Ikkinchi jahon urushidan keyin Lotin Amerikasi mamlakatlari jamiyatni modernizatsiya qilishning optimal variantini izladilar.",
                "sub": [
                    ("a", "Ushbu davrda sanoat mahsulotlarining umumiy hajmi bo‘yicha Lotin Amerikasida birinchi o‘ringa chiqqan davlatni yozing.", "Meksika"),
                    ("b", "Hindu aholisiga nisbatan olib borilgan adolatsiz siyosat natijasida mintaqaning qaysi davlatlarida hindularning tartibsiz chiqishlari bo‘lib o‘tgan (3 ta davlat nomini yozing)?", "Ekvador, Boliviya, Peru"),
                ],
            },
            # 39
            {
                "num": 39,
                "context": (
                    "1990-yillari Yaponiyada bir necha koalitsion hukumatlar almashgandan so‘ng "
                    "1996-yil yanvarda LDP yana bir partiyali hukumat tuzishga erishdi."
                ),
                "sub": [
                    ("a", "Ushbu hukumatga boshchilik qilgan shaxsni aniqlang.", "Ryutaro Xasimoto"),
                    ("b", "Ushbu shaxs tashqi siyosatda qanday g‘oyani targ‘ib qilishga harakat qilgan?", "Yevroosiyochilik konsepsiyasi"),
                ],
            },
            # 40
            {
                "num": 40,
                "context": "Turon hududida «o‘rta asrlar» davri IV asr oxirlari hamda V asr o‘rtalaridan boshlangan.",
                "sub": [
                    ("a", "Ushbu davrda xalq qo‘zg‘olonlari natijasida arablarga qaram bo‘lib, o‘z mustaqilligini qo‘ldan boy bergan hududni yozing.", "Xorazm"),
                    ("b", "Ushbu hududda saljuqiylar hokimiyati o‘rnatilgunga qadar qaysi sulola hokimiyat tepasida bo‘lgan?", "Oltintoshiylar sulolasi"),
                ],
            },
            # 41
            {
                "num": 41,
                "context": (
                    "G‘aznaviylar davlati qudratli harbiy qo‘shinga ega edi. Oliy qo‘mondonlik hukmdorning ixtiyorida bo‘lgan. "
                    "Bosh qo‘mondon – … (a) sulolaning eng ishonchli vakili yoki shu xonadon a’zosi hisoblangan. Mahmud G‘aznaviyning davrida ushbu mansabni … (b) egallagan."
                ),
                "sub": [
                    ("a", "Nuqtalar o‘rniga mos keluvchi birinchi javobni (mansab nomini) yozing.", "Sipohsolor"),
                    ("b", "Nuqtalar o‘rniga mos keluvchi ikkinchi javobni (shaxs nomini) yozing.", "Muhammad Yusuf"),
                ],
            },
            # 42
            {
                "num": 42,
                "context": "Turkiston Muxtoriyati qizil askarlar tomonidan tor-mor etilishi natijasida Qo‘qon shahri butkul vayronaga aylantirildi.",
                "sub": [
                    ("a", "Ushbu shaharni obod qilish ishlarini boshlagan Minglar sulolasi vakilini yozing.", "Shohruxbiy"),
                    ("b", "Ushbu shaxs davlatni qanday unvon bilan boshqargan?", "Otaliq"),
                ],
            },
            # 43
            {
                "num": 43,
                "context": "Rus hukumati Xiva xonligiga qarshi olib boriladigan harbiy yurishga besh yil tayyorgarlik ko‘rdi.",
                "sub": [
                    ("a", "Xonlikka qilingan dastlabki hujumga kim boshchilik qilgan?", "Bekovich Cherkaskiy"),
                    ("b", "Qaysi shartnomaga binoan, Xiva xonligining mustaqilligi rus hukumati tomonidan tan olingan?", "Taxta shartnomasi"),
                ],
            },
            # 44
            {
                "num": 44,
                "context": (
                    "O‘rta Osiyoni hududiy chegaralab bo‘lish masalasi 1924-yil boshlaridan amalga oshirila boshlandi. "
                    "Turkiston va Buxoro Kompartiyalari Markaziy Komitetlari huzurida maxsus komissiyalar tuzildi."
                ),
                "sub": [
                    ("a", "Markaz kommunistlari tomonidan kimning fikri inkor etilib, uni «panturkizm», «panislomizm», «burjua millatchiligi va o‘ng og‘machiligi» deb baholadi?", "Turor Risqulov"),
                    ("b", "Turkiston yagona va butun, uning yaxlitligini buzish maqsadga muvofiq emas, deb ta’kidlagan shaxs kim edi?", "Sultonbek Xo'janov"),
                ],
            },
            # 45
            {
                "num": 45,
                "context": "Qo‘qon xonligida barcha yerlar davlat mulki edi.",
                "sub": [
                    ("a", "Xonlikda xususiy kishilarga sotish orqali vujudga keltirilgan yer egaligi shaklini yozing.", "mulki hur xolis"),
                    ("b", "Xonlikdagi harbiylarga berilgan yerlar qanday nom bilan atalgan?", "tanho yerlari"),
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
