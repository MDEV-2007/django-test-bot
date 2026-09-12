"""Django management command: Ona tili va adabiyot Milliy Sertifikat 45 talik mock testini yaratish.

Barcha to'g'ri javoblar, tahlillar, matnlar va namunaviy yozma javoblar rasmiy kalit bo'yicha to'liq kiritilgan.

Foydalanish:
    python manage.py seed_ona_tili_mock
    python manage.py seed_ona_tili_mock --force
    python manage.py seed_ona_tili_mock --today
"""
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "Ona Tili va Adabiyot — Milliy Sertifikat Namunaviy Mock Imtihon"
MOCK_DESC = (
    "Milliy sertifikat formati: fonetika, leksikologiya, morfologiya, sintaktik tahlil, "
    "publitsistik matn tahlili, badiiy matn («Baliqsiz hovuz»), mumtoz adabiyot (Uvaysiy g'azali), "
    "ochiq grammatik tahlil topshiriqlari va esse. Jami: 45 ta topshiriq."
)


class Command(BaseCommand):
    help = "Ona tili va adabiyot fanidan 45 talik Milliy Sertifikat mock imtihonini bazaga to'liq yuklaydi."

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help="Agar mavjud bo'lsa, eski testni o'chirib qayta yaratadi.",
        )
        parser.add_argument(
            '--today',
            action='store_true',
            help="Ertaga emas, aynan BUGUN soat 21:30 ga rejalashtirish.",
        )
        parser.add_argument(
            '--duration',
            type=int,
            default=120,
            help="Imtihon davomiyligi daqiqalarda (standart: 120 daqiqa).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get('force', False)
        for_today = options.get('today', False)
        duration = options.get('duration', 120)

        # Subject 'Ona tili' topish yoki yaratish
        subject = Subject.objects.filter(slug__in=['ona-tili', 'ona_tili']).first()
        if not subject:
            subject = Subject.objects.filter(name__icontains='ona tili').first()
        if not subject:
            subject, _ = Subject.objects.get_or_create(
                slug="ona-tili",
                defaults={
                    "name": "Ona tili",
                    "icon_name": "pen-line",
                    "color": "#10b981",
                    "order": 2,
                },
            )

        existing = TestSet.objects.filter(title=MOCK_TITLE).first()
        if existing:
            if force:
                self.stdout.write(f"Eski '{MOCK_TITLE}' (#{existing.id}) o'chirilmoqda...")
                existing.delete()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"'{MOCK_TITLE}' allaqachon mavjud (ID: {existing.id}). "
                        f"Qayta yaratish uchun --force bayrog'ini ishlating:\n"
                        f"python manage.py seed_ona_tili_mock --force"
                    )
                )
                return

        # Toshkent vaqti bilan 21:30
        from zoneinfo import ZoneInfo
        toshkent_tz = ZoneInfo("Asia/Tashkent")
        now = timezone.now().astimezone(toshkent_tz)
        target_day = now if for_today else (now + timezone.timedelta(days=1))
        scheduled_at = datetime(
            target_day.year, target_day.month, target_day.day, 21, 30, 0, tzinfo=toshkent_tz
        )

        test_set = TestSet.objects.create(
            title=MOCK_TITLE,
            description=MOCK_DESC,
            subject=subject,
            category="certificate",
            duration_minutes=duration,
            is_live_mock=True,
            scheduled_at=scheduled_at,
            is_published=True,
            is_premium=False,
            notify_all=True,
        )

        questions = []

        # Umumiy matnlar HTML bloklari
        text_passage_global = (
            "<div style='background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); "
            "border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; font-size: 13.5px; line-height: 1.65;'>"
            "<h4 style='margin: 0 0 8px 0; color: #10b981; font-weight: 700;'>MATNLI TOPSHIRIQ (18–22-SAVOLLAR)</h4>"
            "<p style='margin-bottom: 8px;'><b>1.</b> Global muammolar — umumbashariy hayot va taraqqiyot bilan bog’liq "
            "hozirgi zamon muammolari. Ular jumlasiga jahon termoyadro urushining oldini olish, xalqaro terrorchilikka qarshi "
            "kurashish va barcha xalqlar uchun tinchlikni ta’minlash, rivojlangan va rivojlanayotgan davlatlar o’rtasida "
            "ijtimoiy-iqtisodiy taraqqiyot darajasidagi tafovutni bartaraf etish, ochlik, qashshoqlik va savodsizlikni tugatish, "
            "rivojlanayotgan mamlakatlarda aholining tez sur’atlarda ko’payishini tartibga solish, atrof-muhit halokatli tarzda "
            "ifloslanib borayotganligining oldini olish; insoniyatni kerakli resurslar — oziq-ovqat, sanoat xomashyosi, "
            "elektr manbalari bilan ta’minlash, fan va texnikaning salbiy oqibatlariga yo’l qo’ymaslik kabilar kiradi. "
            "Global muammolar avvalo jahonda kechayotgan iqtisodiy, ijtimoiy-siyosiy, harbiy, ilmiy-texnologik, ijtimoiy-madaniy "
            "jarayonlarning umumbashariy ahamiyat kasb etishi natijasida yuzaga keladi.</p>"
            "<p style='margin-bottom: 8px;'><b>2.</b> Tabiatdan foydalanish — tabiiy resurslardan foydalanish, ularni muhofaza qilish "
            "va qayta tiklash bilan bog’liq inson faoliyati. Tabiatdan oqilona foydalanish — tabiiy boyliklardan me’yorida, ularni "
            "muhofaza qilish va qayta tiklashga, tabiiy muhitning sog’lom holatini saqlashga e’tibor bergan holda foydalanish. "
            "Tabiatdan nooqilona foydalanish — tabiiy muhit va uning resurslari holatining salbiy tomonga o’zgarib borishiga olib "
            "keladigan tabiatdan foydalanish. Ekologik muammolar — tabiatdan nooqilona foydalanish natijasida tabiiy muhit "
            "sifatining yomonlashishi. Ekologik siyosat — tabiiy muhitni muhofaza qilish va uni sog’lomlashtirishga, tabiiy "
            "resurslardan oqilona foydalanishga qaratilgan harakatlar tizimi.</p>"
            "<p style='margin-bottom: 0;'><b>3.</b> Global muammolarning bir turi bo’lgan chuchuk suv tanqisligi muammosi. "
            "Chuchuk suvning asosiy qismi Antarktida, Arktika va baland tog’lardagi muzliklarda to’plangan. Insoniyatning chuchuk "
            "suvga bo’lgan ehtiyojini qondiradigan asosiy manba daryolar bo’lib, ularning katta qismi aholi ancha siyrak yashaydigan "
            "sovuq va ekvatorial iqlimli hududlar bo’ylab oqadi va ulardan keng miqyosda foydalanish qiyindir. Quruqlikning uchdan "
            "bir qismidan ko’prog’ini egallaydigan qurg’oqchil hududlarda suv tanqisligi mavjud. Xususan, Shimoliy va Janubiy Afrika, "
            "Janubiy va Janubi-g’arbiy Osiyoda, shuningdek, O’zbekiston, Turkmaniston, Qozog’iston kabi Markaziy Osiyo davlatlarida "
            "bu muammo dolzarb hisoblanadi.</p>"
            "</div>"
        )

        badiiy_matn_hovuz = (
            "<div style='background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); "
            "border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; font-size: 13.5px; line-height: 1.65;'>"
            "<h4 style='margin: 0 0 8px 0; color: #10b981; font-weight: 700;'>BADIIY MATN TAHLILI (23–27-SAVOLLAR) — «BALIQSIZ HOVUZ»</h4>"
            "<p style='margin-bottom: 8px;'>Sharif Namozning qamoqdan chiqarilishi haqidagi xabarni olib kirganidan beri bu odamni "
            "Zohid yoqtirmay qolgan edi. Keyinroq bilsa, prokuror yordamchisi bilan yaqin aloqada bo’lgan bu tergovchini boshqalar ham "
            "unchalik xushlamas ekan. «O’zi chaqa olmaydi, ammo odamni seskantiradi, bu — suvilon», deb atasharkan uni. Uning qo’lida "
            "tayinli ishi ham yo’q. Hali u xonaga, hali bu xonaga kirib laqillashdan boshqa narsani bilmaydi. Uning odati shumi, "
            "yo gap o’g’irlab yuradimi — Zohid aniq aytolmaydi. Unga ma’lum bo’lgani — «Suvilon» kirishi bilan tilga qulf urmoq zarur. "
            "«Qo’shningni o’g’ri tutma, o’zingni ehtiyot qil», deb bejiz aytishmagan-da. Suvilonning suhbatidan bahramand bo’lish baxti "
            "bugun Zohidga ham nasib etgan ekan. Zohid eksgumatsiya xulosalarini o’qib o’tirganda u kirib keldi:</p>"
            "<p style='margin-bottom: 6px;'>— O’, yosh hamkasbim, ishdagi yutuqlar qalay, yaxshimi? — deb ko’rishdi.</p>"
            "<p style='margin-bottom: 6px;'>O’zidan ikki-uch yoshgina katta bu «yoshulli» hamkasbning lutfi Zohidning g’ashini keltirdi. "
            "«Boshimni qotirmay tezroq chiqib ketarmikan», degan o’yda ro’yxush bermay ko’rishib:</p>"
            "<p style='margin-bottom: 6px;'>— <b>1. Yuribmiz, tuproqdan tashqarida</b>, — deb qo’ydi.</p>"
            "<p style='margin-bottom: 6px;'>— Qoyilman, chiroyli gap aytdingiz, — dedi Suvilon kulib. — Bizning sohamizda tuproqdan "
            "tashqarida yurish katta boylik! Ishdan gapiring, ishlar qalay?</p>"
            "<p style='margin-bottom: 6px;'>— Bo’lyapti.</p>"
            "<p style='margin-bottom: 6px;'>— Tezroq bo’ldirishga harakat qilavering. Lekin sizga ham havasim keladiki, zo’r ishlarni "
            "sizga ishonib topshirishdi. Eplasangiz, tez ko’tarilib ketasiz. Achinishimning sababi shuki, hali g’orsiz. "
            "Eplay olmasangiz, fisht, — u «kelgan joyingizga qarab jo’naysiz», degan ma’noda hushtak chalib qo’ydi. — Lekin siz "
            "tushkunlikka tushmang. Qiynalsangiz mana biz bor. Tortinmang. Sizga shahar «ugro»sidagi Soliyev yordam beryaptimi? "
            "Omadingiz yo’q ekan, lanch u odam, ishni rezinkaday cho’zadi. O’rdakka o’xshab, tumshug’ini balchiqqa tiqib olib, loy titkilaydi. "
            "Cho’zsa ham puxta ishlaydi. Xom ishdan puxtasi durust-da.</p>"
            "<p style='margin-bottom: 0;'>— <b>2. Yanglishyapsiz</b>. Bizning ishimizda eng birinchi galda tezlik turadi. "
            "Bilib qo’ying, yangi bo’lgan eng kattamiz boshlig’imizni suhbatga chaqirib «sust ishlayapsizlar» deganmish. "
            "Tushundingizmi? Yangi rahbarning talabi yangicha bo’ladi. «Sust ishlayapsizlar» debdimi, demak, bizdan operativlik "
            "talab qilinadi. Ishni cho’zdingmi, tamom, joyni bo’shataver. Mana, siz: bo’yningizda ikkita qotillik turibdi. "
            "Ikkita retsidivistni ushlabsiz. Nima qilmoqchisiz? Nima qilardim, tergov-da.</p>"
            "</div>"
        )

        mumtoz_gazal = (
            "<div style='background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); "
            "border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; font-size: 13.5px; line-height: 1.65;'>"
            "<h4 style='margin: 0 0 8px 0; color: #10b981; font-weight: 700;'>MUMTOZ MATN TAHLILI (28–32-SAVOLLAR) — UVAJSON G’AZALI</h4>"
            "<p style='font-style: italic; margin-bottom: 0;'>"
            "Ki bulbul nola, afg’on aylamakni mendin o’rgandi,<br/>"
            "Vujudin sham’i so’zon aylamakni mendin o’rgandi.<br/><br/>"
            "Borib sahrog’a, qon bag’rimni izhor ayladim bir kun,<br/>"
            "Falak bag’rin qizil qon aylamakni mendin o’rgandi.<br/><br/>"
            "Shafaq xun bo’lg’usi, dil, yor mehri gar nihon bo’lsa,<br/>"
            "Samo gulguni domon aylamakni mendin o’rgandi.<br/><br/>"
            "Ko’rub abru hiloling, jon fido qildim jamolingga,<br/>"
            "Ul oy husniga qurbon aylamakni mendin o’rgandi.<br/><br/>"
            "Fig’onkim, g’am tarog’i xasta ko’nglum posh-posh etti,<br/>"
            "Sanam zulfin parishon aylamakni mendin o’rgandi.<br/><br/>"
            "Seni izlarman andoqkim, quyosh diydorin izlarida,<br/>"
            "Kezib tun-kun, shitobon aylamakni mendin o’rgandi.<br/><br/>"
            "Qanoat qildi Uvaysiy, topti dildin gavhari nazmin:<br/>"
            "Sadaf ham durri g’alton aylamakni mendin o’rgandi."
            "</p>"
            "</div>"
        )

        # -------------------------------------------------------------
        # I QISM: TEST TOPSHIRIQLARI (1 - 32)
        # -------------------------------------------------------------
        mcq_data = [
            # 1
            {
                "body": "Imloviy jihatdan to’g’ri yozilgan so’zlar qatorini aniqlang:",
                "explanation": "A qatordagi barcha so'zlar to'g'ri yozilgan: Huriliqo, hoshiya, hojatbaror. (B da hilviramoq, inobat; C da izzattalab, kuyinmoq; D da qalqon).",
                "options": [
                    ("A", "Huriliqo, hoshiya, hojatbaror", True),
                    ("B", "Hiliviramoq, inobot, jabha", False),
                    ("C", "Ichkilik, izzatalab, kuyunmoq", False),
                    ("D", "Qarillamoq, qolqon, qo’lma-qo'l", False),
                ],
            },
            # 2
            {
                "body": "Imloviy jihatdan to’g’ri yozilgan so’zlarni aniqlang:",
                "explanation": "C qatordagi so'zlar to'g'ri yozilgan: Yuqumli, vaholanki, uchastkovoy. (A da yopaloq; B da yalang'och; D da vaalaykumassalom, uchuriq).",
                "options": [
                    ("A", "Tushkun, uyirma, yapoloq", False),
                    ("B", "Yalonĝoch, sho'rtumshiq, shokolad", False),
                    ("C", "Yuqumli, vaholanki, uchastkovoy", True),
                    ("D", "Vaalaykum assalom, uchuruq, taqiqlovchi", False),
                ],
            },
            # 3
            {
                "body": "\"Dog’\" so'zi qaysi gapda ko'chma ma'noda qo'llanmagan?",
                "explanation": "\"Oyda ham dog' bor\" gapida dog' so'zi o'z ma'nosida (qoramtir, xira iz) qo'llangan.",
                "options": [
                    ("A", "Qo'rqoqlik dog’ini o'lim ham yuvolmaydi", False),
                    ("B", "Yaxshi so'z – yurak yog'i, yomon so’z – yurak dog’i", False),
                    ("C", "Oyda ham dog’ bor", True),
                    ("D", "Bu gap bizning sha’nimizga dog’ bo’lishi mumkin", False),
                ],
            },
            # 4
            {
                "body": "O’zaro ma’nodoshlik hosil qila oladigan so’zlar qatorini aniqlang:",
                "explanation": "Ozod, erkin, mustaqil — o'zaro to'liq sinonim (ma'nodosh) so'zlar hisoblanadi.",
                "options": [
                    ("A", "Ozod, erkin, mustaqil", True),
                    ("B", "Soqchi, poyloqchi, qo’riqlash", False),
                    ("C", "Istamoq, xohish, tilak", False),
                    ("D", "Yorug’, dang’illama, keng", False),
                ],
            },
            # 5
            {
                "body": "Qaysi gapda qo’shimcha qo’llash bilan bog’liq uslubiy xatolik mavjud?",
                "explanation": "B variantdagi «siyosiy ishlarni to’qson foizini» birikmasida qaratqich kelishigi (-ning) o'rniga tushum kelishigi (-ni) noto'g'ri qo'llangan («ishlarning to'qson foizini»).",
                "options": [
                    ("A", "Amir bizning hovlimizdan shunchalar bexabar ekanki, ko’rib hayrat barmog’ini tishladim.", False),
                    ("B", "Ammo siyosiy ishlarni to’qson foizini kengashga qo’yib bir ulushini qilichga qoldirishga o’rgangan Temurbek boshqacha o’ylardi.", True),
                    ("C", "Yurtning daxlsizligini ta’minlaydigan bu qonunlar mamlakat hukmdorining o’ng qo’lidadir.", False),
                    ("D", "Yomonlarning qoshida yalinish yaxshilarning ishi emasligini bilsa ham atayin shunday qildi bu badbaxt inson.", False),
                ],
            },
            # 6
            {
                "body": "Qaysi gapda \"bo’shamoq\" so’zi yumshamoq ma’nosida kelgan?",
                "explanation": "«Olma archilib, yuvilib, suvga solingach, ancha bo’shab qoldi» gapida olma to'qimalarining yumshashi, eziluvchan bo'lishi nazarda tutilgan.",
                "options": [
                    ("A", "Hosildan bo’shab ko’kragiga shamol tekkan dalalarda ajoyib fayz bor edi.", False),
                    ("B", "Jihozlar olib chiqilgach, uy ancha bo’shab qoldi.", False),
                    ("C", "Olma archilib, yuvilib, suvga solingach, ancha bo’shab qoldi.", True),
                    ("D", "Idishdagi suvlarni bo’shatib, uyga olib kir bolam, hozir tuman tushadi.", False),
                ],
            },
            # 7
            {
                "body": (
                    "Qaysi gapda nuqtalar o’rnida ketma-ket so’z yasovchi, sintaktik shakl yasovchi va "
                    "lug’aviy shakl yasovchi qo’shimchalar qo’llaniladi?"
                ),
                "explanation": "B javobda: hayot-iy (so'z yasovchi -iy), mehnat-ni (sintaktik shakl yasovchi -ni), yayra-b (ravishdosh / lug'aviy shakl yasovchi -b).",
                "options": [
                    ("A", "Yunoniston… faylasuf Arastu o’g’lini chaqir… shu so’z…ni aytibdi.", False),
                    ("B", "Inson o’zining hayot.. kuchini mehnat qilish jarayonida ko’rsatmasa, mehnat… quvonch va baxt manbayi deb bilmasa, yayra... ishlamasa bu mehnat uni azoblaydi.", True),
                    ("C", "O’z jon…ni qutqarmoq uchun do’stlaringga xiyonat qilmoqchi….. sofdil qushlardan ko’ra xiyonat… do’stning o’lganing yaxshi.", False),
                    ("D", "Gurs…gan oyoq tovush…ì eshitilib, eshik sharaqlab ochildi va uyga birin-ketin uchta kishi shosh…. kirdi.", False),
                ],
            },
            # 8
            {
                "body": (
                    "<p>Har uchala parchada ham ishtirok etgan fe’l shakllarini aniqlang:</p>"
                    "<div style='background: rgba(100,116,139,0.06); padding: 10px 14px; border-radius: 8px; margin: 10px 0; font-size: 13.5px; line-height: 1.6;'>"
                    "<b>1)</b> Paxta va zig’ir tolasidan tayyorlangan matolar namlab yoki suv sepib, yaxshi quritmay dazmollanadi.<br/>"
                    "<b>2)</b> Chollar kulgudan qotib qoldilar, ularning burishgan yuzlari ruhlanib, ko’zlarini kulgu namladi.<br/>"
                    "<b>3)</b> Gapirgan vaqtida ovozi xuddi ichidan chiqqanday guldurab, jaranglab eshitilardi."
                    "</div>"
                    "<p style='margin-top:8px; font-size: 13px;'><i>1. Taqlid so’zdan yasalgan fe’l | 2. Sof fe’l | 3. Sifatdosh shakli | 4. O’tgan zamon fe'li | 5. Otdan yasalgan yasama fe’l</i></p>"
                ),
                "explanation": "Har uchala parchada: 2 — sof fe'l (dazmollanadi, namladi, eshitilardi), 3 — sifatdosh (tayyorlangan, burishgan, gapirgan), 5 — otdan yasalgan yasama fe'l (nam-la-b, ruh-lan-ib / nam-la-di, jarang-la-b). To'g'ri javob: D (2, 3, 5).",
                "options": [
                    ("A", "1, 2, 3", False),
                    ("B", "2, 3, 4", False),
                    ("C", "5, 1, 3", False),
                    ("D", "2, 3, 5", True),
                ],
            },
            # 9
            {
                "body": (
                    "<p>Berilgan gapda ishtirok etgan ko’makchi qanday mazmuniy munosabatni ifodalagan?</p>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 8px 0; padding: 6px 12px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Avtobus bilan to’ppa-to'g'ri shaharga borib kelishga nima yetsin.»"
                    "</blockquote>"
                ),
                "explanation": "Gapdagi «bilan» ko'makchisi harakatni amalga oshirish vositasini (avtobus vositasida) bildirib kelgan.",
                "options": [
                    ("A", "Yo’nalish ma’nosida", False),
                    ("B", "Vosita ma’nosida", True),
                    ("C", "Mavzu ma’nosida", False),
                    ("D", "Qiyoslash ma’nosida", False),
                ],
            },
            # 10
            {
                "body": (
                    "<p>Berilgan gap haqidagi to’g’ri hukmni aniqlang:</p>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 8px 0; padding: 6px 12px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Yurtimiz o’g’il-qizlarining o’tkazilayotgan tadbirlarda faol ishtirok etishi yaxshi natijalarga olib kelmoqda.»"
                    "</blockquote>"
                ),
                "explanation": "Gapning egasi «ishtirok etishi» (harakat nomi bilan ifodalangan), unga tobelangan «faol» sifatlovchi aniqlovchisi bitishuv yo'li bilan tobelangan.",
                "options": [
                    ("A", "Qaralmishlar faqat ega vazifasini bajargan", False),
                    ("B", "Sifatlovchi aniqlovchi egaga bitishuv usulida tobelangan", True),
                    ("C", "Aniqlanmishlar kesimga faqat bilvosita tobelangan", False),
                    ("D", "Ot bilan ifodalangan aniqlovchi faqat bir o’rinda qatnashgan", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Gapdagi so’zlarning mazmuniy va grammatik jihatdan bog’lanishi to’g’ri ko’rsatilgan javobni aniqlang:</p>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 8px 0; padding: 6px 12px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Uydan chiqib ketish maqsadida shoshilib yurdi. Birdan temir darvoza oldida kuzatib turgan shubhali kishiga ko’zi tushdi-yu, qo’rqqanidan ortiga qayrildi.»"
                    "</blockquote>"
                ),
                "explanation": "«Temir darvoza» va «shubhali kishi» birikmalari grammatik va mazmuniy jihatdan bitishuv usulida to'g'ri bog'langan.",
                "options": [
                    ("A", "Uy maqsadida, shoshilib qayrildi", False),
                    ("B", "Qo’rqqanidan qayrildi, birdan chiqib ketish", False),
                    ("C", "Temir darvoza, shubhali kishi", True),
                    ("D", "Maqsadi oldida, kuzatgan darvoza", False),
                ],
            },
            # 12
            {
                "body": (
                    "<p>Qaysi gaplarda tire o’zaro bir xil punktuatsion qoida asosida qo’yilgan?</p>"
                    "<div style='background: rgba(100,116,139,0.06); padding: 10px 14px; border-radius: 8px; margin: 10px 0; font-size: 13.5px; line-height: 1.6;'>"
                    "1. Uning qo’lidan kelmaydigan ishning o’zi yo’q: duradgorlik, ustachilik, suvoqchilik — hammasini eplaydi.<br/>"
                    "2. Vatan — ruhimda uyg’ongan ism.<br/>"
                    "3. ”Ta’lim olmoqdan hech vaqt yuz o’girmangiz!” — dedi Navoiy.<br/>"
                    "4. Ruhim — vatanida gullagan chechak.<br/>"
                    "5. Eling tinch — sen tinch."
                    "</div>"
                ),
                "explanation": "2- va 4-gaplarda tire bir xil punktuatsion qoidaga ko'ra: ot bilan ifodalangan ega va ot-kesim orasida qo'yilgan.",
                "options": [
                    ("A", "1 va 3", False),
                    ("B", "2 va 4", True),
                    ("C", "1 va 5", False),
                    ("D", "3 va 2", False),
                ],
            },
            # 13
            {
                "body": (
                    "<p>She’riy parcha haqidagi to’g’ri hukmni aniqlang:</p>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 8px 0; padding: 6px 12px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Mahobat birla chiqdi g’or ichidin,<br/>"
                    "Balodek gumbazi davvor ichidin.»"
                    "</blockquote>"
                ),
                "explanation": "Qofiyadosh so'zlar: g'or / davvor. Qofiyaning asosiy undoshi (raviy) — \"R\" tovushi. «ichidin» esa radif hisoblanadi.",
                "options": [
                    ("A", "Mutlaq va muqayyad qofiya qo’llangan", False),
                    ("B", "”R” undoshi raviy bo’lib kelgan", True),
                    ("C", "Yoyiq va yig’iq radif qo’llangan", False),
                    ("D", "”N” raviy bo’lib kelgan", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>She’riy parcha haqidagi to’g’ri hukmni aniqlang:</p>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 8px 0; padding: 6px 12px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Ayyub sifat balosiga sobir bo’lg’ay,<br/>"
                    "Har ne qilsang oshiq qilg’il, parvardigor.»"
                    "</blockquote>"
                ),
                "explanation": "Baytda Ayyub payg'ambarning sabr-bardoshi tarixiy/afsonaviy siymosiga ishora qilingani uchun Talmeh san'ati qo'llangan.",
                "options": [
                    ("A", "Talmeh san’ati qo’llangan", True),
                    ("B", "Oshiq orqali tashbeh yuzaga kelgan", False),
                    ("C", "Tashxis san’ati qo’llangan", False),
                    ("D", "Tardid san’ati aks etgan", False),
                ],
            },
            # 15
            {
                "body": "\"Ikkiyuzlamachi dallol\" obrazi qaysi asarda keltirilgan?",
                "explanation": "O'tkir Hoshimovning «Dunyoning ishlari» qissasida ikkiyuzlamachi dallol obrazi qalamga olingan.",
                "options": [
                    ("A", "”Hellados”", False),
                    ("B", "”Qorako’z majnun”", False),
                    ("C", "”Hayotga muhabbat”", False),
                    ("D", "”Dunyoning ishlari”", True),
                ],
            },
            # 16
            {
                "body": "\"Dunyoning ishlari\" asarida quyidagi qaysi voqea qalamga olinmagan?",
                "explanation": "«Dunyoning ishlari» asarida gapiradigan obihayot suv tasviri mavjud emas.",
                "options": [
                    ("A", "Hikoyachining bolaligida butun badaniga yara chiqqanida davolagan vrach tasvirlangan.", False),
                    ("B", "Gapiradigan obihayot suv tasviri tasvirlangan.", True),
                    ("C", "Suratda dengizchilarning kokildor shapkasini kiygan qop-qora bola jilmayib turishi tasvirlangan.", False),
                    ("D", "Mushukni muz bilan urgan bola tasvirlanadi.", False),
                ],
            },
            # 17
            {
                "body": "\"Ruhlar isyoni\" asarida keltirilgan xato ma’lumotni aniqlang:",
                "explanation": "Erkin Vohidovning «Ruhlar isyoni» dostonida bu dunyo 73 ta payg'ambarni ko'rgani haqidagi ma'lumot xato ko'rsatilgan (asarda 124 ming payg'ambar haqidagi an'analar va boshqa ko'rsatkichlar tahlil qilinadi).",
                "options": [
                    ("A", "Navoiy aytadi: «Zulmat aro ko’p izladim yo’limni, Men o’zimni qildim ado yengolmadim zulmni.»", False),
                    ("B", "Bu dunyo 73 ta payg’ambarni ko’rganligi tasvirlangan.", True),
                    ("C", "Asarda Shohjahon toju taxtdan to’yganligi aytiladi.", False),
                    ("D", "Bu dunyodagi odil yagona hakam vaqt ekanligi asarda aytib o’tiladi.", False),
                ],
            },
            # 18
            {
                "body": f"{text_passage_global}<p><b>18.</b> Matn mazmuniga mos to’g’ri ifodalangan ma’lumotni aniqlang:</p>",
                "explanation": "Matnning 1-bandida ta'kidlangan: «Global muammolar butun jahonni qamrab olgan, hayot va taraqqiyot bilan bog’liq hozirgi zamon muammolari».",
                "options": [
                    ("A", "Ekologik muammolarning salbiy oqibatlarga yuz tutishiga sabab insonlardir.", False),
                    ("B", "Global muammolarga faqatgina tabiat bilan bog’liq muammolar kiradi.", False),
                    ("C", "Global muammolar butun jahonni qamrab olgan, hayot va taraqqiyot bilan bog’liq hozirgi zamon muammolari.", True),
                    ("D", "Global muammolarga yagona sabab aholining tez sur’atlarda ko’payishidir.", False),
                ],
            },
            # 19
            {
                "body": f"{text_passage_global}<p><b>19.</b> Raqamlab ko’rsatilgan qaysi matn bo’lagining mazmuniy tuzilishida uslubiy xatolik yuzaga kelgan?</p>",
                "explanation": "Matn bo'lagining mazmuniy tuzilishi tahlili bo'yicha to'g'ri javob: D.",
                "options": [
                    ("A", "1", False),
                    ("B", "2", False),
                    ("C", "3", False),
                    ("D", "4", True),
                ],
            },
            # 20
            {
                "body": f"{text_passage_global}<p><b>20.</b> Matn mazmunida aks etgan ma’lumotni aniqlang:</p>",
                "explanation": "A, B, C variantlardagi barcha ta'riflar matndagi asl jumlalardan qisman yoki mazmunan buzib keltirilgan, shu sababli barcha variantlarda javoblar xato izohlangan (D).",
                "options": [
                    ("A", "Tabiatdan nooqilona foydalanish natijasida tabiiy muhit sifatining o’zgarmasligi vujudga keladi.", False),
                    ("B", "Tabiiy resurslardan foydalanish, ularni muhofaza qilish va qayta tiklash bilan bog’liq iqtisodiy faoliyat.", False),
                    ("C", "Tabiiy boyliklardan me’yorida, ularni muhofaza qilish va qayta tiklashga, tabiiy muhitning sog’lom holatini saqlashga e’tibor bergan holda foydalanmaslik — tabiatdan nooqilona foydalanish demakdir.", False),
                    ("D", "Barcha variantlarda javoblar xato izohlangan.", True),
                ],
            },
            # 21
            {
                "body": f"{text_passage_global}<p><b>21.</b> Matn mazmuniga mos to’g’ri shakllantirilgan gapni aniqlang:</p>",
                "explanation": "3-xatboshida aynan shunday deyilgan: «Quruqlikning uchdan bir qismidan ko’prog’ini egallaydigan qurg’oqchil hududlarda suv tanqisligi mavjud».",
                "options": [
                    ("A", "Insoniyatning chuchuk suvga bo’lgan ehtiyojini qondiradigan asosiy manba yomg’irlar ekanligi isbotlangan.", False),
                    ("B", "Chuchuk suvning asosiy qismi faqatgina Arktika va baland tog’lardagi muzliklarda to’plangan.", False),
                    ("C", "Quruqlikning uchdan bir qismidan ko’prog’ini egallaydigan qurg’oqchil hududlarda suv tanqisligi mavjud.", True),
                    ("D", "O’zbekistonda Orol dengizining qurigan tubini qayta chuchuk suv bilan ta’minlash ishlari olib borilmoqda.", False),
                ],
            },
            # 22
            {
                "body": f"{text_passage_global}<p><b>22.</b> Matn mazmuniga mos to’g’ri shakllantirilgan fikrni aniqlang:</p>",
                "explanation": "Matn 2-bandida: «Tabiatdan foydalanish — tabiiy resurslardan foydalanish, ularni muhofaza qilish va qayta tiklash bilan bog’liq inson faoliyati» deb to'g'ri keltirilgan.",
                "options": [
                    ("A", "Bir xalq tinchligini ta’minlash ham global muammoning bir turi hisoblanadi.", False),
                    ("B", "Tabiiy resurslardan foydalanish, ularni muhofaza qilish va qayta tiklash bilan bog’liq inson faoliyati.", True),
                    ("C", "Chuchuk suv tanqisligi Markaziy Osiyoda kuzatilmaydi.", False),
                    ("D", "Chuchuk suvdan foydalanish keng miqyosdagi qiyinchilikni yuzaga keltiradi.", False),
                ],
            },
            # 23
            {
                "body": f"{badiiy_matn_hovuz}<p><b>23.</b> Asar nomi (\"Baliqsiz hovuz\") orqali qanday badiiy maqsad ifoda etilgan?</p>",
                "explanation": "«Baliqsiz hovuz» ramziy sarlavha bo'lib, unda tashkilot/tizimda haqiqiy yetuk mutaxassislar va adolatli xodimlarning yo'qligi badiiy umumlashtirilgan.",
                "options": [
                    ("A", "Baliqning hovuzda yo’qligi to’g’ridan-to’g’ri nazarda tutilgan.", False),
                    ("B", "Hovuz orqali butun tizim/muhit tasvirlangan bo’lib, unda asl yetuk mutaxassislar — haqiqiy rahbar va xodimlarning yo’qligi ramziy ifodalangan.", True),
                    ("C", "Hovuzda baliq bo’lmasligi tasvirlangan.", False),
                    ("D", "Barcha javoblar to’g’ri izohlangan.", False),
                ],
            },
            # 24
            {
                "body": f"{badiiy_matn_hovuz}<p><b>24.</b> \"Suvilon\" obraziga mos ta’rif berilgan javobni aniqlang:</p>",
                "explanation": "Parchada bu tergovchining faqat «Suvilon» laqabi aytilgan, uning asl ismi keltirilmagan.",
                "options": [
                    ("A", "Suvilon — laqab bo’lib, asl ismi Zohid", False),
                    ("B", "Sharif Namozovning laqabi Suvilon", False),
                    ("C", "Asl ismi asarda qayd etilmagan xodim", True),
                    ("D", "Suvilon asl ismi bo’lib, familiyasi Soliyev", False),
                ],
            },
            # 25
            {
                "body": f"{badiiy_matn_hovuz}<p><b>25.</b> Zohidga mos ta’rif berilmagan javobni aniqlang:</p>",
                "explanation": "Zohidning eksgumatsiya xulosalarini o'qishi emas, balki Suvilonning kirib kelib luqma tashlashi uning g'ashini keltirgan.",
                "options": [
                    ("A", "Suvilonni Zohid yoqtirmas edi.", False),
                    ("B", "Zohidning eksgumatsiya xulosalarini o’qishi g’ashini keltirar edi.", True),
                    ("C", "Suvilon bilan Zohid bir idorada hamkasb.", False),
                    ("D", "Zohid «qo’shningni o’g’ri tutma, o’zingni ehtiyot qil» maqolini Suvilonga nisbatan ich-ichidan qo’llaydi.", False),
                ],
            },
            # 26
            {
                "body": f"{badiiy_matn_hovuz}<p><b>26.</b> \"1\" raqami bilan ajratilgan jumla haqida to’g’ri ma’lumotni aniqlang: (<i>«— 1. Yuribmiz, tuproqdan tashqarida, — deb qo’ydi»</i>)</p>",
                "explanation": "Zohid bu so'zni suhbatdoshiga ro'yxush bermay, uni yoqtirmasligini bildirish va tezroq chiqib ketishini istab aytgan.",
                "options": [
                    ("A", "O’limdan qutulgani sababli shunday ibora qo’llanadi.", False),
                    ("B", "Jumla Suvilon tomonidan aytiladi.", False),
                    ("C", "Zohid bu aytgan so’zi orqali Suvilonga ro’yxush bermayotganini va uni xushlamasligini namoyon etgan.", True),
                    ("D", "Zohidning shiori bo’lgan bu jumla faqat do’stlarga nisbatan ishlatilardi.", False),
                ],
            },
            # 27
            {
                "body": f"{badiiy_matn_hovuz}<p><b>27.</b> \"2\" raqami bilan ajratib yozilgan so’zda (\"Yanglishyapsiz\") qanday ma’no ifodalangan?</p>",
                "explanation": "«Yanglishyapsiz» so'zi suhbatdoshining fikriga ochiq e'tiroz bildirish va unga qo'shilmaslikni anglatadi.",
                "options": [
                    ("A", "Suhbatdoshning fikriga e’tiroz bildirish, qo’shilmaslik", True),
                    ("B", "Fikrni dalillash va tasdiqlash", False),
                    ("C", "Kibr orqali ustunlik ko'rsatish", False),
                    ("D", "Ta’na, malomat", False),
                ],
            },
            # 28
            {
                "body": f"{mumtoz_gazal}<p><b>28.</b> G’azal matlasi haqidagi to’g’ri hukmni aniqlang:</p>",
                "explanation": "Matlada bulbul nola qilishni, vujud esa yonuvchi shamga aylanishni oshiqning cheksiz dardi orqali o'rganganligi mubolag'a bilan tasvirlangan.",
                "options": [
                    ("A", "Shoir bulbul orqali o’z bolasi dardida yig’laganligini bayon etyapti.", False),
                    ("B", "Bulbul nola qilishni, vujud esa yonuvchi shamga aylanishni oshiqdan o’rganganligi mubolag’ali ifodalangan.", True),
                    ("C", "Shoir bulbul orqali barcha insonlarning chekkan dardini aytib o’tadi.", False),
                    ("D", "Bu baytda \"sham’i so’zon\" birikmasi faqat o’z ma’nosida qo’llangan.", False),
                ],
            },
            # 29
            {
                "body": f"{mumtoz_gazal}<p><b>29.</b> Ikkinchi bayt haqida to’g’ri hukmni aniqlang: (<i>«Borib sahrog’a, qon bag’rimni izhor ayladim bir kun, Falak bag’rin qizil qon aylamakni mendin o’rgandi.»</i>)</p>",
                "explanation": "Shoir o'z dardli qon bag'rini sahroga borib ochgach, osmon (falak) ham bag'rini qizil qon qilishni oshiqdan o'rganganligi tasvirlangan.",
                "options": [
                    ("A", "Shoir sahroga borsa, sahro ham qip-qizil qon ekanligini ko’radi.", False),
                    ("B", "Shoir sahroga bir kun borib o'z qon bag’rini izhor aylagach, falak ham bag'rini qizil qon aylashni oshiqdan o’rgangan.", True),
                    ("C", "Falak bag’ri qip-qizil qon bo’lishining sababi sahroni ko’rganligidir.", False),
                    ("D", "Bu baytda sahro ham, falak ham qizil qon bo’lishni faqat bir-biridan o’rgangan.", False),
                ],
            },
            # 30
            {
                "body": f"{mumtoz_gazal}<p><b>30.</b> To’rtinchi bayt mazmuni to’g’ri izohlangan javobni aniqlang: (<i>«Ko’rub abru hiloling, jon fido qildim jamolingga, Ul oy husniga qurbon aylamakni mendin o’rgandi.»</i>)</p>",
                "explanation": "Shoir yorining hilol qoshini ko'rib unga jonini fido qilganini, hatto osmondagi oy ham o'z husniga qurbon bo'lishni oshiqdan o'rganganini aytadi.",
                "options": [
                    ("A", "Shoir yangi chiqqan oyning jamoliga jon fido qilganligini aytadi.", False),
                    ("B", "Oy uyalishni shoirdan o’rganganligi ta’kidlangan.", False),
                    ("C", "Shoir yorining hiloldek qoshini ko’rib jamoliga jon fido qilganini, osmondagi oy ham o’z husniga qurbon bo’lishni oshiqdan o’rganganini aytadi.", True),
                    ("D", "Shoirning sevgan yori husnidan hatto oy ham o’zini xijolatda qurbon qiladi.", False),
                ],
            },
            # 31
            {
                "body": f"{mumtoz_gazal}<p><b>31.</b> G’azalda quyidagi qaysi mazmun yoki o’xshatish mavjud emas?</p>",
                "explanation": "G'azalda bulbulning gulzor ichida o'z bolasiga kuylashi haqida hech qanday fikr uchramaydi.",
                "options": [
                    ("A", "Shoirning ko’nglini g’am tarog’i parishon va chok-chok etganligi.", False),
                    ("B", "Quyoshning kecha va kunduz yor diydorini izlab shitob bilan kezishi oshiqdan o’rgangani.", False),
                    ("C", "Bulbul gulzor ichida o’z bolasiga atab kuylashni oshiqdan o’rganganligi.", True),
                    ("D", "Sadaf gavhar hosil qilishni shoir qalbining qanoatidan o’rganganligi.", False),
                ],
            },
            # 32
            {
                "body": f"{mumtoz_gazal}<p><b>32.</b> Maqta haqidagi to’g’ri hukmni aniqlang: (<i>«Qanoat qildi Uvaysiy, topti dildin gavhari nazmin: Sadaf ham durri g’alton aylamakni mendin o’rgandi.»</i>)</p>",
                "explanation": "Uvaysiy o'z qanoatli ko'nglidan she'riyat gavharini kashf etgani va hatto sadaf ham dumaloq dur hosil qilishni shoiradan o'rganganligi ta'kidlangan.",
                "options": [
                    ("A", "Sadaf ham durri g’alton (dumaloq inju) qilishni Uvaysiyning qanoatli ko'nglidagi nazm gavharidan o’rganganligi ifodalangan.", True),
                    ("B", "Bu baytda sadaf har doim ham durlar yetishtira olmasligi ta’kidlangan.", False),
                    ("C", "Qanoat qilgan inson faqatgina sahroda yashashi kerakligi aytiladi.", False),
                    ("D", "Durni faqat dengizchilar topishi mumkinligi uqtiriladi.", False),
                ],
            },
        ]

        for i, item in enumerate(mcq_data, start=1):
            q = Question.objects.create(
                body=item["body"],
                question_type="single_choice",
                category="certificate",
                difficulty="medium",
                subject=subject,
                points=1,
                explanation=item.get("explanation", ""),
            )
            for opt_label, opt_text, is_corr in item["options"]:
                AnswerOption.objects.create(
                    question=q,
                    text=f"{opt_label}) {opt_text}",
                    is_correct=is_corr,
                )
            questions.append(q)

        # -------------------------------------------------------------
        # II QISM: GRAMMATIK VA SINTAKTIK TAHLIL TOPSHIRIQLARI (33 - 44)
        # -------------------------------------------------------------
        open_questions_data = [
            # 33
            {
                "body": (
                    "<b>33-topshiriq. Sintaktik tahlil</b><br/>"
                    "Quyidagi gapni sintaktik jihatdan tahlil qiling va gap turini aniqlang:<br/>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Oltin bilan olib bo’lmas qolgan ko’ngilni.»"
                    "</blockquote>"
                ),
                "ref_answer": "Shaxsi noma'lum gap (Shaxsi nomalum gap)",
                "explanation": "Gapning egasi yo'q va uni aniqlash imkoni yo'q, kesimi bo'lmas fe'li bilan ifodalangan bir tarkibli shaxsi noma'lum gap.",
                "subs": None,
            },
            # 34
            {
                "body": (
                    "<b>34-topshiriq. Sintaktik tahlil</b><br/>"
                    "Quyidagi gapni sintaktik jihatdan tahlil qiling va gap turini aniqlang:<br/>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Afsuski, rejadagi ishlarni ko’ngildagidek bajarmadingiz.»"
                    "</blockquote>"
                ),
                "ref_answer": "Egasi yashiringan gap (Shaxsi ma'lum gap / Egasi yashiringan gap)",
                "explanation": "Kesimdagi shaxs-son qo'shimchasidan (-ngiz) ega (siz) aniq bilinib turadi, shuning uchun bu egasi yashiringan (shaxsi ma'lum) gapdir.",
                "subs": None,
            },
            # 35
            {
                "body": (
                    "<b>35-topshiriq. Sintaktik tahlil</b><br/>"
                    "Quyidagi dialogik nutqdagi javob gapning turini aniqlang:<br/>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "— Sen metroda borasanmi?<br/>"
                    "— Aslo."
                    "</blockquote>"
                ),
                "ref_answer": "Inkorni bildirgan so'z-gap (Inkor so'z-gap / So'z-gap)",
                "explanation": "«Aslo» so'zi alohida bo'laklarga ajralmaydi va inkor munosabatini ifodalovchi so'z-gap hisoblanadi.",
                "subs": None,
            },
            # 36
            {
                "body": (
                    "<b>36-topshiriq. Leksik tahlil (Ma'nodoshlik)</b><br/>"
                    "Har uchala gapdagi ajratib ko'rsatilgan so’zlarga ma’nodosh bo’la oluvchi <b>umumiy so’zni</b> yozing:<br/>"
                    "<div style='background: rgba(100,116,139,0.06); padding: 10px 14px; border-radius: 8px; margin: 10px 0; font-size: 13.5px; line-height: 1.6;'>"
                    "1. Uzoqdan kelayotgan ovoz juda ham <u>baland</u> eshitildi.<br/>"
                    "2. U do’stini juda ham <u>yaxshi</u> ko’rar edi.<br/>"
                    "3. Nonning zuvalasi <u>pishiq</u> bo’lsa, non tandirdan oqmaydi."
                    "</div>"
                ),
                "ref_answer": "Qattiq",
                "explanation": "«Qattiq» so'zi uchala o'rinda ham sinonim bo'la oladi: qattiq eshitildi (baland), qattiq ko'rar edi (juda yaxshi), qattiq bo'lsa (pishiq).",
                "subs": None,
            },
            # 37
            {
                "body": (
                    "<b>37-topshiriq. Punktuatsion tahlil</b><br/>"
                    "Berilgan gapda qo’llanishi lozim bo’lgan tinish belgilarining ketma-ketligini yozing:<br/>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Uning qo’lidan kelmaydigan ish yo’q duradgorligu suvoqchiligu chilangarligu ustachilik hammasini eplaydi»"
                    "</blockquote>"
                ),
                "ref_answer": "Uning qo'lidan kelmaydigan ish yo'q: duradgorlig-u, chilangarlig-u, suvoqchilig-u ustachilik — hammasini eplaydi. (Ikki nuqta, vergul, vergul, tire)",
                "explanation": "Umumlashtiruvchi so'zdan keyin ikki nuqta (:), uyushiq bo'laklar orasida vergul (,), umumlashtiruvchi so'zdan oldin tire (—) qo'yiladi.",
                "subs": None,
            },
            # 38
            {
                "body": (
                    "<b>38-topshiriq. Uslubiy tahlil</b><br/>"
                    "Gapda qaysi qo’shimchaning qo’llanishi bilan bog’liq uslubiy xato kuzatilgan?<br/>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Vatan, istiqlol, ma’naviyat… Bu so’zlar inson ongidagi eng buyuk tushunchalarni ifodalovchi purhikmat so’zlardir. "
                    "O’zbekning mungli ko’zlarida shodlik, qadoq qo’llariga qut-baraka ulashgan Istiqlol emasmi?!»"
                    "</blockquote>"
                ),
                "ref_answer": "-da qo'shimchasi (-da kelishik qo'shimchasi / o'rin-payt kelishigi)",
                "explanation": "«ko'zlarida shodlik... ulashgan» emas, balki jo'nalish kelishigidagi «ko'zlariga shodlik ulashgan» bo'lishi lozim edi.",
                "subs": None,
            },
            # 39
            {
                "body": (
                    "<b>39-topshiriq. Sintaktik tahlil (Uyushiq bo'laklar)</b><br/>"
                    "Gapni sintaktik tahlil qiling va qaysi bo’laklar uyushganligini yozing:<br/>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Sizning bu hayotda orzularingiz, ko’zlagan maqsadingiz, qiladigan ishlaringiz ko’p, lekin hech qachon unutmangki, "
                    "sizning eng buyuk, eng muqaddas vazifangiz yurtimiz istiqlolini, xalqimiz ozodligini ko’z qorachig’iday asrash, uning xavfsizligini himoyalashdir.»"
                    "</blockquote>"
                ),
                "ref_answer": "Aniqlovchi, ega, kesim, to'ldiruvchi (Egalar: orzularingiz, maqsadingiz, ishlaringiz; Aniqlovchilar: eng buyuk, eng muqaddas; To'ldiruvchilar: istiqlolini, ozodligini; Kesimlar: asrash, himoyalashdir)",
                "explanation": "Gapda ega, aniqlovchi, to'ldiruvchi va kesim bo'laklari uyushgan.",
                "subs": None,
            },
            # 40
            {
                "body": (
                    "<b>40-topshiriq. Sintaktik aloqalar tahlili</b><br/>"
                    "Gapdagi so’zlarning mazmuniy va grammatik jihatdan bog’lanishini tahlil qiling va savollarga javob bering:<br/>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Tongdagi go’zalligingni menga ko’z-ko’z qilganingda, oy kabi to’lib borayotgan munavvar <u>jamolingni</u>, baxtingni, quvonchingni ko’rganimda mening yuragim hayajondan yayrab ketadi.»"
                    "</blockquote>"
                ),
                "ref_answer": "a) Aniqlovchi (munavvar); b) To'ldiruvchi (baxtingni, quvonchingni)",
                "explanation": "a) «jamolingni» so'ziga tobelangan so'z — munavvar (aniqlovchi); b) «jamolingni» so'zi bilan teng bog'langan uyushiq bo'laklar — baxtingni, quvonchingni (to'ldiruvchi).",
                "subs": [
                    ("a", "Ajratib ko’rsatilgan («jamolingni») so’zga tobelanib bog’langan so’zni yozing:", "Aniqlovchi (munavvar / oy kabi to'lib borayotgan munavvar)"),
                    ("b", "Ajratib ko’rsatilgan so’z bilan teng munosabatda bo’lgan gap bo’laklarini yozing:", "To'ldiruvchi (baxtingni, quvonchingni)"),
                ],
            },
            # 41
            {
                "body": (
                    "<b>41-topshiriq. Qo'shma gap sintaksisi</b><br/>"
                    "Berilgan sodda gaplarni grammatik jihatdan to’g’ri bog’lang va savollarga javob bering:<br/>"
                    "<div style='background: rgba(100,116,139,0.06); padding: 10px 14px; border-radius: 8px; margin: 10px 0; font-size: 13.5px; line-height: 1.6;'>"
                    "1. Ikkinchi masala ancha jiddiy.<br/>"
                    "2. U maxsus o’rganishni talab qiladi."
                    "</div>"
                ),
                "ref_answer": "a) Shuning uchun (chunki / shu sababli); b) Ergashgan qo'shma gap",
                "explanation": "a) Gaplar «shuning uchun» (yoki «chunki», «shu sababli») ko'makchili bog'lovchisi yordamida bog'lanadi; b) Natijada sabab-natija munosabatli ergashgan qo'shma gap hosil bo'ladi.",
                "subs": [
                    ("a", "Ikkala gapni qanday grammatik vosita yordamida bog’lash mumkin?", "Shuning uchun (chunki / shu sababli)"),
                    ("b", "Natijada qo’shma gapning qaysi turi vujudga keladi?", "Ergashgan qo'shma gap (sabab ergash gapli)"),
                ],
            },
            # 42
            {
                "body": (
                    "<b>42-topshiriq. Mumtoz she'r ilmi (Qofiya tahlili)</b><br/>"
                    "Berilgan she’riy parchaning qofiyasini tahlil qiling va savollarga javob bering:<br/>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Kishikim faqr ko’yida talabkori qanoatdur,<br/>"
                    "Zamiriĝa oning makshuf asrori qanoatdur.»"
                    "</blockquote>"
                ),
                "ref_answer": "a) \"R\" raviy (talabkori / asrori); b) Mutlaq qofiya",
                "explanation": "Qofiyadosh so'zlar: talabkori / asrori. Asosiy qofiya undoshi (raviy) — «R», «qanoatdur» radif, raviydan keyin «i» vasl unlisi kelgani sababli bu mutlaq qofiyadir.",
                "subs": [
                    ("a", "Qofiyadosh so’zlardagi raviyni yozing:", "\"R\" undoshi (raviy)"),
                    ("b", "Raviyning o’rniga ko’ra qofiyaning qaysi turi hisoblanadi?", "Mutlaq qofiya"),
                ],
            },
            # 43
            {
                "body": (
                    "<b>43-topshiriq. Badiiy san'atlar tahlili</b><br/>"
                    "Berilgan baytdagi she’riy san’at(lar)ni aniqlang va yozing:<br/>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Vasl uyin obod qildim, buzdi hijron oqibat,<br/>"
                    "Seli g’amdin bu imorat bo’ldi vayron oqibat.»"
                    "</blockquote>"
                ),
                "ref_answer": "Tazod, Tanosub, Tashbeh / Istiora (obod va buzdi/vayron — tazod; uy, obod, imorat, vayron — tanosub)",
                "explanation": "Baytda «obod» va «buzdi/vayron» ziddiyat orqali Tazod san'atini, «uy, obod, imorat, vayron» munosabatdosh so'zlari orqali Tanosub san'atini, «vasl uyi», «g'am seli» orqali Istiora san'atini hosil qilgan.",
                "subs": None,
            },
            # 44
            {
                "body": (
                    "<b>44-topshiriq. Mumtoz matn mazmuniy tahlili</b><br/>"
                    "Quyidagi qit’aning mazmunini tahlil qiling va asosiy g’oyasini yozing:<br/>"
                    "<blockquote style='border-left: 3px solid #10b981; margin: 10px 0; padding: 8px 14px; font-style: italic; background: rgba(16,185,129,0.05);'>"
                    "«Jahon ganjig’a shoh erur ajdaho<br/>"
                    "Ki, o’tlar sochar qahri hangomida.<br/>"
                    "Aning komi birla tirilmak erur,<br/>"
                    "Maosh aylamak ajdaho komida.»"
                    "</blockquote>"
                ),
                "ref_answer": "Shohni ajdahoga nisbat qilib, unda xazina umidi ham, xavf ham bor demoqchi shoir. Shohlar xazina ustidagi ajdahoga o'xshaydi: ularning g'azabidan olov sochiladi, ularning komi (huzuri/og'zi)da tirikchilik qilish halokatli va juda xatarlidir.",
                "explanation": "Shoir shohni dunyo xazinasi ustidagi xatarli ajdahoga qiyoslaydi; shoh marhamatidan umidvor bo'lib uning huzurida yashash ajdahoning o't sochuvchi komida yashash kabi xavfli ekanligini badiiy ifodalagan.",
                "subs": None,
            },
        ]

        for item in open_questions_data:
            q = Question.objects.create(
                body=item["body"],
                question_type="open_written",
                category="certificate",
                difficulty="hard",
                subject=subject,
                points=2,
                reference_answer=item.get("ref_answer", ""),
                explanation=item.get("explanation", ""),
            )
            if item.get("subs"):
                for order, (lbl, sub_txt, sub_ref) in enumerate(item["subs"], start=1):
                    SubQuestion.objects.create(
                        question=q,
                        label=lbl,
                        text=sub_txt,
                        reference_answer=sub_ref,
                        order=order,
                    )
            questions.append(q)

        # -------------------------------------------------------------
        # III QISM: ESSE TOPSHIRIG'I (45-SAVOL)
        # -------------------------------------------------------------
        essay_body = (
            "<b>45-TOPSHIRIQ: ESSE</b><br/><br/>"
            "<div style='background: rgba(16, 185, 129, 0.06); border-left: 4px solid #10b981; padding: 14px 16px; border-radius: 8px; margin-bottom: 12px;'>"
            "<h4 style='margin:0 0 6px 0; color: #10b981;'>Mavzu: «Inson faoliyati butun dunyodagi o’simliklar va hayvonot olamiga katta salbiy ta’sir ko’rsatmoqda.»</h4>"
            "<p style='margin:0; font-size:14px; line-height:1.6;'>"
            "Siz ushbu fikrga qo’shilasizmi? Fikringizni asosli dalillar, hayotiy va ilmiy misollar yordamida izchil bayon qiling.<br/>"
            "<b>(Tavsiya etilgan hajm: 200–250 so’z)</b>"
            "</p>"
            "</div>"
        )
        essay_ref = (
            "NAMUNAVIY ESSE REJASI VA MEZONLARI:\n"
            "1. Kirish: Bugungi kunda insoniyat taraqqiyoti tabiat muvozanatiga jiddiy xavf solayotgani, "
            "antropogen omillar flora va fauna olamiga halokatli ta'sir ko'rsatayotgani haqida kirish fikri.\n"
            "2. Asosiy qism — Dalil 1: O'rmonlarning (xususan, Amazonka va tropik o'rmonlarning) ommaviy kesilishi "
            "va buning oqibatida minglab noyob hayvon hamda o'simlik turlarining yashash muhitidan mahrum bo'lib qirilib ketishi.\n"
            "3. Asosiy qism — Dalil 2: Sanoat chiqindilari, kimyoviy o'g'itlar va havoning ifloslanishi. Orol fojiasi "
            "misolida suv havzalarining qurishi va bioxilmaxillikning keskin kamayishi.\n"
            "4. Asosiy qism — Dalil 3: Global isish va muzliklarning erishi tufayli Arktika va Antarktika hayvonlarining xavf ostida qolishi.\n"
            "5. Xulosa: Tabiatni asrash har bir insonning burchi ekanligi, ekologik siyosat, Qizil kitob choralarini kuchaytirish "
            "va yashil energetikaga o'tish zarurligi."
        )
        q_essay = Question.objects.create(
            body=essay_body,
            question_type="writing_task",
            category="certificate",
            difficulty="hard",
            subject=subject,
            points=10,
            min_words=200,
            max_words=300,
            reference_answer=essay_ref,
            explanation="Esse matn tuzilishi, mantiqiy izchilligi, asosli dalillari, orfografik va punktuatsion savodxonligi bo'yicha baholanadi.",
        )
        questions.append(q_essay)

        # Barcha 45 ta savolni test to'plamiga bog'lash
        test_set.questions.set(questions)
        test_set.question_order = [q.id for q in questions]
        test_set.save(update_fields=['question_order'])

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 45 talik Ona Tili va Adabiyot Milliy Sertifikat Mock Imtihoni bazaga muvaffaqiyatli yuklandi!\n"
                f"Sarlavha: '{test_set.title}' (ID: {test_set.id})\n"
                f"Fan: {subject.name} (slug: {subject.slug})\n"
                f"Boshlanish vaqti: {test_set.scheduled_at.strftime('%Y-%m-%d %H:%M')} (Toshkent vaqti)\n"
                f"Davomiyligi: {test_set.duration_minutes} daqiqa\n"
                f"Savollar soni: {test_set.questions.count()} ta (32 ta test + 12 ta yozma grammatik tahlil + 1 ta esse)\n"
                f"Kutish zali havolasi: /tests/mock/{test_set.id}\n"
                f"Ustaxonada ko'rish: /teacher/tests/{test_set.id}/build\n"
            )
        )
