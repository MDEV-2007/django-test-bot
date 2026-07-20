"""
Yangi Milliy Sertifikat testi: 25 ta savol, bitta mavzu ("Milliy sertifikat tayyorlov"),
yangi model imkoniyatlarini (mcq, matching, grouped, open) haqiqiy ishlatgan holda.

Barcha faktlar ishonchli, keng tanilgan tarixiy ma'lumotlar — noaniq/diagrammaga bog'liq
savollardan qochildi (avvalgi PDF-transkripsiyadagi kabi noaniqlik yo'q).
"""
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

from learning.models import Topic
from tests_app.models import Question, AnswerOption, MatchingPair, QuestionGroup, GroupOption, TestSet

TOPIC_SLUG = "milliy-sertifikat"


def main():
    topic, _ = Topic.objects.get_or_create(
        slug=TOPIC_SLUG,
        defaults={"title": "Milliy Sertifikat", "category": "certificate"},
    )
    test = TestSet.objects.create(
        title="Milliy Sertifikat testi — 25 savol",
        description="Milliy sertifikatga tayyorgarlik uchun aralash turdagi (variantli, "
                     "juftlashtirish, umumiy javob banki, ochiq javobli) 25 savollik test.",
        category="certificate",
        duration_minutes=40,
        is_premium=False,
    )
    created_questions = []

    # ------------------------------------------------------------------
    # 1) MCQ — 15 savol
    # ------------------------------------------------------------------
    mcq_data = [
        ("Amir Temur qaysi yilda tug'ilgan?", ["1330-yil", "1336-yil", "1340-yil", "1345-yil"], 1),
        ("Amir Temur davlatining poytaxti qaysi shahar bo'lgan?", ["Buxoro", "Samarqand", "Xorazm", "Termiz"], 1),
        ("Alisher Navoiy qaysi shaharda tug'ilgan?", ["Samarqand", "Hirot", "Buxoro", "Toshkent"], 1),
        ("Mirzo Ulug'bek qaysi soha bo'yicha mashhur bo'lgan?", ["Harbiy san'at", "Astronomiya", "Tibbiyot", "Me'morchilik"], 1),
        ("Ikkinchi jahon urushi qaysi yilda boshlangan?", ["1937-yil", "1938-yil", "1939-yil", "1941-yil"], 2),
        ("Ikkinchi jahon urushi qaysi yilda tugagan?", ["1943-yil", "1944-yil", "1945-yil", "1946-yil"], 2),
        ("Fransuz burjua inqilobi qaysi yilda boshlangan?", ["1776-yil", "1789-yil", "1799-yil", "1804-yil"], 1),
        ("AQSH mustaqilligini qaysi yilda e'lon qilgan?", ["1774-yil", "1776-yil", "1783-yil", "1789-yil"], 1),
        ("O'zbekiston Respublikasi mustaqilligini qaysi yilda e'lon qilgan?", ["1989-yil", "1990-yil", "1991-yil", "1992-yil"], 2),
        ("Birinchi jahon urushi qaysi yillar oralig'ida bo'lib o'tgan?", ["1912-1916", "1914-1918", "1916-1920", "1918-1922"], 1),
        ("Chingizxon qaysi asrda yashagan?", ["XI asr", "XII-XIII asr", "XIV asr", "XV asr"], 1),
        ("O'zbekistonda \"Milliy sertifikat\" tizimi qaysi yildan joriy etildi?", ["2018-yil", "2019-yil", "2020-yil", "2021-yil"], 2),
        ("\"Sohibqiron\" unvoni tarixda kimga nisbatan ishlatilgan?", ["Zahiriddin Muhammad Bobur", "Amir Temur", "Mirzo Ulug'bek", "Shohruh Mirzo"], 1),
        ("Zahiriddin Muhammad Bobur qaysi imperiyaga asos solgan?", ["Usmonli imperiyasi", "Safaviylar davlati", "Boburiylar (Buyuk Mo'g'ullar) imperiyasi", "Mug'ul ulusi"], 2),
        ("Mustaqil O'zbekiston Respublikasining birinchi Prezidenti kim bo'lgan?", ["Shavkat Mirziyoyev", "Islom Karimov", "Shukrullo Mirsaidov", "O'tkir Sultonov"], 1),
    ]
    for text, options, correct_idx in mcq_data:
        q = Question.objects.create(topic=topic, body=text, category="certificate", question_type="single_choice", difficulty="medium")
        for idx, opt in enumerate(options):
            AnswerOption.objects.create(question=q, text=opt, is_correct=(idx == correct_idx))
        created_questions.append(q)

    # ------------------------------------------------------------------
    # 2) Matching — 5 savol, har birida bitta distraktor
    # ------------------------------------------------------------------
    matching_data = [
        (
            "Tarixiy shaxslar va ularning faoliyatini bog'lang.",
            [("I", "Amir Temur", "a", "Temuriylar davlatiga asos solgan"),
             ("II", "Mirzo Ulug'bek", "b", "Mashhur rasadxona qurgan olim-hukmdor"),
             ("III", "Zahiriddin Muhammad Bobur", "c", "Boburiylar imperiyasiga asos solgan")],
            [("", "", "d", "Angliya qiroli bo'lgan")],
        ),
        (
            "Davlatlar va ularning poytaxtlarini bog'lang.",
            [("I", "Somoniylar davlati", "a", "Buxoro"),
             ("II", "Xorazmshohlar davlati", "b", "Urganch"),
             ("III", "Qo'qon xonligi", "c", "Qo'qon shahri")],
            [("", "", "d", "Toshkent")],
        ),
        (
            "Atamalar va ularning ta'riflarini bog'lang.",
            [("I", "Devalvatsiya", "a", "Milliy valyuta kursini rasman pasaytirish"),
             ("II", "Inflyatsiya", "b", "Narxlarning umumiy va uzoq muddatli o'sishi"),
             ("III", "Eksport", "c", "Mahsulot yoki xizmatni chet elga chiqarish")],
            [("", "", "d", "Mahsulotni chet eldan olib kirish (import)")],
        ),
        (
            "Jahon urushlari/qarama-qarshiliklari va ularning yakunini bog'lang.",
            [("I", "Birinchi jahon urushi", "a", "Versal shartnomasi bilan yakunlandi"),
             ("II", "Ikkinchi jahon urushi", "b", "Birlashgan Millatlar Tashkiloti (BMT) tuzildi"),
             ("III", "Sovuq urush", "c", "SSSR parchalanishi bilan yakunlandi")],
            [("", "", "d", "Yalta konferensiyasi bilan boshlandi")],
        ),
        (
            "Tarixiy davrlar va ularga xos xususiyatlarni bog'lang.",
            [("I", "Qadimgi dunyo", "a", "Yozuvning paydo bo'lishi va birinchi davlatlar"),
             ("II", "O'rta asrlar", "b", "Feodalizm va diniy institutlar hukmronligi"),
             ("III", "Yangi davr", "c", "Sanoat inqilobi va milliy davlatlarning shakllanishi")],
            [("", "", "d", "Raqamli texnologiyalar davri")],
        ),
    ]
    for text, pairs, distractors in matching_data:
        q = Question.objects.create(topic=topic, body=text, category="certificate", question_type="matching", difficulty="medium")
        order = 1
        for left_key, left_text, right_key, right_text in pairs:
            MatchingPair.objects.create(question=q, left_key=left_key, left_text=left_text,
                                         right_key=right_key, right_text=right_text, order=order)
            order += 1
        for left_key, left_text, right_key, right_text in distractors:
            MatchingPair.objects.create(question=q, left_key=left_key, left_text=left_text,
                                         right_key=right_key, right_text=right_text, order=order)
            order += 1
        created_questions.append(q)

    # ------------------------------------------------------------------
    # 3) Grouped — 1 umumiy bank (A-D), 3 savol shu bankdan javob tanlaydi
    # ------------------------------------------------------------------
    group = QuestionGroup.objects.create(
        test_set=test,
        instruction="Quyidagi 3 ta savolga mos javobni bir xil A-D variantlaridan tanlang.",
        order=1,
    )
    bank = [
        ("A", "Ikkinchi jahon urushi"),
        ("B", "Fransuz inqilobi"),
        ("C", "O'zbekiston mustaqilligi"),
        ("D", "Sovuq urush"),
    ]
    options_by_label = {}
    for idx, (label, text) in enumerate(bank, start=1):
        options_by_label[label] = GroupOption.objects.create(group=group, label=label, text=text, order=idx)

    grouped_data = [
        ("Qaysi voqea natijasida SSSR va AQSH o'rtasida uzoq davom etgan ideologik qarama-qarshilik boshlandi?", "D"),
        ("Qaysi voqea natijasida Bastiliya qamoqxonasi qulatilib, mutlaq monarxiya ag'darila boshladi?", "B"),
        ("Qaysi voqea natijasida O'zbekiston Respublikasi 1992-yilda Birlashgan Millatlar Tashkilotiga a'zo bo'ldi?", "C"),
    ]
    for text, correct_label in grouped_data:
        q = Question.objects.create(
            topic=topic, body=text, category="certificate", question_type="grouped_item",
            difficulty="medium", group=group, correct_group_option=options_by_label[correct_label],
        )
        created_questions.append(q)

    # ------------------------------------------------------------------
    # 4) Open (AI baholaydi) — 2 savol
    # ------------------------------------------------------------------
    open_data = [
        ("O'zbekiston Respublikasi Prezidenti lavozimini birinchi bo'lib kim egallagan?", "Islom Karimov"),
        ("Amir Temur qaysi shaharda vafot etgan?", "Otrar shahrida"),
    ]
    for text, reference_answer in open_data:
        q = Question.objects.create(
            topic=topic, body=text, category="certificate", question_type="open_written",
            difficulty="medium", reference_answer=reference_answer,
        )
        created_questions.append(q)

    test.questions.set(created_questions)
    print(f"Test yaratildi: {test.title} (id={test.id})")
    print(f"Jami savollar: {len(created_questions)}")
    types = {}
    for q in created_questions:
        types[q.question_type] = types.get(q.question_type, 0) + 1
    print("Turlar bo'yicha taqsimot:", types)


if __name__ == "__main__":
    main()
