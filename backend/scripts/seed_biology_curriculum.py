"""
Seed topics and practice questions for Biologiya, Ona tili, and Matematika.
Ensures the learning loop has rich, topic-aligned questions for each subject.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.db import transaction
from tests_app.models import Subject, Question, AnswerOption
from learning.models import Topic

BIOLOGY_TOPICS = [
    {
        'title': "Hujayra biologiyasi va Sitologiya",
        'slug': "biologiya-hujayra-sitologiya",
        'order': 1,
        'description': "Hujayra organoidlari, fotosintez, moddalar va energiya almashinuvi.",
        'questions': [
            ("O'simliklarda fotosintez jarayoni qaysi organoidda boradi?", "easy", [
                ("Xloroplastlarda", True), ("Mitoxondriyalarda", False), ("Ribosomalarda", False), ("Vakuolada", False),
            ], "Fotosintez jarayoni o'simlik hujayralaridagi xloroplastlarda yorug'lik ta'sirida kechadi."),
            ("Hujayraning 'energiya stansiyasi' qaysi organoid hisoblanadi?", "easy", [
                ("Mitoxondriya", True), ("Lizosoma", False), ("Golji majmuasi", False), ("Yadrocha", False),
            ], "Mitoxondriyalar hujayra nafas olishida ATF sintezlab, asosiy energiya beruvchi hisoblanadi."),
            ("Oqsillarni sintezlovchi membranali bo'lmagan hujayra organoidi qaysi?", "easy", [
                ("Ribosoma", True), ("Sentriola", False), ("Lizosoma", False), ("Peroksisoma", False),
            ], "Ribosomalar oqsil biosintezini amalga oshiruvchi universal organoiddir."),
            ("Eukariot hujayra yadrosida irsiy axborot qayerda saqlanadi?", "medium", [
                ("Xromatin (xromosoma)da", True), ("Yadro sharbatida", False), ("Yadro qobig'ida", False), ("Sitoplazmada", False),
            ], "Eukariotlarda DNK xromosomalar tarkibidagi xromatin iplari ko'rinishida yadroda saqlanadi."),
            ("O'simlik hujayrasining qobig'i (hujayra devori) asosan nimadan tuzilgan?", "medium", [
                ("Selluloza (kletchatka)dan", True), ("Xitindan", False), ("Murindan", False), ("Glikogendan", False),
            ], "O'simliklar hujayra devori mustahkam selluloza polisaxarididan iborat."),
            ("Hujayraning parchalovchi, hazm qiluvchi fermentlarga boy organoidi qaysi?", "medium", [
                ("Lizosoma", True), ("Plastida", False), ("Ribosoma", False), ("Sentrosoma", False),
            ], "Lizosomalar gidrolitik fermentlarga ega bo'lib, hujayra ichki hazmida qatnashadi."),
            ("Prokariot (yadosiz) organizmlarga qaysi guruh vakillari kiradi?", "easy", [
                ("Bakteriyalar va sianobakteriyalar", True), ("Zamburug'lar", False), ("Bir hujayrali suvo'tlar", False), ("Soddalashgan parazit hayvonlar", False),
            ], "Bakteriyalar va ko'k-yashil suvo'tlar (sianobakteriyalar) prokariotlarga mansub."),
            ("ATF molekulasidagi makroergik bog'lar soni nechta?", "hard", [
                ("2 ta", True), ("3 ta", False), ("1 ta", False), ("4 ta", False),
            ], "ATF molekulasida fosfat qoldiqlari orasida 2 ta yuqori energiyali (makroergik) bog' mavjud."),
        ]
    },
    {
        'title': "Genetika va Irsiyat qonuniyatlari",
        'slug': "biologiya-genetika-irsiyat",
        'order': 2,
        'description': "Mendel qonunlari, xromosomalar, DNK replikatsiyasi va mutatsiyalar.",
        'questions': [
            ("Genetika fanining asoschisi kim hisoblanadi?", "easy", [
                ("Gregor Mendel", True), ("Charlz Darvin", False), ("Lui Paster", False), ("Robert Guk", False),
            ], "Gregor Mendel 1865-yilda no'xat o'simligida duragaylash orqali irsiyat qonunlarini kashf etdi."),
            ("Odamning somatik (tana) hujayralarida nechta xromosoma mavjud?", "easy", [
                ("46 ta (23 juft)", True), ("48 ta (24 juft)", False), ("44 ta (22 juft)", False), ("23 ta", False),
            ], "Odamning tana hujayralarida 23 juft (46 ta) xromosoma bor; jinsiy hujayralarda 23 ta bo'ladi."),
            ("DNK molekulasida adenin (A) ga komplementar azot asosi qaysi?", "easy", [
                ("Timin (T)", True), ("Guanin (G)", False), ("Sitozin (S)", False), ("Urasil (U)", False),
            ], "DNK da komplementarlik qoidasiga ko'ra A har doim T bilan, G esa S bilan bog'lanadi."),
            ("Genotipida bir xil allel genlarni saqlagan organizm nima deyiladi?", "medium", [
                ("Gomozigota (AA yoki aa)", True), ("Geterozigota (Aa)", False), ("Gemizigota", False), ("Fenotip", False),
            ], "Bir xil allel genlarni olib yuruvchi organizmlar gomozigotali deb ataladi."),
            ("DNK dagi axborot asosida i-RNK sintezlanish jarayoni nima deyiladi?", "medium", [
                ("Transkripsiya", True), ("Translyatsiya", False), ("Replikatsiya", False), ("Denaturatsiya", False),
            ], "Yadroda DNK matritsasida RNK sintezi transkripsiya deb nomlanadi."),
            ("Organizm belgilarining tashqi va ichki xususiyatlari yig'indisi nima deyiladi?", "medium", [
                ("Fenotip", True), ("Genotip", False), ("Kariotip", False), ("Genofond", False),
            ], "Genotipning tashqi muhit bilan o'zaro ta'sirida namoyon bo'lishi fenotip deb ataladi."),
            ("Viruslarning bakteriyalarga yuquvchi va ularni erituvchi turi nima deyiladi?", "medium", [
                ("Bakteriofag", True), ("Vaktsina", False), ("Antibiotik", False), ("Plazmida", False),
            ], "Bakteriyalarni zararlaydigan viruslar bakteriofaglar deb yuritiladi."),
            ("Monoduragay chatishtirishda (Aa x Aa) ikkinchi bo'g'inda fenotipik ajralish qanday nisbatda bo'ladi?", "hard", [
                ("3 : 1", True), ("1 : 2 : 1", False), ("9 : 3 : 3 : 1", False), ("1 : 1", False),
            ], "Dominantlik to'liq bo'lganda fenotip bo'yicha ajralish 3:1 (3 ta dominant, 1 ta retsessiv) bo'ladi."),
        ]
    },
    {
        'title': "Odam anatomiyasi va Fiziologiyasi",
        'slug': "biologiya-odam-anatomiyasi",
        'order': 3,
        'description': "Skelet, qon aylanish, asab, nafas olish va ichki a'zolar tizimi.",
        'questions': [
            ("Odam skeletida katta yoshda o'rtacha nechta suyak mavjud?", "easy", [
                ("206 ta atrofida", True), ("150 ta", False), ("300 ta", False), ("100 ta", False),
            ], "Katta yoshli inson skeletida o'rtacha 206 dan 208 tagacha suyak mavjud bo'ladi."),
            ("Qonning qaysi shaklli elementlari gemoglobin tutadi va kislorod tashiydi?", "easy", [
                ("Eritrotsitlar", True), ("Leykotsitlar", False), ("Trombotsitlar", False), ("Limfotsitlar", False),
            ], "Eritrotsitlar tarkibidagi gemoglobin oqsil-temir moddasi kislorodni butun tanaga tashiydi."),
            ("Yurakning qaysi kamerasidan katta qon aylanish doirasi boshlanadi?", "easy", [
                ("Chap qorinchadan", True), ("O'ng qorinchadan", False), ("Chap bo'lmachadan", False), ("O'ng bo'lmachadan", False),
            ], "Katta qon aylanish doirasi chap qorinchadan aortaga chiquvchi qon oqimi bilan boshlanadi."),
            ("O'simliklarda suv va mineral moddalarni ildizdan bargga yetkazuvchi to'qima?", "medium", [
                ("Ksilema (naylar)", True), ("Floema (elaksimon naylar)", False), ("Kambi qatlami", False), ("Periderma", False),
            ], "Ksilema (yog'ochlik) suv va minerallarni yuqoriga o'tkazuvchi o'tkazuvchi to'qimadir."),
            ("Asab tizimining morfologik va funksional asosiy hujayrasi qaysi?", "easy", [
                ("Neyron", True), ("Nefron", False), ("Miosit", False), ("Osteotsit", False),
            ], "Neyronlar impulslarni qabul qiluvchi va uzatuvchi asab hujayralaridir."),
            ("Buyrakning eng kichik mikroskopik funksional birligi nima deb ataladi?", "medium", [
                ("Nefron", True), ("Neyron", False), ("Alveola", False), ("Follikula", False),
            ], "Har bir buyrakda taxminan 1 millionta nefron bo'lib, qonni filtrlash vazifasini bajaradi."),
            ("Odamda ovqat hazm qilishda qaysi a'zo o't (safro) suyuqligini ishlab chiqaradi?", "medium", [
                ("Jigar", True), ("O't pufagi", False), ("Oshqozon osti bezi", False), ("Taloq", False),
            ], "Jigar o't suyuqligini doimiy ishlab chiqaradi, o't pufagi esa uni vaqtincha saqlab to'playdi."),
            ("Odam qon guruhlari tizimida umumiy (universal) qon beruvchi donor guruhi qaysi?", "medium", [
                ("I (0) guruh", True), ("IV (AB) guruh", False), ("II (A) guruh", False), ("III (B) guruh", False),
            ], "I (0) qon guruhi eritrotsitlarida agglyutinogenlar bo'lmagani uchun universal donor hisoblanadi."),
        ]
    }
]

@transaction.atomic
def seed_biology():
    subject, _ = Subject.objects.get_or_create(
        slug="biologiya",
        defaults={
            "name": "Biologiya",
            "icon_name": "dna",
            "color": "#10b981",
            "order": 4,
        }
    )

    total_added = 0
    for t_data in BIOLOGY_TOPICS:
        topic, _ = Topic.objects.get_or_create(
            subject=subject,
            slug=t_data['slug'],
            defaults={
                'title': t_data['title'],
                'description': t_data['description'],
                'order': t_data['order'],
                'category': 'bba',
            }
        )

        for q_tuple in t_data['questions']:
            q_text, diff, choices, expl = q_tuple
            q, created = Question.objects.get_or_create(
                subject=subject,
                body=q_text,
                defaults={
                    'topic': topic,
                    'difficulty': diff,
                    'question_type': 'single',
                    'points': 1,
                    'explanation': expl,
                }
            )
            if created:
                for c_text, is_c in choices:
                    AnswerOption.objects.create(question=q, text=c_text, is_correct=is_c)
                total_added += 1
            elif q.topic_id != topic.id:
                q.topic = topic
                q.explanation = expl or q.explanation
                q.save(update_fields=['topic', 'explanation'])

    print(f"Biologiya topics and questions updated! Added {total_added} new questions. Total Biologiya Qs: {subject.questions.count()}")

if __name__ == '__main__':
    seed_biology()
