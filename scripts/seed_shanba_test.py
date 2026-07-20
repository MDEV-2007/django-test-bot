"""
Seeds the "Shanba kuni" mock Milliy Sertifikat test (45-savollik tarix testi, foydalanuvchi
tomonidan yuklangan PDF asosida).

MUHIM ESLATMA: PDF'da savollar va variantlar bor edi, lekin javoblar kaliti YO'Q edi (alohida
javoblar varag'ida bo'lishi kerak edi). Har bir savolning to'g'ri javobi shu skriptni yozgan
AI tomonidan mustaqil ravishda tarix bilimiga tayanib aniqlangan. Quyidagi savollar
"# ISHONCH: PAST" deb belgilangan — bular asosan diagramma/chiziq bilan bog'lash turidagi
savollar (5, 6, 16, 17, 19, 26, 28, 30-40-42-lar ba'zilari) bo'lib, ularni haqiqiy javoblar
kaliti bilan solishtirib ko'rish TAVSIYA ETILADI.

17-savol (Yevropa xaritasi, raqamlangan) uchun original rasm PDF'dan ajratib olinmadi — savol
matnli holda, rasmsiz kiritildi. Admin panel orqali keyinroq rasm biriktirish mumkin.

Ochiq savollar (36-45) uchun ham xuddi shunday — reference_answer AI tomonidan aniqlangan,
Groq shu bilan solishtirib baholaydi.
"""
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from learning.models import Topic
from tests_app.models import Question, Choice, Test

TOPIC_SLUG = "milliy-sertifikat"


def mcq(text, options, correct_index, difficulty="medium", confidence="OK"):
    """options: list of 4 (or 6 for shared-bank questions) strings; correct_index: 0-based."""
    return {
        "type": "mcq",
        "text": text,
        "options": options,
        "correct_index": correct_index,
        "difficulty": difficulty,
        "confidence": confidence,
    }


def open_q(text, reference_answer, difficulty="medium", confidence="OK"):
    return {
        "type": "open",
        "text": text,
        "reference_answer": reference_answer,
        "difficulty": difficulty,
        "confidence": confidence,
    }


QUESTIONS = [
    mcq("Quyidagi urushlardan qaysi biri qadimgi dunyo tarixida yuz bergan?",
        ["Gastings jangi", "Puni urushlari", "Trafalgar jangi", "Sitsilliya oqshomi"], 1, "easy"),

    mcq("Diodot, Diomed va Diokletianning faoliyati bilan bog'liq ma'lumotlar to'g'ri ko'rsatilgan "
        "javobni aniqlang. (a-Rimda tetrarxiya joriy qilgan; b-Troyaga qarshi yunonlar bilan kurashgan; "
        "c-Frakiyaning Bixton qabilasi shohi, vahshiy otlari bilan mashhur; d-Qonunlar to'plamini tuzgan "
        "Vizantiya imperatori; e-Salavkiy shoh Antiox II davrida Baqtriyani mustaqil qilib, o'zini shoh "
        "deb atagan)",
        ["1-b, 2-d, 3-e", "1-e, 2-b, 3-d", "1-e, 2-c, 3-a", "1-d, 2-a, 3-c"], 2, "hard", "O'RTA"),

    mcq("Nuqtalar o'rniga mantiqan mos keladigan javobni aniqlang (O'rta asrlar). "
        "1) To'rtinchi salib yurishlari... 2) Koguryo qirolligi davrida... "
        "(a-Quddus musulmonlar tomonidan tortib olindi; b-Slavyan yozuvi vujudga keldi; "
        "c-Vizantiya hududida Lotin imperiyasi tuzildi; d-Shimoliy Italiya hududiga langobardlar "
        "bostirib kirdi)",
        ["1-c, 2-d", "1-a, 2-b", "1-a, 2-d", "1-c, 2-b"], 0, "hard", "O'RTA"),

    mcq("Quyidagi tarixiy voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping. "
        "1) Buyuk Britaniya Misr hukumatidan Suvaysh kanalining 45% aksiyasini sotib oldi; "
        "2) Buyuk Britaniya va Afg'oniston o'rtasida do'stlik shartnomasi imzolandi; "
        "3) AQSHda \"Mehnat kuni\" e'lon qilindi; 4) Buenos-Ayresda IV panamerika konferensiyasi "
        "o'tkazildi; 5) Buyuk Britaniya va AQSHning yirik shaharlarida tramvaylar ishlatila boshlandi; "
        "6) Gandamak bitimi imzolandi.",
        ["2, 6, 1, 3, 5, 4", "2, 1, 6, 4, 5, 3", "1, 6, 2, 3, 5, 4", "2, 1, 6, 3, 5, 4"], 3, "hard", "O'RTA"),

    mcq("Atamalar (I-Repatriatsiya, II-Devalvatsiya, III-Institutsional, IV-Populizm) va ularning "
        "izohlari to'g'ri moslashtirilgan javobni toping (izohlar: a-milliy valyuta kursini pasaytirish; "
        "b-aholining ko'chib o'tishi; c-vatanga qaytish; d-xalq ommasi ehtiyojlariga qaratilgan siyosat; "
        "e-ekstremistik guruhlarga birlashish; f-ijtimoiy institutlar rivojlanishi).",
        ["I–d, II–a, III–f, IV–c", "I–f, II–a, III–d, IV–c", "I–d, II–a, III–f, IV–b", "I–e, II–c, III–f, IV–c"],
        0, "hard", "PAST"),

    mcq("Atamalar (I-Komprador, II-Individualizm, III-Konsessiya, IV-Konvensiya) va ularning izohlari "
        "to'g'ri moslashtirilgan javobni toping.",
        ["I–b, II–c, III–b, IV–a", "I–e, II–c, III–b, IV-a", "I–b, II–c, III–b, IV–a", "I–e, II–c, III–a, IV–b"],
        3, "hard", "PAST"),

    mcq("Tarixiy shaxsni aniqlang. U Yevropa yangi tarixida eng uzoq hokimiyatda o'tirgan diktator "
        "bo'lgan. Uning davrida barcha siyosiy partiyalar faoliyatini to'xtatdi, 1960-yillarning "
        "o'rtalarigacha rivojlanish modeli avtarkiya bo'lib qoldi, mustamlaka imperiyasini saqlab "
        "turish g'oyasi mafkurasining ajralmas qismi edi.",
        ["Fransisko Franko", "Antonio Salazar", "Antonio de Spinola", "Marselu Kaetanu"], 1, "medium"),

    mcq("Tarixiy shaxsni aniqlang. Uning davrida mamlakatda yopiq siyosat olib borildi, chet elliklar "
        "kirishi taqiqlandi, qaroqchilar shafqatsiz jazolanadigan bo'ldi (temir qafaslarga solinib), "
        "yagona pul birligi va o'lchovlar joriy qilindi.",
        ["Amir Ayubxon", "Amir Habibullo", "Amir Abdurahmon", "Amir Yoqubxon"], 2, "medium"),

    mcq("Tarixiy davlatni aniqlang. Bu davlat qadimgi Afrikaning g'arbiy qismida, Niger va Senegal "
        "daryolari oralig'ida joylashib, oltin-tuz savdosi markazi bo'lgan, hukmdorlari islom dinini "
        "qabul qilgan, XI asrda almoravidlar bosqinidan so'ng zaiflashgan.",
        ["Gana", "Mali", "Songay", "Monomotapa"], 0, "medium"),

    mcq("Tarixiy davlatni aniqlang. Bu davlat XIX asrning ikkinchi yarmida vujudga kelgan, \"ikki "
        "boshli\" boshqaruv tizimi bilan ajralib turgan, o'ndan ortiq xalq yashagan, 1914-yil parlament "
        "tarqatib yuborilib harbiy diktatura o'rnatilgan.",
        ["Usmonli imperiyasi", "Kayzer Germaniyasi", "Avstriya-Vengriya", "Bolgariya"], 2, "medium"),

    mcq("XIX asr oxiri XX asr boshlarida sodir bo'lgan voqealar orasidan noto'g'ri hukmni aniqlang.",
        ["Zirabuloq shartnomasi – Buxoro Rossiyaga siyosiy jihatdan qaram bo'ldi",
         "Toshkent shahar nizomi – Toshkentda mahkama joriy qilindi",
         "1886-yilgi \"Nizom\" – uyezd sudlari bekor qilinib, uchastka mirovoy sudyalari tuzildi",
         "Xiva xonligi bosh vaziri Islomxo'ja o'ldirildi – Mang'it va Xo'jaylida qo'zg'alon ko'tarildi"],
        0, "medium"),

    mcq("Quyida berilgan ma'lumotlardan qaysi biri XVII asr boshlarida O'rta Osiyo davlatlari tarixi "
        "uchun xos emas?",
        ["Yoyiq Kazaklarining Urganchga hujumlari uyushtirildi",
         "Sultonband suv omborining buzib tashlandi",
         "Toshkentning qozoqlardan ozod etilishi",
         "Buxoroda hokimiyatga ashtarxoniylar sulolasi keldi"], 2, "hard"),

    mcq("O'zbekiston Respublikasi Shanxay Hamkorlik Tashkiloti (SHHT)ga a'zo bo'lgan davrda bosh vazir "
        "lavozimida bo'lgan shaxsni aniqlang.",
        ["Shukrullo Mirsaidov", "Abdulhoshim Mutalov", "O'tkir Sultonov", "Shavkat Mirziyoyev"], 2, "medium"),

    mcq("O'zbekiston Respublikasi Konstitutsiyasining 115-moddasida keltirilgan Vazirlar Mahkamasining "
        "vakolatlarini aniqlang. 1) Viloyat/Toshkent hokimini tayinlash-ozod etish; 2) Qonunlar va "
        "farmonlar ijrosini ta'minlash; 3) Davlat mukofotlarini ta'sis etish; 4) Oliy Majlisga yillik "
        "ma'ruza taqdim etish; 5) Xalqaro shartnomalarni ratifikatsiya qilish; 6) Yoshlar siyosati va "
        "oilani qo'llab-quvvatlash choralarini ko'rish.",
        ["2, 3, 5", "2, 4, 6", "1, 5, 6", "1, 4, 3"], 1, "hard"),

    mcq("Makedoniyalik Aleksandr O'rta Osiyoni bosib olishga uch yil urindi va quyidagilardan "
        "qaysilarini bo'ysundira olmadi?",
        ["Sug'diyona", "Marg'iyona", "Baqtriya", "Farg'ona"], 3, "medium", "O'RTA"),

    mcq("Quyidagi tarixiy voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping. "
        "1) O'zbekiston SSRda 10 ta okrug va Konimex tumani tuzildi; 2) Toshkentda \"Fuqaho jamiyati\" "
        "tashkil topdi; 3) O'zbekiston kasaba uyushmalariga asos solindi; 4) Oybekning \"Navoiy\" "
        "romani chop etildi; 5) O'zbekiston davlat apparatini o'zbeklashtirish komissiyasi faoliyati "
        "to'xtatildi; 6) Chirchiq–Bo'zsuv GESlar kaskadi barpo etildi.",
        ["2, 3, 1, 5, 6, 4", "3, 2, 1, 6, 5, 4", "2, 3, 1, 6, 5, 4", "2, 1, 3, 6, 5, 4"], 0, "hard", "PAST"),

    mcq("Xaritada 1951-yil Yevropa ko'mir va po'lat birlashmasi (YKPB) tashkilotini tuzishda ishtirok "
        "etmagan davlatlarni aniqlang. [Diqqat: original xaritadagi raqamlangan mamlakatlar rasmi bu "
        "yerda yo'q — faqat matn asosida javob berilgan, admin panelda tekshirib ko'ring.]",
        ["4, 5, 6, 9", "2, 4, 6, 9", "1, 3, 4, 9", "1, 3, 5, 6"], 1, "hard", "PAST — rasm yo'q"),

    mcq("Tarixiy voqea/jarayon va uning natijasi o'zaro mos berilgan qatorlarni toping. "
        "1) Rim-Spartak qo'zg'aloni → Rimda Respublika kuchaydi; 2) Vena kongressi → Muqaddas ittifoq "
        "vujudga keldi; 3) Umarshayx halok bo'lishi → Ozarbayjon/Iroq temuriylar qo'lidan ketdi; "
        "4) Salohiddin Ayyubiy Quddusni olishi → 3-salib yurishi tashkil qilindi; 5) Gandamak bitimi → "
        "Xiva Rossiya mustamlakasiga aylandi; 6) Antifashist ittifoqi tuzilishi → Sovet hukumati diniy "
        "ta'qiblarni olib tashladi; 7) Bryussel konferensiyasi → Qul savdosi taqiqlandi.",
        ["2, 3, 4, 5", "2, 4, 6, 7", "1, 3, 5, 6", "1, 4, 6, 7"], 1, "hard"),

    mcq("Jadvalda harflar bilan belgilangan kataklarga mos ma'lumotlarni qo'yib to'g'ri javobni toping "
        "(O'zbekiston va Jahon tarixi bo'yicha asrlar jadvali).",
        ["a-2, b-18, c-8, d-4, e-1, f-10, g-15, h-14, i-16, j-7, k-9, l-3",
         "a-2, b-18, c-8, d-4, e-1, f-10, g-15, h-14, i-3, j-7, k-9, l-16",
         "a-2, b-18, c-15, d-4, e-1, f-10, g-8, h-14, i-3, j-7, k-9, l-16",
         "a-2, b-18, c-8, d-14, e-1, f-10, g-15, h-4, i-3, j-7, k-9, l-16"], 1, "hard", "O'RTA"),

    mcq("Quyida berilgan ma'lumotlarni tahlil qilib Eyler-Venn diagrammasiga mos keladigan javoblarni "
        "aniqlang (Pokiston/Afg'oniston, XX asr oxiri - XXI asr boshlari).",
        ["I – c, f, h; II – b, d, e; III – g, i", "I – c, f, h; II – b, d, e; III – a, i",
         "I – c, f, h; II – a, d, e; III – g, i", "I – f, g, h; II – b, d, e; III – c, i"], 0, "hard", "O'RTA"),

    mcq("To'g'ri hukmlarni aniqlang. 1) Abbosiylar targ'ibotchilaridan biri marvlik Abu Muslim edi; "
        "2) Eftallar davlatida jinoyatchilikka qarshi qonun hujjatlari amal qilgan; 3) Buxoro Sug'dida "
        "hukmdor tasviri tushirilgan tangalar zarb etilgan; 4) Xorazmda Abul Hasan Ali ibn Ma'mun "
        "davrida Gurganchda akademiyaga asos solindi; 5) Qoraxoniylar davrida Movarounnahrda turkiy "
        "etnik-til muhiti shakllana boshladi; 6) Sharqiy saljuqiylar faoliyatiga Sulton Sanjar o'limidan "
        "keyin chek qo'yildi.",
        ["1, 4, 5", "2, 4, 6", "3, 4, 6", "2, 3, 5"], 0, "hard"),

    mcq("Yevropada shaharlarning shakllanishiga sabab bo'lgan omillarni to'g'ri moslashtiring "
        "(I-Monastirlar atrofida; II-Feodallar qal'alari atrofida; III-Daryo sohillari/ko'priklar "
        "yonida; shaharlar: Bremen, Sen-Gallen, Augsburg, Bryugge, Sen-Denu, Myunster, Padeborn, "
        "Gamburg, Strasburg, Sveybryukken).",
        ["I – b, e, f; II – c, h, i; III – a, d, g, j", "I – c, f, h; II – a, d, i; III – b, e, g",
         "I – b, d, e; II – c, g, h; III – a, f, j", "I – a, b, f; II – c, d, j; III – g, h, i"], 0, "hard", "O'RTA"),

    mcq("Amir Temur davlatining boshqaruvi haqida noto'g'ri ma'lumotlarni toping. 1) Amir Temur Eron/"
        "Ozarbayjon/Iroqdagi tarqoqlikka barham berdi; 2) Arkbegilar diniy marosimlar-shariat "
        "bajarilishi ustidan nazorat qilgan; 3) Har shahar-qishloqqa muhtasib (qal'a komendanti) "
        "tayinlanib soqchilik qilgan; 4) Sud qatnashuvchilari norozi bo'lsa faqat amirga shikoyat "
        "qilishi mumkin edi; 5) Sud hokimiyati ma'muriy, shariat va ahdos ko'rinishlarida bo'lgan.",
        ["1, 2", "2, 3", "1, 5", "3, 4"], 1, "hard"),

    mcq("Ikkinchi jahon urushi davrida O'zbekiston kompartiyasi MKning 1-sekretari va Ministrlar "
        "Soveti raisi lavozimida faoliyat olib borgan shaxslarni aniqlang.",
        ["Usmon Yusupov, Yo'ldosh Oxunboboyev", "Usmon Yusupov, A. Abdurahmonov",
         "Amin Niyozov, Sharof Rashidov", "Akmal Ikromov, Yo'ldosh Oxunboboyev"], 1, "medium"),

    mcq("Buyuk vazir Nizomulmulk o'zining davlatni boshqarish san'ati haqidagi \"Siyosatnoma\" asarini "
        "qaysi Saljuqiy hukmdorga bag'ishlagan?",
        ["Sulton To'g'rulbek", "Sulton Alp Arslon", "Sulton Malikshoh", "Sulton Sanjar"], 2, "medium"),

    mcq("Asarlar va ularning mualliflarini to'g'ri moslashtiring (1-T.Drayzer, 2-R.Rolland, "
        "3-Paulo Koelyo, 4-Stiven Kreyn; a-\"Moliyachi\", b-\"Sodiq fuqaro\", c-\"Jasoratning qonli "
        "belgisi\", d-\"Maydondagi Yarmarka\", e-\"Alkimyogar\").",
        ["1–a, 2–b, 3–a, 4–c", "1–d, 2–c, 3–e, 4–f", "1–a, 2–d, 3–e, 4–c", "1–a, 2–b, 3–f, 4–e"], 2, "hard", "O'RTA"),

    mcq("\"Badoye ul-vaqoye\" asari muallifi to'g'ri keltirilgan javobni toping.",
        ["Alisher Navoiy", "Jaloliddin Rumiy", "Ahmad Fasih Havofiy", "Zayniddin Vosifiy"], 3, "medium"),

    mcq("Qadimgi dunyo va O'rta asrlarda ro'y bergan ixtirolarni o'zaro muvofiq bo'lganlarini aniqlang "
        "(I.Qadimgi dunyo: 1-Hind,2-Yunonlar,3-Rim,4-Xitoy; a-Beton,b-Olimpiya o'yinlari,"
        "c-Piktografik yozuv,d-Shaxmat,e-Kompas,f-Pantomima).",
        ["I – 1 – c", "II – 4 – f", "I – 2 – e", "II – 3 – b"], 0, "hard", "PAST"),

    mcq("Asarlar va ularning mualliflarini to'g'ri moslashtiring (1-Lyofler, 2-Lesh, 3-Grinyar, "
        "4-Arrenius; a-Amyoba dizenteriyasi tug'diruvchi mikrob, b-Diazotlash reaksiyasi, "
        "c-Xilma-xil organik moddalarni sintez qilish usuli, d-Bo'g'ma tug'diruvchi mikrob, "
        "e-Elektrolitik dissotsiatsiya).",
        ["1–d, 2–a, 3-c, 4–e", "1–d, 2–a, 3–b, 4–e", "1–d, 2–c, 3–a, 4–e", "1–a, 2–d, 3–b, 4–e"], 0, "hard"),

    mcq("\"Postindustrial jamiyat\" atamasini fanga kiritgan va kvant nazariyasi asoschisi bo'lgan "
        "olimlarni aniqlang (1-Ch.Tauns, 2-Maks Plank, 3-Jon Keyns, 4-R.Noys, 5-Daniel Bell, "
        "6-Albert Eynshteyn).",
        ["1, 6", "3, 6", "2, 5", "2, 3"], 2, "medium"),

    mcq("Urush paytlarida qoraqalpoqlardan qanday turdagi soliq olingan?",
        ["Cho'p puli", "Solg'ut", "Qozon puli", "Afanak puli"], 2, "hard", "PAST"),

    mcq("Quyidagi shaharlardan qaysilari qul savdosi natijasida Yevropa va Amerikada jadal rivojlanib "
        "gullab-yashnagan shaharlar qatoriga kiradi? (1-Liverpul, 2-Yangi Orlean, 3-Rim, 4-Lissabon, "
        "5-Rio de Jeneyro, 6-Lans, 7-Kaliforniya, 8-Nyu York, 9-Ruan, 10-Nant)",
        ["1, 2, 5, 8, 9, 10", "1, 2, 4, 5, 7, 8, 9", "1, 3, 5, 8, 9, 10", "1, 2, 3, 6, 8, 10"], 0, "hard"),

    # 33-35: shared answer bank (A-F), each its own question with all 6 choices
    mcq("Qaysi voqea natijasida Portugaliyada hukumat almashdi?",
        ["\"Lolalar inqilobi\" bo'lib o'tdi", "\"Aprel inqilobi\" bo'lib o'tdi",
         "\"Chinnigullar inqilobi\" bo'lib o'tdi", "Kuba inqilobi bo'lib o'tdi",
         "AQSH-Ispaniya urushi bo'lib o'tdi", "\"Rangli inqilob\" sodir bo'ldi"], 2, "medium"),
    mcq("Qaysi voqea natijasida Qirg'izistonda Kurmanbek Bakiyev hukumati ag'darib tashlandi?",
        ["\"Lolalar inqilobi\" bo'lib o'tdi", "\"Aprel inqilobi\" bo'lib o'tdi",
         "\"Chinnigullar inqilobi\" bo'lib o'tdi", "Kuba inqilobi bo'lib o'tdi",
         "AQSH-Ispaniya urushi bo'lib o'tdi", "\"Rangli inqilob\" sodir bo'ldi"], 1, "medium"),
    mcq("Qaysi voqea natijasida Kuba mustaqillikka erishdi?",
        ["\"Lolalar inqilobi\" bo'lib o'tdi", "\"Aprel inqilobi\" bo'lib o'tdi",
         "\"Chinnigullar inqilobi\" bo'lib o'tdi", "Kuba inqilobi bo'lib o'tdi",
         "AQSH-Ispaniya urushi bo'lib o'tdi", "\"Rangli inqilob\" sodir bo'ldi"], 4, "medium", "O'RTA"),

    # --- Open-ended (36-45), Groq baholaydi ---
    open_q("Rossiyaning O'rta Osiyoga yurishlari tezlashgan sayin Buyuk Britaniya ham Afg'onistonga "
           "ko'p hujumlar uyushtirdi, natijada ingliz-afg'on urushlari kelib chiqqan. Afg'oniston "
           "amalda o'z mustaqilligini yo'qotgan shartnomani yozing.",
           "Gandamak shartnomasi (1879-yil)"),
    open_q("Ushbu shartnoma (Gandamak bitimi) tuzilgan davrdagi Britaniya monarxini yozing.",
           "Qirolicha Viktoriya"),

    open_q("Rim imperiyasining G'arbiy va Sharqiy Rimga bo'linishi cherkovni ham ikkiga bo'ldi. "
           "Qaysi papa davrida katolik cherkovi o'z qudratining cho'qqisiga chiqdi?",
           "Innokentiy III (Papa Innokentiy III)", "hard", "O'RTA"),
    open_q("Qaysi papa davrida inkvizitsiya o'z qudratining cho'qqisiga chiqdi?",
           "Gregoriy IX (yoki Ispaniya inkvizitsiyasi uchun Sikst IV)", "hard", "PAST"),

    open_q("XVI-XVIII asrlarda Yevropa bo'ylab diniy urushlar va inqiloblar boshlandi. Eng birinchi "
           "burjua inqilobi Fransiyada qirol hokimiyatining ag'darilishi bilan boshlangan edi. "
           "Buyuk fransuz burjua inqilobi davrida Fransiyani boshqargan sulola nomini yozing.",
           "Burbonlar sulolasi"),
    open_q("Ushbu sulolaning (Burbonlar) asoschisining nomini to'liq yozing.",
           "Genrix IV (Anri IV)"),

    open_q("1917-yil 28-noyabrda Turkiston Muxtoriyati tashkil topdi. Hukumatning dastlabki bosh "
           "vaziri hamda ichki ishlar vaziri lavozimlariga kim tayinlangan?",
           "Muhammadjon Tinishpoyev (bosh vazir)", "hard", "PAST"),
    open_q("Keyinchalik o'zgarishlar sodir bo'lgandan so'ng Turkiston Muxtoriyatida bosh vazir "
           "lavozimini egallagan shaxsni yozing.",
           "Mustafo Cho'qay"),

    open_q("Amir Temur davrida Samarqand va uning atrofida 10 dan ortiq betakror bog'lar yaratilgan. "
           "Bu bog'lardan qaysi biri sohibqironning suyukli xotini Xayrinussoga atab qurdirilgan?",
           "Bog'i Bihisht", "hard", "PAST"),
    open_q("Amir Temurning nabirasi Mirzo Ulug'bek tomonidan qayta obod qilingan bog' nomini yozing.",
           "Bog'i Chinor", "hard", "PAST"),

    open_q("1949-yili bir qator Yevropa davlatlari Yevropa Kengashining ta'sischilariga aylanishdi. "
           "Shundan so'ng Germaniya va Fransiyaning iqtisodiy imkoniyatlarini birlashtirish tashabbusi "
           "bilan chiqqan Fransiya tashqi ishlar vazirini yozing.",
           "Robert Shuman"),
    open_q("Bu davrda (1949-1951) Buyuk Britaniyani qaysi siyosatchi boshqargan?",
           "Klement Etli (Clement Attlee)"),

    open_q("Jerar Valter va Marsel Brion Amir Temurni o'zlarining \"Asrlar yodgorligi\" asarlariga "
           "qahramon qilib tanlab, Sohibqironni \"XV asr taqdirini hal qilgan inson\" deb atashgan. "
           "Ushbu fikr kimlarga tegishli ekanini yozing.",
           "Jerar Valter va Marsel Brion", "hard", "O'RTA"),
    open_q("Amir Temur suhbatlarida ishtirok etgan, uning saltanatini o'z ko'zi bilan ko'rgan va bu "
           "haqda asar yozgan, Rim papasi va Fransiya qiroli Karl VI ning elchisi bo'lgan yevropalik "
           "birinchi muallifni yozing.",
           "Ruy Gonsales de Klavixo", "hard", "PAST"),

    open_q("1572-yil 24-avgustga o'tar kechasi Parijda protestantlar (gugenotlar)ning ommaviy qirg'ini "
           "sodir etildi. Ushbu mudhish qirg'in tarixga qanday nom bilan kirgan?",
           "Avliyo Varfolomey kechasi qirg'ini"),
    open_q("Ushbu qirg'inning asosiy tashabbuskorlaridan biri bo'lgan yosh qirolning onasi ismini yozing.",
           "Katerina Medichi"),

    open_q("Andijon qo'zg'oloniga boshchilik qilgan shaxsning ismini yozing.",
           "Dukchi Eshon (Muhammad Ali eshon)"),
    open_q("Andijon qo'zg'oloni bostirilgan davrdagi Turkiston general-gubernatori ismini yozing.",
           "Baron Vrevskiy", "hard", "PAST"),

    open_q("1825-yil dekabr oyida Peterburgning Senat maydonida bir guruh ofitserlar monarxiya "
           "tartibini o'zgartirish talabi bilan chiqish qildilar. Ushbu harakat ishtirokchilari "
           "tarixga qanday nom bilan kirgan?",
           "Dekabristlar"),
    open_q("Ushbu isyonni shafqatsizlarcha bostirgan va o'sha paytda taxtga yangi o'tirgan podshoh "
           "ismini yozing.",
           "Nikolay I"),
]


def main():
    topic = Topic.objects.get(slug=TOPIC_SLUG)

    created_questions = []
    low_confidence = []

    for i, q in enumerate(QUESTIONS, start=1):
        if q["type"] == "mcq":
            question = Question.objects.create(
                topic=topic,
                text=q["text"],
                difficulty=q["difficulty"],
                category="certificate",
                question_type="mcq",
            )
            for idx, opt_text in enumerate(q["options"]):
                Choice.objects.create(question=question, text=opt_text, is_correct=(idx == q["correct_index"]))
        else:
            question = Question.objects.create(
                topic=topic,
                text=q["text"],
                difficulty=q["difficulty"],
                category="certificate",
                question_type="open",
                reference_answer=q["reference_answer"],
            )
        created_questions.append(question)
        if q.get("confidence") not in (None, "OK"):
            low_confidence.append((i, q["confidence"], question.text[:60]))

    test = Test.objects.create(
        title="Milliy Sertifikat namunaviy testi — Tarix (45 savol)",
        description="Haftalik namunaviy Milliy Sertifikat tarix testi: variantli va ochiq javobli "
                     "(AI baholaydigan) savollar aralash.",
        category="certificate",
        duration_minutes=90,
        is_premium=False,
    )
    test.questions.set(created_questions)

    print(f"Test yaratildi: {test.title} (id={test.id}), {len(created_questions)} ta savol.")
    print(f"\nPAST/O'RTA ishonch bilan belgilangan {len(low_confidence)} ta savol (tekshirib ko'ring):")
    for i, conf, text in low_confidence:
        print(f"  #{i} [{conf}] {text}...")


if __name__ == "__main__":
    main()
