"""
Seed starter questions and test sets for Ona tili, Matematika, Biologiya, and Rus tili.
This ensures all subjects have questions for 7-Savol Blitz, BMB Stress Mode, and Standard Tests.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.db import transaction
from tests_app.models import Subject, Question, AnswerOption, TestSet

SEED_DATA = {
    'ona-tili': {
        'tests': [
            {
                'title': "Ona tili va Adabiyot — BMB Standart Testi",
                'description': "Morfologiya, fonetika va mumtoz adabiyot bo'yicha rasmiy BMB standarti.",
                'category': 'bba',
                'duration': 40,
            },
            {
                'title': "Ona tili Milliy Sertifikat Diagnostikasi",
                'description': "Matn tahlili, leksikologiya va grammatik me'yorlar.",
                'category': 'certificate',
                'duration': 60,
            }
        ],
        'questions': [
            ("Qaysi qatorda faqat jarangli undoshlar berilgan?", "easy", [
                ("b, d, g, z, v", True),
                ("p, t, k, s, f", False),
                ("m, n, l, r, q", False),
                ("sh, ch, x, h, s", False),
            ]),
            ("Qaysi so'z imlosida xatolikka yo'l qo'yilgan?", "easy", [
                ("Muxokama", True),
                ("Muhokama", False),
                ("Mubohasa", False),
                ("Munozara", False),
            ]),
            ("'Keltirdi' fe'lining zamoni va shaxs-sonini aniqlang.", "easy", [
                ("O'tgan zamon, III shaxs birlik", True),
                ("Hozirgi zamon, II shaxs ko'plik", False),
                ("Kelasi zamon, I shaxs birlik", False),
                ("O'tgan zamon, II shaxs birlik", False),
            ]),
            ("Qaysi javobda ibora berilgan?", "easy", [
                ("Ko'z yumib ochguncha", True),
                ("Qalin kitob", False),
                ("Baland bino", False),
                ("Katta daryo", False),
            ]),
            ("'Yaxshilik qil, daryoga tashla, baliq bilar...' Ushbu maqolda qanday gap turi qo'llangan?", "medium", [
                ("Qo'shma gap", True),
                ("Sodda yig'iq gap", False),
                ("So'z-gap", False),
                ("Shaxsi noma'lum gap", False),
            ]),
            ("Alisher Navoiy 'Xamsa'sining birinchi dostoni qaysi?", "medium", [
                ("Hayrat ul-abror", True),
                ("Farhod va Shirin", False),
                ("Layli va Majnun", False),
                ("Sab'ai sayyor", False),
            ]),
            ("Qaysi so'z yasovchi qo'shimcha yangi so'z hosil qiladi?", "medium", [
                ("-kor (paxtakor)", True),
                ("-lar (kitoblar)", False),
                ("-dan (uygacha)", False),
                ("-roq (kataroq)", False),
            ]),
            ("Zahiriddin Muhammad Boburning shoh asari 'Boburnoma' qaysi janrga mansub?", "medium", [
                ("Tarixiy-memuar (esdalik)", True),
                ("Doston", False),
                ("G'azal majmuasi", False),
                ("Falsafiy risola", False),
            ]),
            ("Quyidagi gapda nechta so'z turkumi mavjud: 'Biz bugun juda tez yurdik'?", "hard", [
                ("4 ta (olmosh, ravish, ravish, fe'l)", True),
                ("3 ta (ot, sifat, fe'l)", False),
                ("5 ta (olmosh, ot, ravish, sifat, fe'l)", False),
                ("2 ta (olmosh, fe'l)", False),
            ]),
            ("O'zbek tiliga davlat tili maqomi qachon berilgan?", "hard", [
                ("1989-yil 21-oktabr", True),
                ("1991-yil 1-sentabr", False),
                ("1992-yil 8-dekabr", False),
                ("1990-yil 24-mart", False),
            ]),
        ]
    },
    'matematika': {
        'tests': [
            {
                'title': "Matematika — BMB Standart Kirish Testi",
                'description': "Algebra, sonlar nazariyasi va tekislikdagi geometriya.",
                'category': 'bba',
                'duration': 50,
            },
            {
                'title': "Matematika Milliy Sertifikat Namunaviy Testi",
                'description': "Murakkab funksiyalar, tenglamalar va stereometriya.",
                'category': 'certificate',
                'duration': 75,
            }
        ],
        'questions': [
            ("2x + 8 = 20 tenglamaning ildizini toping.", "easy", [
                ("6", True),
                ("5", False),
                ("7", False),
                ("4", False),
            ]),
            ("To'g'ri to'rtburchakning bo'yi 8 sm, eni 5 sm. Uning yuzini toping.", "easy", [
                ("40 sm²", True),
                ("26 sm²", False),
                ("30 sm²", False),
                ("45 sm²", False),
            ]),
            ("Sonning 25% qismi 50 ga teng bo'lsa, sonning o'zini toping.", "easy", [
                ("200", True),
                ("150", False),
                ("100", False),
                ("250", False),
            ]),
            ("(-3) * (-4) + (-5) ifodaning qiymatini hisoblang.", "easy", [
                ("7", True),
                ("17", False),
                ("-17", False),
                ("-7", False),
            ]),
            ("Tenglamani yeching: x² - 9 = 0", "medium", [
                ("x = ±3", True),
                ("x = 3", False),
                ("x = 9", False),
                ("x = ±9", False),
            ]),
            ("Uchburchakning ichki burchaklari yig'indisi necha gradusga teng?", "medium", [
                ("180°", True),
                ("360°", False),
                ("90°", False),
                ("270°", False),
            ]),
            ("Arifmetik progressiyada a1 = 3, d = 4 bo'lsa, a5 ni toping.", "medium", [
                ("19", True),
                ("15", False),
                ("23", False),
                ("20", False),
            ]),
            ("sin²(x) + cos²(x) ning qiymati nimaga teng?", "medium", [
                ("1", True),
                ("0", False),
                ("2", False),
                ("tg(x)", False),
            ]),
            ("Doiraning radiusi 2 marta orttirilsa, uning yuzi necha marta ortadi?", "hard", [
                ("4 marta", True),
                ("2 marta", False),
                ("8 marta", False),
                ("16 marta", False),
            ]),
            ("log₂32 ning qiymatini toping.", "hard", [
                ("5", True),
                ("4", False),
                ("6", False),
                ("16", False),
            ]),
        ]
    },
    'biologiya': {
        'tests': [
            {
                'title': "Biologiya — BMB Standart Kirish Testi",
                'description': "Botanika, zoologiya va odam anatomiyasi bo'yicha DTM imtihoni.",
                'category': 'bba',
                'duration': 45,
            },
            {
                'title': "Biologiya Milliy Sertifikat Testi",
                'description': "Sitologiya, genetika va evolutsion ta'limot.",
                'category': 'certificate',
                'duration': 65,
            }
        ],
        'questions': [
            ("O'simliklarda fotosintez jarayoni qaysi organoidda boradi?", "easy", [
                ("Xloroplastlarda", True),
                ("Mitoxondriyalarda", False),
                ("Ribosomalarda", False),
                ("Vakuolada", False),
            ]),
            ("Odam skeletida nechta suyak mavjud (o'rtacha katta yoshda)?", "easy", [
                ("206 ta atrofida", True),
                ("150 ta", False),
                ("300 ta", False),
                ("100 ta", False),
            ]),
            ("Qonning qaysi shaklli elementlari kislorod tashiydi?", "easy", [
                ("Eritrotsitlar", True),
                ("Leykotsitlar", False),
                ("Trombotsitlar", False),
                ("Plazma oqsillari", False),
            ]),
            ("Hujayraning 'energiya stansiyasi' qaysi organoid?", "easy", [
                ("Mitoxondriya", True),
                ("Lizosoma", False),
                ("Golji majmuasi", False),
                ("Yadrocha", False),
            ]),
            ("Genetika fanining asoschisi kim hisoblanadi?", "medium", [
                ("Gregor Mendel", True),
                ("Charlz Darvin", False),
                ("Lui Paster", False),
                ("Robert Guk", False),
            ]),
            ("Odamda nechta xromosoma bor?", "medium", [
                ("46 ta (23 juft)", True),
                ("48 ta (24 juft)", False),
                ("44 ta (22 juft)", False),
                ("23 ta", False),
            ]),
            ("Yurakning qaysi qismidan katta qon aylanish doirasi boshlanadi?", "medium", [
                ("Chap qorinchadan", True),
                ("O'ng qorinchadan", False),
                ("Chap bo'lmachadan", False),
                ("O'ng bo'lmachadan", False),
            ]),
            ("O'simliklarda suv va mineral moddalarni ildizdan bargga yetkazuvchi to'qima?", "medium", [
                ("Ksilema (naylar)", True),
                ("Floema (elaksimon naylar)", False),
                ("Mexanik to'qima", False),
                ("Qoplovchi to'qima", False),
            ]),
            ("DNK molekulasida adenin (A) ga komplementar azot asosi qaysi?", "hard", [
                ("Timin (T)", True),
                ("Guanin (G)", False),
                ("Sitozin (S)", False),
                ("Urasil (U)", False),
            ]),
            ("Viruslarning bakteriyalarga yuquvchi turi nima deb ataladi?", "hard", [
                ("Bakteriofag", True),
                ("Vaktsina", False),
                ("Antibiotik", False),
                ("Plazmida", False),
            ]),
        ]
    },
    'rus-tili': {
        'tests': [
            {
                'title': "Русский язык — Стандарт БМБ (ЕГЭ/ДТМ)",
                'description': "Орфография, пунктуация, части речи и грамматика.",
                'category': 'bba',
                'duration': 40,
            },
            {
                'title': "Русский язык — Национальный сертификат",
                'description': "Синтаксис, лексика, анализ текста и культура речи.",
                'category': 'certificate',
                'duration': 60,
            }
        ],
        'questions': [
            ("Какая часть речи отвечает на вопросы 'кто?' и 'что?'?", "easy", [
                ("Имя существительное", True),
                ("Имя прилагательное", False),
                ("Глагол", False),
                ("Наречие", False),
            ]),
            ("В каком слове пишется буква 'О'?", "easy", [
                ("Шорох", True),
                ("Шёпот", False),
                ("Щёчка", False),
                ("Чёрный", False),
            ]),
            ("Укажите антоним к слову 'храбрый':", "easy", [
                ("Трусливый", True),
                ("Смелый", False),
                ("Умный", False),
                ("Добрый", False),
            ]),
            ("Сколько падежей в русском языке?", "easy", [
                ("6", True),
                ("5", False),
                ("7", False),
                ("8", False),
            ]),
            ("Какое слово является наречием?", "medium", [
                ("Быстро", True),
                ("Быстрый", False),
                ("Быстрота", False),
                ("Быстрее (глагол)", False),
            ]),
            ("В каком слове ударение падает на второй слог?", "medium", [
                ("Красивее", True),
                ("Торты", False),
                ("Звонит", False),
                ("Жалюзи", False),
            ]),
            ("Какое предложение является сложносочинённым?", "medium", [
                ("Солнце село, и наступила ночь.", True),
                ("Когда солнце село, наступила ночь.", False),
                ("Солнце село над лесом.", False),
                ("Заходящее солнце освещало луг.", False),
            ]),
            ("Кто написал роман в стихах 'Евгений Онегин'?", "medium", [
                ("А. С. Пушкин", True),
                ("М. Ю. Лермонтов", False),
                ("Л. Н. Толстой", False),
                ("Ф. М. Достоевский", False),
            ]),
            ("В каком слове на месте пропуска пишется 'НН'?", "hard", [
                ("Деревянный", True),
                ("Кожаный", False),
                ("Песчаный", False),
                ("Серебряный", False),
            ]),
            ("Укажите правильное объяснение фразеологизма 'бить баклуши':", "hard", [
                ("Бездельничать", True),
                ("Усердно работать", False),
                ("Играть на барабане", False),
                ("Ссориться", False),
            ]),
        ]
    }
}

@transaction.atomic
def seed():
    created_q_count = 0
    created_test_count = 0

    for slug, data in SEED_DATA.items():
        subject = Subject.objects.filter(slug=slug).first()
        if not subject:
            print(f"Subject not found: {slug}")
            continue

        # Check existing questions
        existing_qs = Question.objects.filter(subject=subject)
        q_objs = []
        if existing_qs.count() < 10:
            for text, diff, choices in data['questions']:
                q = Question.objects.create(
                    subject=subject,
                    body=text,
                    difficulty=diff,
                    question_type='single',
                    points=1
                )
                for c_text, is_c in choices:
                    AnswerOption.objects.create(question=q, text=c_text, is_correct=is_c)
                q_objs.append(q)
                created_q_count += 1
        else:
            q_objs = list(existing_qs)

        # Create tests if missing
        for t_spec in data['tests']:
            test, created = TestSet.objects.get_or_create(
                title=t_spec['title'],
                subject=subject,
                defaults={
                    'description': t_spec['description'],
                    'category': t_spec['category'],
                    'duration_minutes': t_spec['duration'],
                    'is_published': True,
                    'is_archived': False,
                    'is_premium': False,
                }
            )
            if created or test.questions.count() == 0:
                test.questions.set(q_objs)
                created_test_count += 1

    print(f"Done! Created {created_q_count} questions and {created_test_count} tests.")

if __name__ == '__main__':
    seed()
