"""`import_pdf_tests`dan keyingi ikkinchi qadam: qoralama TestSet'ga haqiqiy javob kalitini
qo'llaydi va sahifa sarlavha/pastki matni kabi shovqinni savol matnidan tozalaydi.

Nega alohida buyruq: `import_pdf_tests` murakkab (jadval, moslashtirish, guruhlangan,
yozma) qog'ozlarni to'g'ri tuzilma bilan o'qiydi, lekin to'g'ri javobni bilmaydi — uni
AI taxmin qiladi (ishonchsiz) yoki --no-ai bilan bo'sh qoldiradi. Ko'p imtihon qog'ozlarida
esa haqiqiy javob kaliti PDF ICHIDA emas — alohida varaq/rasm sifatida keladi. Bu buyruq
o'sha kalitni JSON'dan o'qib, mavjud qoralamaga qo'llaydi.

JSON shakli:
    {
      "boilerplate": "har sahifada takrorlanadigan matn (ixtiyoriy, tozalanadi)",
      "yopiq": {"1": "B", "2": "C", ...},              <- oddiy variantli va jadvalli savollar
      "yopiq_izoh": {"22": "Diqqat: ..."},              <- ixtiyoriy, Question.explanation'ga yoziladi
      "yozma": {"36": ["a javob", "b javob"], ...},     <- ikki qismli yozma savollar
      "yozma_izoh": {"41": "..."},                      <- ixtiyoriy
      "yozma_bandlar": {"45": ["a band matni", "b band matni"]}   <- faqat parser
                                                             qism-bandlarga bo'la olmagan
                                                             savollar uchun (SubQuestion
                                                             qo'lda yaratiladi)
    }

"yopiq"dagi savollar TestSet ichida qanday tartibda kelsa ("ordered_questions"), shu
tartib bo'yicha 1, 2, 3... deb hisoblanadi — PDF'dagi savol raqami bilan bir xil bo'lishi
kerak. `question_type`ga qarab avtomatik moslashadi: single_choice/table_based/image_based
uchun A-D variantidan mos matnni topadi, grouped_item uchun umumiy A-F bankidan.

Ishlatish:
    python manage.py import_pdf_tests tests.pdf --title "Milliy Sertifikat №15" --no-ai
    python manage.py apply_answer_key "Milliy Sertifikat №15" tests_app/fixtures/pdf_imports/....json

    --dry-run bilan hech narsa saqlanmaydi, faqat mos kelmagan joylar ko'rsatiladi.

Testni nashr ETMAYDI — natijani panelning "Javoblarni tekshirish" sahifasida ko'rib
chiqib, keyin qo'lda nashr eting.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from tests_app.models import SubQuestion, TestSet

_CHOICE_TYPES = ('single_choice', 'image_based', 'table_based')


class Command(BaseCommand):
    help = "Qoralama TestSet'ga JSON'dan javob kalitini qo'llaydi (import_pdf_tests'dan keyingi qadam)."

    def add_arguments(self, parser):
        parser.add_argument('test_title', help="Javob qo'llanadigan TestSet'ning aniq sarlavhasi.")
        parser.add_argument('answer_key_json', help="Javob kaliti JSON fayli yo'li.")
        parser.add_argument('--dry-run', action='store_true', help="Hech narsa saqlamaydi, faqat tekshiradi.")

    def handle(self, *args, **options):
        path = Path(options['answer_key_json'])
        if not path.exists():
            raise CommandError(f"Fayl topilmadi: {path}")
        key = json.loads(path.read_text(encoding='utf-8'))

        ts = TestSet.objects.filter(title=options['test_title']).first()
        if not ts:
            raise CommandError(f"'{options['test_title']}' nomli TestSet topilmadi.")

        qs = ts.ordered_questions()
        problems = []
        dry = options['dry_run']

        with transaction.atomic():
            boilerplate = key.get('boilerplate', '')
            if boilerplate:
                cleaned = 0
                for q in qs:
                    if boilerplate in q.body:
                        body = q.body
                        while boilerplate in body:
                            body = body.replace(boilerplate, '')
                        if not dry:
                            q.body = body
                            q.save(update_fields=['body'])
                        cleaned += 1
                    for sub in q.sub_questions.all():
                        if boilerplate in sub.text:
                            if not dry:
                                sub.text = sub.text.replace(boilerplate, '').strip()
                                sub.save(update_fields=['text'])
                self.stdout.write(f"Sahifa shovqini tozalandi: {cleaned} ta savol.")

            for num_str, letter in key.get('yopiq', {}).items():
                num = int(num_str)
                if num > len(qs):
                    problems.append(f"#{num}: TestSet'da shuncha savol yo'q ({len(qs)} ta bor).")
                    continue
                q = qs[num - 1]
                if q.question_type in _CHOICE_TYPES:
                    opts = list(q.choices.all())
                    match = [o for o in opts if o.text.strip().upper().startswith(letter.upper() + ')')]
                    if not match:
                        problems.append(f"#{num} ({q.question_type}): '{letter}' varianti topilmadi.")
                        continue
                    if not dry:
                        for o in opts:
                            o.is_correct = o in match
                            o.save(update_fields=['is_correct'])
                elif q.question_type == 'grouped_item':
                    if not q.group_id:
                        problems.append(f"#{num}: grouped_item, lekin guruhga bog'lanmagan.")
                        continue
                    bank_opt = q.group.options.filter(label=letter.upper()).first()
                    if not bank_opt:
                        problems.append(f"#{num}: guruh bankida '{letter}' yo'q.")
                        continue
                    if not dry:
                        q.correct_group_option = bank_opt
                        q.save(update_fields=['correct_group_option'])
                else:
                    problems.append(f"#{num}: '{q.question_type}' turi 'yopiq' kalitida kutilmagan.")

            for num_str, note in key.get('yopiq_izoh', {}).items():
                num = int(num_str)
                if num <= len(qs) and not dry:
                    q = qs[num - 1]
                    q.explanation = note
                    q.save(update_fields=['explanation'])

            bandlar = key.get('yozma_bandlar', {})
            for num_str, answers in key.get('yozma', {}).items():
                num = int(num_str)
                if num > len(qs):
                    problems.append(f"#{num}: TestSet'da shuncha savol yo'q.")
                    continue
                q = qs[num - 1]
                if q.question_type != 'open_written':
                    problems.append(f"#{num}: '{q.question_type}' turi 'yozma' kalitida kutilmagan.")
                    continue
                subs = list(q.sub_questions.all())
                if not subs:
                    # Parser qism-bandlarga bo'la olmagan — "yozma_bandlar"dan matn olib
                    # qo'lda yaratamiz.
                    texts = bandlar.get(num_str)
                    if not texts or len(texts) != len(answers):
                        problems.append(
                            f"#{num}: sub-savol yo'q va 'yozma_bandlar' da band matni berilmagan."
                        )
                        continue
                    if not dry:
                        for i, (label, text, ans) in enumerate(zip('abcdefgh', texts, answers), start=1):
                            SubQuestion.objects.create(question=q, label=label, text=text, reference_answer=ans, order=i)
                elif len(subs) != len(answers):
                    problems.append(f"#{num}: {len(subs)} ta sub-savol bor, kalitda {len(answers)} ta javob.")
                elif not dry:
                    for sub, ans in zip(subs, answers):
                        sub.reference_answer = ans
                        sub.save(update_fields=['reference_answer'])

            for num_str, note in key.get('yozma_izoh', {}).items():
                num = int(num_str)
                if num <= len(qs) and not dry:
                    q = qs[num - 1]
                    q.explanation = note
                    q.save(update_fields=['explanation'])

            if dry:
                transaction.set_rollback(True)

        if problems:
            self.stdout.write(self.style.WARNING(f"{len(problems)} ta muammo:"))
            for p in problems:
                self.stdout.write(f"  {p}")
        else:
            self.stdout.write(self.style.SUCCESS("Barcha javoblar mos keldi, muammo yo'q."))

        if dry:
            self.stdout.write(self.style.WARNING("(sinov rejimi — hech narsa saqlanmadi)"))
        else:
            self.stdout.write("Test hali NASHR ETILMAGAN — panelda \"Javoblarni tekshirish\" orqali ko'rib chiqing.")
