import os

# Running this file directly puts scripts/ on sys.path, not the project root, so
# `config.settings` (and every app) would be unimportable. Add the root explicitly
# so the script works from any working directory.
import sys
from pathlib import Path as _Path
sys.path.insert(0, str(_Path(__file__).resolve().parent.parent))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()


from django.db import transaction
from learning.models import Topic
from tests_app.models import Question, AnswerOption, TestSet
from games.models import HistoricalCharacter, MapChallenge

# Real historical map of Central Asia (Khorasan / Transoxiana-Movarounnahr / Khwarazm-Xorazm) —
# every MapChallenge below asks about a region within or bordering this exact area, unlike the
# old generic modern-world-political-map stock photo it replaced.
# Source: https://commons.wikimedia.org/wiki/File:Khorasan-Transoxiana-Khwarazm.svg (CC BY-SA 4.0)
MAP_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Khorasan-Transoxiana-Khwarazm.svg/960px-Khorasan-Transoxiana-Khwarazm.svg.png"

# ---------------------------------------------------------------------------
# 1. New topics
# ---------------------------------------------------------------------------

NEW_TOPICS = [
    dict(title="Qadimgi O'zbekiston tarixi", slug="qadimgi-tarix", order=10),
    dict(title="Qoraxoniylar va Xorazmshohlar davri", slug="qoraxoniylar-xorazmshohlar", order=11),
    dict(title="Shayboniylar va Ashtarxoniylar davri", slug="shayboniylar-ashtarxoniylar", order=12),
    dict(title="Chor Rossiyasi mustamlakachiligi davri", slug="chor-rossiyasi-davri", order=13),
    dict(title="Sovet va Mustaqillik davri tarixi", slug="sovet-mustaqillik-davri", order=14),
]

# ---------------------------------------------------------------------------
# 2. Questions per topic slug: (text, difficulty, [(choice_text, is_correct), ...])
# ---------------------------------------------------------------------------

QUESTIONS_BY_TOPIC = {
    "qadimgi-tarix": [
        ("Qadimgi Sug'diyona davlatining markazi qaysi shahar bo'lgan?", "easy",
         [("Samarqand", True), ("Buxoro", False), ("Xorazm", False), ("Termiz", False)]),
        ("Qadimgi Baqtriya davlati qaysi hududda joylashgan edi?", "medium",
         [("Amudaryoning yuqori oqimi", True), ("Sirdaryoning quyi oqimi", False), ("Zarafshon vodiysi", False), ("Farg'ona vodiysi", False)]),
        ("Qadimgi Xorazm davlati qaysi daryo bo'yida joylashgan?", "easy",
         [("Amudaryoning quyi oqimi", True), ("Sirdaryoning yuqori oqimi", False), ("Zarafshon daryosi", False), ("Qashqadaryo", False)]),
        ("Buyuk Ipak yo'li qaysi ikki qit'ani bog'lagan?", "easy",
         [("Osiyo va Yevropa", True), ("Afrika va Osiyo", False), ("Amerika va Yevropa", False), ("Avstraliya va Osiyo", False)]),
        ("Miloddan avvalgi IV asrda O'rta Osiyoga bostirib kirgan yunon-makedon qo'shinlariga kim boshchilik qilgan?", "medium",
         [("Aleksandr Makedonskiy", True), ("Doro III", False), ("Kir II", False), ("Yuliy Sezar", False)]),
        ("Spitamen kim bo'lgan?", "medium",
         [("Makedoniyaliklarga qarshi kurashgan sug'd sarkardasi", True), ("Yunon faylasufi", False), ("Rim imperatori", False), ("Xitoy sayohatchisi", False)]),
        ("Kushon podsholigining eng buyuk hukmdori kim bo'lgan?", "hard",
         [("Kanishka", True), ("Doro", False), ("Chandragupta", False), ("Ashoka", False)]),
        ("Qadimgi Farg'ona vodiysida joylashgan davlat qanday nomlangan?", "hard",
         [("Dovon", True), ("Qang'", False), ("Baqtriya", False), ("Xorazm", False)]),
        ("Qang' davlati qaysi hududda joylashgan edi?", "medium",
         [("Sirdaryo va Toshkent vohasi", True), ("Surxon vohasi", False), ("Farg'ona vodiysi", False), ("Xorazm vohasi", False)]),
        ("Zardushtiylik dinining muqaddas kitobi nima deb ataladi?", "easy",
         [("Avesto", True), ("Bibliya", False), ("Tavrot", False), ("Injil", False)]),
        ("Afrosiyob yodgorligi qaysi zamonaviy shahar hududida joylashgan?", "easy",
         [("Samarqand", True), ("Buxoro", False), ("Toshkent", False), ("Xiva", False)]),
        ("Qadimgi Termiz shahri qaysi davr yodgorliklari bilan mashhur?", "medium",
         [("Buddaviylik yodgorliklari", True), ("Zardushtiylik ibodatxonalari", False), ("Qadimgi rim amfiteatri", False), ("Misr ehromlari", False)]),
    ],
    "qoraxoniylar-xorazmshohlar": [
        ("Qoraxoniylar davlati qaysi asrda tashkil topgan?", "medium",
         [("X asr", True), ("XV asr", False), ("XIX asr", False), ("VII asr", False)]),
        ("Qoraxoniylar davlatining diniy e'tiqodi qanday bo'lgan?", "easy",
         [("Islom", True), ("Buddaviylik", False), ("Zardushtiylik", False), ("Xristianlik", False)]),
        ("Qoraxoniylar davrida qurilgan mashhur Kalon minorasi qaysi shaharda joylashgan?", "easy",
         [("Buxoro", True), ("Samarqand", False), ("Xiva", False), ("Termiz", False)]),
        ("Xorazmshohlar davlatining poytaxti dastlab qaysi shahar bo'lgan?", "medium",
         [("Urganch", True), ("Samarqand", False), ("Buxoro", False), ("Marv", False)]),
        ("Xorazmshohlar davlati qaysi hukmdor davrida eng katta hududga ega bo'lgan?", "medium",
         [("Alovuddin Muhammad", True), ("Otsiz", False), ("Takash", False), ("Anushtegin", False)]),
        ("Xorazmshohlar davlati kim tomonidan barbod etilgan?", "easy",
         [("Chingizxon", True), ("Aleksandr Makedonskiy", False), ("Amir Temur", False), ("Doro III", False)]),
        ("Jaloliddin Manguberdi kim bo'lgan?", "medium",
         [("Xorazmshohlarning so'nggi hukmdori va mo'g'ullarga qarshi kurashgan sarkarda", True),
          ("Qoraxoniylar sulolasi asoschisi", False), ("Amir Temur davri olimi", False), ("Buxoro amiri", False)]),
        ("Mahmud Qoshg'ariyning \"Devonu lug'otit turk\" asari qaysi davrda yozilgan?", "hard",
         [("Qoraxoniylar davrida (XI asr)", True), ("Temuriylar davrida (XV asr)", False), ("Sovet davrida (XX asr)", False), ("Amir Temur davrida (XIV asr)", False)]),
        ("Anushtegin kim edi?", "hard",
         [("Xorazmshohlar sulolasiga asos solgan g'ulomlardan biri", True), ("Qoraxoniylar xoni", False), ("Shayboniylar sarkardasi", False), ("Somoniylar amiri", False)]),
        ("Qutb ad-Din Muhammad qaysi sulolaga asos solgan hisoblanadi?", "medium",
         [("Xorazmshohlar", True), ("Qoraxoniylar", False), ("Shayboniylar", False), ("Ashtarxoniylar", False)]),
        ("Qoraxoniylar davlati necha qismga (xoqonlikka) bo'lingan edi?", "medium",
         [("Ikkiga", True), ("Uchga", False), ("To'rtga", False), ("Bo'linmagan", False)]),
        ("Xorazmshohlar davlati tarkibiga qaysi shahar kirmagan edi?", "hard",
         [("Bag'dod", True), ("Samarqand", False), ("Buxoro", False), ("Urganch", False)]),
    ],
    "shayboniylar-ashtarxoniylar": [
        ("Shayboniylar sulolasiga kim asos solgan?", "easy",
         [("Muhammad Shayboniyxon", True), ("Abdullaxon II", False), ("Boborahim Mashrab", False), ("Ubaydullaxon", False)]),
        ("Shayboniyxon Temuriylar davlatini qachon qulatgan?", "medium",
         [("XVI asr boshida", True), ("XIV asr oxirida", False), ("XVIII asrda", False), ("XIX asr boshida", False)]),
        ("Shayboniylar davlatining poytaxti qaysi shahar bo'lgan?", "easy",
         [("Buxoro", True), ("Samarqand", False), ("Xiva", False), ("Toshkent", False)]),
        ("Shayboniylar sulolasidan bo'lgan qaysi hukmdor davrida davlat eng yuksalgan?", "medium",
         [("Abdullaxon II", True), ("Shayboniyxon", False), ("Ubaydullaxon", False), ("Iskandarxon", False)]),
        ("Ashtarxoniylar sulolasi kelib chiqishi jihatidan qaysi hududga bog'liq?", "hard",
         [("Astraxon xonligi", True), ("Usmonli imperiyasi", False), ("Boburiylar davlati", False), ("Sibir xonligi", False)]),
        ("Ashtarxoniylar sulolasi yana qanday nom bilan ham ataladi?", "medium",
         [("Joniylar", True), ("Mang'itlar", False), ("Qo'ng'irotlar", False), ("Ming sulolasi", False)]),
        ("Buxoro xonligida Ashtarxoniylardan keyin qaysi sulola hokimiyat tepasiga kelgan?", "medium",
         [("Mang'itlar", True), ("Qo'ng'irotlar", False), ("Ming", False), ("Qorlug'lar", False)]),
        ("Shayboniyxon qaysi jangda halok bo'lgan?", "hard",
         [("Safaviylar bilan Marv yaqinidagi jangda", True), ("Mo'g'ullar bilan Urganch jangida", False),
          ("Boburiylar bilan Kobul jangida", False), ("Usmonlilar bilan Anqara jangida", False)]),
        ("Shayboniylar davrida Buxoroda qurilgan mashhur madrasa qaysi?", "medium",
         [("Mir Arab madrasasi", True), ("Registon maydoni", False), ("Bibixonim masjidi", False), ("Gur Amir maqbarasi", False)]),
        ("Abdullaxon II davrida qaysi savdo yo'nalishi yana faollashgan?", "easy",
         [("Buyuk Ipak yo'li", True), ("Dengiz orqali Hindiston yo'li", False), ("Rossiya-Sibir yo'li", False), ("Amerika savdo yo'li", False)]),
        ("Shayboniylar sulolasi qaysi yirik turkiy-mo'g'ul davlatining avlodi hisoblanadi?", "hard",
         [("Oltin O'rda", True), ("Usmonli imperiyasi", False), ("Safaviylar", False), ("Boburiylar", False)]),
        ("Movarounnahrda Shayboniylar sulolasi hukmronligi qaysi sulola bilan almashtirilgan?", "medium",
         [("Ashtarxoniylar", True), ("Qoraxoniylar", False), ("Temuriylar", False), ("Qo'ng'irotlar", False)]),
    ],
    "chor-rossiyasi-davri": [
        ("Rossiya imperiyasi Toshkentni qaysi yili bosib olgan?", "medium",
         [("1865-yil", True), ("1868-yil", False), ("1876-yil", False), ("1873-yil", False)]),
        ("Buxoro amirligi Rossiya imperiyasiga qaram (protektorat) bo'lib qolgani qaysi yili rasmiylashtirilgan?", "medium",
         [("1868-yil", True), ("1865-yil", False), ("1876-yil", False), ("1873-yil", False)]),
        ("Qo'qon xonligi Rossiya tomonidan qachon tugatilib, Farg'ona viloyatiga aylantirilgan?", "medium",
         [("1876-yil", True), ("1868-yil", False), ("1865-yil", False), ("1873-yil", False)]),
        ("Xiva xonligi Rossiya protektoratiga qachon aylangan?", "medium",
         [("1873-yil", True), ("1868-yil", False), ("1876-yil", False), ("1865-yil", False)]),
        ("Rossiya imperiyasi bosib olgan O'rta Osiyo hududlari qanday ma'muriy birlik deb atalgan?", "easy",
         [("Turkiston general-gubernatorligi", True), ("Turkiston SSR", False), ("Movarounnahr viloyati", False), ("O'rta Osiyo respublikasi", False)]),
        ("Turkiston general-gubernatorligining birinchi general-gubernatori kim bo'lgan?", "hard",
         [("K.P. fon Kaufman", True), ("M.G. Chernyayev", False), ("A.N. Kuropatkin", False), ("N.O. Rozenbax", False)]),
        ("Chor Rossiyasi davrida rus dehqonlarining O'rta Osiyoga ko'chirib keltirilishi siyosati nima maqsadda olib borilgan?", "medium",
         [("Yerlarni o'zlashtirish va mintaqani mustamlaka qilish", True), ("Mahalliy xalqqa yer bo'lib berish", False),
          ("Savdo aloqalarini rivojlantirish", False), ("Ta'lim tizimini isloh qilish", False)]),
        ("1916-yilgi qo'zg'olon asosan nimaga qarshi ko'tarilgan?", "medium",
         [("Aholini frontga mardikorlikka safarbar etish farmoniga qarshi", True), ("Soliqlarni kamaytirishga qarshi", False),
          ("Yerlarni bepul berishga qarshi", False), ("Ta'lim islohotiga qarshi", False)]),
        ("Chor Rossiyasi davrida paxtachilikning jadal rivojlanishi asosan nima bilan bog'liq edi?", "medium",
         [("Rossiya to'qimachilik sanoati uchun xomashyo ehtiyoji", True), ("Mahalliy aholining ozuqa ehtiyoji", False),
          ("Yevropaga gul eksporti", False), ("Chorvachilikni rivojlantirish", False)]),
        ("Jadidchilik harakati qachon paydo bo'lgan?", "medium",
         [("XIX asr oxiri - XX asr boshi", True), ("XVI asr", False), ("Sovet davri", False), ("Mustaqillik davri", False)]),
        ("Turkiston avtonomiyasi (Qo'qon avtonomiyasi) qachon e'lon qilingan?", "hard",
         [("1917-yil", True), ("1924-yil", False), ("1905-yil", False), ("1898-yil", False)]),
        ("1898-yilda Andijonda chor istibdodiga qarshi ko'tarilgan qo'zg'olonga kim boshchilik qilgan?", "hard",
         [("Dukchi eshon", True), ("Mahmudxo'ja Behbudiy", False), ("Munavvar qori", False), ("Abdulla Avloniy", False)]),
    ],
    "sovet-mustaqillik-davri": [
        ("O'zbekiston SSR qachon tashkil topgan?", "medium",
         [("1924-yil", True), ("1917-yil", False), ("1936-yil", False), ("1991-yil", False)]),
        ("O'zbekiston davlat mustaqilligi to'g'risidagi qonun qachon qabul qilingan?", "easy",
         [("1991-yil 31-avgust", True), ("1991-yil 1-sentyabr", False), ("1990-yil 20-iyun", False), ("1992-yil 8-dekabr", False)]),
        ("O'zbekiston Respublikasining Mustaqillik kuni qachon nishonlanadi?", "easy",
         [("1-sentyabr", True), ("31-avgust", False), ("8-dekabr", False), ("21-oktabr", False)]),
        ("O'zbekiston Respublikasining birinchi Prezidenti kim bo'lgan?", "easy",
         [("Islom Karimov", True), ("Shavkat Mirziyoyev", False), ("Faizulla Xo'jayev", False), ("Yo'ldosh Oxunboboyev", False)]),
        ("O'zbekiston Respublikasining birinchi Konstitutsiyasi qachon qabul qilingan?", "medium",
         [("1992-yil 8-dekabr", True), ("1991-yil 31-avgust", False), ("1993-yil", False), ("1994-yil", False)]),
        ("Fitrat, Cho'lpon va Abdulla Qodiriy kabi ziyolilar qaysi davrda qatag'on qilingan?", "medium",
         [("1937-1938-yillarda (Stalin repressiyasi)", True), ("1917-1920-yillarda", False), ("1950-yillarda", False), ("1980-yillarda", False)]),
        ("O'zbekiston milliy valyutasi so'm qachon to'liq muomalaga kiritilgan?", "medium",
         [("1994-yil", True), ("1991-yil", False), ("1992-yil", False), ("2000-yil", False)]),
        ("Toshkent markazida Amir Temur haykali qachon o'rnatilgan?", "medium",
         [("1994-yil", True), ("1991-yil", False), ("2000-yil", False), ("2007-yil", False)]),
        ("O'zbekiston Birlashgan Millatlar Tashkilotiga qachon a'zo bo'lgan?", "medium",
         [("1992-yil", True), ("1991-yil", False), ("1994-yil", False), ("1996-yil", False)]),
        ("O'zbekiston Respublikasining Davlat bayrog'i qachon qabul qilingan?", "hard",
         [("1991-yil 18-noyabr", True), ("1992-yil 8-dekabr", False), ("1991-yil 31-avgust", False), ("1993-yil", False)]),
        ("Shavkat Mirziyoyev O'zbekiston Prezidenti etib qachon saylangan?", "easy",
         [("2016-yil", True), ("2014-yil", False), ("2019-yil", False), ("2021-yil", False)]),
        ("O'zbekistonda \"Harakatlar strategiyasi\" qaysi yillar uchun qabul qilingan?", "hard",
         [("2017-2021-yillar", True), ("2022-2026-yillar", False), ("2010-2015-yillar", False), ("2005-2010-yillar", False)]),
    ],
}

TEST_TITLES_BY_TOPIC = {
    "qadimgi-tarix": "Qadimgi O'zbekiston tarixi testi",
    "qoraxoniylar-xorazmshohlar": "Qoraxoniylar va Xorazmshohlar davri testi",
    "shayboniylar-ashtarxoniylar": "Shayboniylar va Ashtarxoniylar davri testi",
    "chor-rossiyasi-davri": "Chor Rossiyasi mustamlakachiligi davri testi",
    "sovet-mustaqillik-davri": "Sovet va Mustaqillik davri tarixi testi",
}

# ---------------------------------------------------------------------------
# 3. Historical characters (tarix shaxslar o'yini)
# ---------------------------------------------------------------------------

NEW_CHARACTERS = [
    dict(name="Mirzo Ulug'bek", difficulty="medium",
         clue_1="Amir Temur avlodidan bo'lgan bu shaxs Samarqandda buyuk rasadxona qurdirgan.",
         clue_2="U yulduzlar jadvalini tuzgan mashhur olim va Movarounnahr hukmdori bo'lgan.",
         clue_3="1449-yilda o'z o'g'li fitnasi natijasida fojiali vafot etgan Temuriy shahzoda-astronom."),
    dict(name="Alisher Navoiy", difficulty="easy",
         clue_1="Hirot shahrida tug'ilib, o'zbek adabiyotining asoschisi hisoblanadi.",
         clue_2="\"Xamsa\" asarining muallifi bo'lib, forscha va turkchada ijod qilgan.",
         clue_3="Temuriy shahzoda Husayn Boyqaro davrida vazir bo'lib xizmat qilgan buyuk shoir va mutafakkir."),
    dict(name="Abu Ali ibn Sino", difficulty="medium",
         clue_1="Buxoro yaqinidagi Afshona qishlog'ida tug'ilgan buyuk qomusiy olim.",
         clue_2="Tibbiyotga oid \"Tib qonunlari\" asari asrlar davomida Yevropa universitetlarida darslik bo'lgan.",
         clue_3="G'arbda Avitsenna nomi bilan tanilgan, falsafa va tibbiyot sohasidagi buyuk alloma."),
    dict(name="Abu Rayhon Beruniy", difficulty="medium",
         clue_1="Xorazmning Kot shahrida tug'ilgan qomusiy olim.",
         clue_2="Yer sharining aylanasini yuqori aniqlik bilan hisoblab chiqqan.",
         clue_3="\"Osori-al-boqiya\" va Hindiston haqidagi asarlari bilan mashhur bo'lgan mutafakkir."),
    dict(name="Muhammad al-Xorazmiy", difficulty="medium",
         clue_1="Xorazmda tug'ilgan, Bag'dodda \"Bayt ul-hikma\"da faoliyat yuritgan olim.",
         clue_2="Algebra fanining asoschisi hisoblanadi, uning nomidan \"algoritm\" so'zi kelib chiqqan.",
         clue_3="\"Al-jabr val-muqobala\" asarining muallifi bo'lgan buyuk matematik va astronom."),
    dict(name="Imom al-Buxoriy", difficulty="easy",
         clue_1="Buxoro shahrida tug'ilgan buyuk hadis olimi.",
         clue_2="\"Al-Jome' as-sahih\" nomli hadislar to'plamini yozgan.",
         clue_3="Musulmon olamida Qur'ondan keyin eng ishonchli manba hisoblangan hadis kitobining muallifi."),
    dict(name="Imom at-Termiziy", difficulty="medium",
         clue_1="Termiz shahrida tug'ilgan mashhur hadis olimi.",
         clue_2="\"Sunan at-Termiziy\" nomli hadislar to'plamini tuzgan.",
         clue_3="Olti ishonchli hadis to'plami (Kutubi sitta) mualliflaridan biri."),
    dict(name="Jaloliddin Manguberdi", difficulty="hard",
         clue_1="Xorazmshohlar sulolasining so'nggi vakillaridan biri.",
         clue_2="Mo'g'ullarga qarshi Parvon jangida g'alaba qozongan.",
         clue_3="Sind daryosi bo'yida Chingizxonning o'ziga qarshi jangda qatnashgan vatanparvar sarkarda."),
    dict(name="Ismoil Somoniy", difficulty="medium",
         clue_1="Buxoroda hukmronlik qilgan sulolaning asoschisi hisoblanadi.",
         clue_2="Uning davrida Buxoro ilm-fan va savdo markaziga aylangan.",
         clue_3="Somoniylar davlatiga asos solgan, O'zbekiston milliy valyutasi nomi bilan ham bog'liq amir."),
    dict(name="Mahmud Qoshg'ariy", difficulty="hard",
         clue_1="Qoraxoniylar davrida yashagan turkiy tilshunos olim.",
         clue_2="Turkiy tillarning birinchi qomusiy lug'atini yaratgan.",
         clue_3="\"Devonu lug'otit turk\" asarining muallifi."),
    dict(name="Muhammad Shayboniyxon", difficulty="medium",
         clue_1="XVI asr boshida Movarounnahrni Temuriylardan tortib olgan hukmdor.",
         clue_2="Buxoro va Samarqandda yangi sulola - Shayboniylar hukmronligiga asos solgan.",
         clue_3="Safaviylar shohi Ismoil I bilan Marv yaqinidagi jangda halok bo'lgan o'zbek xoni."),
    dict(name="Mahmudxo'ja Behbudiy", difficulty="medium",
         clue_1="XX asr boshida yashagan ma'rifatparvar va jamoat arbobi.",
         clue_2="Jadidchilik harakatining yetakchi namoyandalaridan biri bo'lgan.",
         clue_3="\"Padarkush\" pyesasi muallifi, o'zbek teatri asoschilaridan biri hisoblangan jadid."),
    dict(name="Spitamen", difficulty="hard",
         clue_1="Miloddan avvalgi IV asrda yashagan sug'd sarkardasi.",
         clue_2="Aleksandr Makedonskiy qo'shinlariga qarshi qattiq qarshilik ko'rsatgan.",
         clue_3="Sug'd va Baqtriya xalqlarini yunon-makedon istilochilariga qarshi safarbar etgan qo'mondon."),
    dict(name="Ahmad al-Farg'oniy", difficulty="medium",
         clue_1="Farg'ona vodiysida tug'ilgan o'rta asr olimi.",
         clue_2="Astronomiya va geografiya sohalarida asarlar yozgan, Bag'dodda faoliyat yuritgan.",
         clue_3="Yer shari diametrini o'lchagan, Yevropada \"Alfraganus\" nomi bilan tanilgan olim."),
]

# ---------------------------------------------------------------------------
# 4. Map challenges (tarix xaritasi o'yini)
# ---------------------------------------------------------------------------

# Each challenge gets its own real, region-specific map (instead of one generic image reused
# everywhere) — a map of the actual empire/dynasty the question is about, sourced from Wikimedia
# Commons and verified to resolve before use.
NEW_MAP_CHALLENGES = [
    dict(title="Ismoil Somoniylar davlati markazi",
         description="Somoniylar davlati ilk bor shakllangan va poytaxti bo'lgan hududni belgilang.",
         correct_location="Buxoro",
         options=["Buxoro", "Samarqand", "Xorazm", "Farg'ona"],
         map_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Samanid_Empire_%28greatest_extent%29.svg/960px-Samanid_Empire_%28greatest_extent%29.svg.png"),
    dict(title="Xorazmshohlar davlati poytaxti",
         description="Xorazmshohlar sulolasining dastlabki poytaxti bo'lgan shaharni aniqlang.",
         correct_location="Urganch",
         options=["Urganch", "Termiz", "Andijon", "Qarshi"],
         map_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Khwarazmian_dynasty_%28greatest_extent%29.svg/960px-Khwarazmian_dynasty_%28greatest_extent%29.svg.png"),
    dict(title="Qo'qon xonligi hududi",
         description="Qo'qon xonligi asosan qaysi vodiyni o'z ichiga olgan edi?",
         correct_location="Farg'ona vodiysi",
         options=["Farg'ona vodiysi", "Zarafshon vodiysi", "Sirdaryo etaklari", "Ustyurt platosi"],
         map_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Map_of_the_Khanate_of_Kokand.png/960px-Map_of_the_Khanate_of_Kokand.png"),
    dict(title="Buxoro amirligi hududi",
         description="Buxoro amirligi markazi bo'lgan vodiyni belgilang.",
         correct_location="Zarafshon vodiysi",
         options=["Zarafshon vodiysi", "Farg'ona vodiysi", "Amudaryo etaklari", "Chirchiq vodiysi"],
         map_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Bukhara_map.svg/960px-Bukhara_map.svg.png"),
    dict(title="Qoraxoniylar davlati markazi",
         description="Qoraxoniylar davlati ilk bor shakllangan hududni aniqlang.",
         correct_location="Yettisuv",
         options=["Yettisuv", "Movarounnahr", "Xuroson", "Badaxshon"],
         map_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/%21Map_of_the_Kara-Khanid_Khanate.png/960px-%21Map_of_the_Kara-Khanid_Khanate.png"),
    dict(title="Qadimgi Sug'diyona",
         description="Qadimgi Sug'diyona davlati qaysi vohada joylashgan edi?",
         correct_location="Samarqand vohasi",
         options=["Samarqand vohasi", "Baqtriya", "Xorazm vohasi", "Farg'ona vodiysi"],
         map_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Map_of_Sogdia.png/960px-Map_of_Sogdia.png"),
]


def seed_topics():
    created = 0
    topics = {}
    for data in NEW_TOPICS:
        topic, was_created = Topic.objects.get_or_create(
            slug=data["slug"],
            defaults=dict(title=data["title"], category="history", order=data["order"]),
        )
        topics[data["slug"]] = topic
        created += int(was_created)
    print(f"Topics: {created} created, {len(NEW_TOPICS) - created} already existed.")
    return topics


def seed_questions_and_tests(topics):
    total_q_created = 0
    total_c_created = 0
    total_tests_created = 0

    for slug, questions in QUESTIONS_BY_TOPIC.items():
        topic = topics[slug]
        made_questions = []
        for text, difficulty, choices in questions:
            question, q_created = Question.objects.get_or_create(
                body=text,
                defaults=dict(topic=topic, difficulty=difficulty, category="history"),
            )
            total_q_created += int(q_created)
            if not question.choices.exists():
                for choice_text, is_correct in choices:
                    AnswerOption.objects.create(question=question, text=choice_text, is_correct=is_correct)
                    total_c_created += 1
            made_questions.append(question)

        test, test_created = TestSet.objects.get_or_create(
            title=TEST_TITLES_BY_TOPIC[slug],
            defaults=dict(
                description=f"{topic.title} bo'yicha bilimlaringizni sinab ko'ring.",
                category="history",
                duration_minutes=20,
                is_premium=True,
            ),
        )
        test.questions.add(*made_questions)
        total_tests_created += int(test_created)

    print(f"Questions: {total_q_created} created. Choices: {total_c_created} created.")
    print(f"Tests: {total_tests_created} created.")


def seed_characters():
    created = 0
    for data in NEW_CHARACTERS:
        _, was_created = HistoricalCharacter.objects.get_or_create(
            name=data["name"],
            defaults=dict(
                difficulty=data["difficulty"],
                clue_1=data["clue_1"],
                clue_2=data["clue_2"],
                clue_3=data["clue_3"],
            ),
        )
        created += int(was_created)
    print(f"Historical characters: {created} created, {len(NEW_CHARACTERS) - created} already existed.")


def seed_map_challenges():
    created = 0
    # Backfill options on the original seeded challenge so its template stays consistent.
    original = MapChallenge.objects.filter(title="Temuriylar Imperiyasi markazi").first()
    if original and not original.options:
        original.options = ["Movarounnahr", "Xuroson", "Eron", "Hindiston"]
        original.save(update_fields=["options"])

    for data in NEW_MAP_CHALLENGES:
        _, was_created = MapChallenge.objects.get_or_create(
            title=data["title"],
            defaults=dict(
                description=data["description"],
                correct_location=data["correct_location"],
                options=data["options"],
                map_image_url=data.get("map_image_url", MAP_IMAGE),
            ),
        )
        created += int(was_created)
    print(f"Map challenges: {created} created, {len(NEW_MAP_CHALLENGES) - created} already existed.")


# All-or-nothing: the TestSet is created before its questions, so a failure part
# way through used to leave an orphan test with 0 questions behind — visible in the
# catalogue but impossible to start. Re-running then piled up more orphans.
@transaction.atomic
def main():
    topics = seed_topics()
    seed_questions_and_tests(topics)
    seed_characters()
    seed_map_challenges()


if __name__ == "__main__":
    main()
