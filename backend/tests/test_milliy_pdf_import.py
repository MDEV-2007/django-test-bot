"""`import_milliy_pdf` ajratuvchisining eng nozik ikki joyi.

PDF fikstura bilan to'liq import sinovi bu yerda yo'q (fayl og'ir va u faqat bitta
hujjatga tegishli) — buning o'rniga import vaqtida HAQIQATAN xato bergan ikkita
sof funksiya qamrab olinadi:

  1. Jadval kataklari. PDF'dan kelgan katak ko'pincha butun ustunni bitta satrga
     qamrab oladi ('I\\nII\\nIII'), ya'ni uni to'g'ridan-to'g'ri HTML qilib bo'lmaydi.
  2. Javob banki. E'lon matnida "(A–F)" yozuvi bor va undagi "F)" ham variant deb
     topilib, bank ikki marta "F" olgan edi — bu `unique_together` cheklovini buzib,
     import butunlay to'xtagan.
"""
from django.test import SimpleTestCase

from tests_app.management.commands.import_milliy_pdf import BANK_OPTION_RE, BANK_RE, Command

BANK_LINE = (
    "33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang: "
    "A) Kresi jangi (1346); B) Jakeriya qo’zg’oloni (1358); C) Trua shartnomasi (1420); "
    "D) Orlean ozod etilishi (1429); E) Janna d’Arkning qatl etilishi (1431); "
    "F) Yuz yillik urushning yakunlanishi (1453)"
)


class TableHtmlTests(SimpleTestCase):
    def test_column_cells_are_split_into_rows(self):
        """Bitta katakdagi ustun qatorlarga yoyiladi."""
        html = Command()._table_html([['I\nII', 'Birinchi\nIkkinchi']])

        self.assertIn('<th>I</th>', html)
        self.assertIn('<td>II</td>', html)
        self.assertIn('<td>Ikkinchi</td>', html)

    def test_html_is_escaped(self):
        html = Command()._table_html([['<b>', 'a & b']])

        self.assertNotIn('<b>', html)
        self.assertIn('&amp;', html)

    def test_empty_table_gives_empty_string(self):
        self.assertEqual(Command()._table_html([]), '')


class AnswerBankTests(SimpleTestCase):
    def test_declaration_is_recognised_with_its_range(self):
        match = BANK_RE.search(BANK_LINE)

        self.assertIsNotNone(match)
        self.assertEqual((match.group(1), match.group(2)), ('33', '35'))

    def test_options_are_read_only_after_the_colon(self):
        """"(A–F)" yozuvi variant deb sanalmasligi kerak."""
        _head, _sep, tail = BANK_LINE.partition(':')

        labels = [m.group(1) for m in BANK_OPTION_RE.finditer(tail)]

        self.assertEqual(labels, ['A', 'B', 'C', 'D', 'E', 'F'])
        self.assertEqual(len(labels), len(set(labels)), "takrorlangan harf bo'lmasligi kerak")

    def test_option_text_stops_at_the_separator(self):
        _head, _sep, tail = BANK_LINE.partition(':')

        first = next(BANK_OPTION_RE.finditer(tail))

        self.assertEqual(first.group(2).strip(), 'Kresi jangi (1346)')
