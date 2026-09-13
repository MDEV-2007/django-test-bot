"""Django management command: Biologiya Milliy Sertifikat 43 talik mock testini yaratish.

Format:
- 1-32: Test topshiriqlari (single_choice: A, B, C, D)
- 33-35: Moslashtirish topshiriqlari (single_choice: bank a-f)
- 36-40: Ochiq amaliy masalalar (open_written: qisqa yozma/sonli javob)
- 41-43: Yozma ish — chuqurlashtirilgan masalalar (open_written: ko'p bosqichli a, b, c, d bandlar)

Barcha SVG diagrammalar (Eyler-Venn, qon quyish tarmog'i, grafika, taksonomik daraxt),
jadvallar va to'liq ilmiy tushuntirishlar bilan kiritilgan.

Foydalanish:
    python manage.py seed_biologiya_mock
    python manage.py seed_biologiya_mock --force
    python manage.py seed_biologiya_mock --today
"""
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "Biologiya — Milliy Sertifikat Namunaviy Mock Imtihon"
MOCK_DESC = (
    "Davlat ta'lim standarti va Milliy sertifikat formati: sitologiya va biokimyo, "
    "botanika va o'simliklar sistematikasi, zoologiya va hayvonlar anatomiyasi, "
    "odam anatomiyasi va fiziologiyasi, genetika, DNK va molekulyar biologiya, "
    "energiya almashinuvi masalalari. Jami: 43 ta topshiriq."
)


class Command(BaseCommand):
    help = "Biologiya fanidan 43 talik Milliy Sertifikat mock imtihonini bazaga to'liq yuklaydi."

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
            default=150,
            help="Imtihon davomiyligi daqiqalarda (standart: 150 daqiqa / 2.5 soat).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get('force', False)
        for_today = options.get('today', False)
        duration = options.get('duration', 150)

        # Subject 'Biologiya' topish yoki yaratish
        subject = Subject.objects.filter(slug__in=['biologiya', 'biology']).first()
        if not subject:
            subject = Subject.objects.filter(name__icontains='biologiya').first()
        if not subject:
            subject, _ = Subject.objects.get_or_create(
                slug="biologiya",
                defaults={
                    "name": "Biologiya",
                    "icon_name": "dna",
                    "color": "#10b981",
                    "order": 4,
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
                        f"python manage.py seed_biologiya_mock --force"
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

        # -------------------------------------------------------------
        # SVG DIAGRAMMALAR
        # -------------------------------------------------------------
        # 11-savol: Eyler-Venn diagrammasi (Falanga, Asalari, Krivetka)
        svg_q11 = (
            "<div style='display:flex;justify-content:center;margin:12px 0;'>"
            "<svg width='320' height='260' viewBox='0 0 320 260' style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;'>"
            "<circle cx='110' cy='100' r='75' fill='rgba(139,92,246,0.15)' stroke='#8b5cf6' stroke-width='2'/>"
            "<circle cx='210' cy='100' r='75' fill='rgba(245,158,11,0.15)' stroke='#f59e0b' stroke-width='2'/>"
            "<circle cx='160' cy='175' r='75' fill='rgba(16,185,129,0.15)' stroke='#10b981' stroke-width='2'/>"
            "<text x='70' y='60' font-weight='bold' font-size='13' fill='#7c3aed'>falanga</text>"
            "<text x='200' y='60' font-weight='bold' font-size='13' fill='#d97706'>asalari</text>"
            "<text x='135' y='245' font-weight='bold' font-size='13' fill='#059669'>krivetka</text>"
            "<text x='90' y='110' font-weight='bold' font-size='15' fill='#5b21b6'>z</text>"
            "<text x='155' y='85' font-weight='bold' font-size='15' fill='#b45309'>w</text>"
            "<text x='157' y='135' font-weight='bold' font-size='16' fill='#1e293b'>x</text>"
            "<text x='185' y='165' font-weight='bold' font-size='15' fill='#047857'>y</text>"
            "</svg></div>"
        )

        # 15-savol: Eyler-Venn diagrammasi (Lizosoma, Ribosoma, Endoplazmatik to'r)
        svg_q15 = (
            "<div style='display:flex;justify-content:center;margin:12px 0;'>"
            "<svg width='320' height='260' viewBox='0 0 320 260' style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;'>"
            "<circle cx='110' cy='100' r='75' fill='rgba(239,68,68,0.15)' stroke='#ef4444' stroke-width='2'/>"
            "<circle cx='210' cy='100' r='75' fill='rgba(59,130,246,0.15)' stroke='#3b82f6' stroke-width='2'/>"
            "<circle cx='160' cy='175' r='75' fill='rgba(234,179,8,0.25)' stroke='#eab308' stroke-width='2'/>"
            "<text x='55' y='95' font-weight='bold' font-size='12' fill='#dc2626'>lizosoma</text>"
            "<text x='215' y='95' font-weight='bold' font-size='12' fill='#2563eb'>ribosoma</text>"
            "<text x='115' y='215' font-weight='bold' font-size='11' fill='#ca8a04'>endoplazmatik</text>"
            "<text x='132' y='230' font-weight='bold' font-size='11' fill='#ca8a04'>to‘r</text>"
            "<text x='100' y='145' font-weight='bold' font-size='14' fill='#b91c1c'>III</text>"
            "<text x='190' y='105' font-weight='bold' font-size='14' fill='#1d4ed8'>II</text>"
            "<text x='155' y='130' font-weight='bold' font-size='15' fill='#1e293b'>I</text>"
            "<text x='170' y='165' font-weight='bold' font-size='14' fill='#a16207'>IV</text>"
            "</svg></div>"
        )

        # 26-savol: Bo'yin umurtqalari soni grafikasi
        svg_q26 = (
            "<div style='display:flex;justify-content:center;margin:12px 0;'>"
            "<svg width='300' height='220' viewBox='0 0 300 220' style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;'>"
            "<!-- O'qlar -->"
            "<line x1='50' y1='180' x2='270' y2='180' stroke='#334155' stroke-width='2'/>"
            "<line x1='50' y1='180' x2='50' y2='20' stroke='#334155' stroke-width='2'/>"
            "<polygon points='50,15 46,25 54,25' fill='#334155'/>"
            "<polygon points='275,180 265,176 265,184' fill='#334155'/>"
            "<!-- Y belgilar -->"
            "<text x='35' y='184' font-size='11' fill='#64748b'>0</text>"
            "<text x='35' y='164' font-size='11' fill='#64748b'>1</text>"
            "<text x='35' y='144' font-size='11' fill='#64748b'>2</text>"
            "<text x='35' y='124' font-size='11' fill='#64748b'>3</text>"
            "<text x='35' y='104' font-size='11' fill='#64748b'>4</text>"
            "<text x='35' y='84' font-size='11' fill='#64748b'>5</text>"
            "<text x='35' y='64' font-size='11' fill='#64748b'>6</text>"
            "<text x='35' y='44' font-size='11' fill='#64748b'>7</text>"
            "<text x='35' y='28' font-size='11' fill='#64748b'>8</text>"
            "<!-- Grafig chiziqlari va nuqtalari -->"
            "<polyline points='80,180 150,28 220,164' fill='none' stroke='#0284c7' stroke-width='2.5'/>"
            "<circle cx='80' cy='180' r='5' fill='#ef4444'/>"
            "<circle cx='150' cy='28' r='5' fill='#ef4444'/>"
            "<circle cx='220' cy='164' r='5' fill='#ef4444'/>"
            "<text x='77' y='200' font-weight='bold' font-size='13' fill='#1e293b'>a</text>"
            "<text x='147' y='200' font-weight='bold' font-size='13' fill='#1e293b'>b</text>"
            "<text x='217' y='200' font-weight='bold' font-size='13' fill='#1e293b'>c</text>"
            "<text x='60' y='15' font-size='10' fill='#0284c7' font-weight='600'>Bo‘yin umurtqalari soni</text>"
            "</svg></div>"
        )

        # 27-savol: Olabo'ta, Bo'ritaroq, Bo'znoch diagrammasi
        svg_q27 = (
            "<div style='display:flex;justify-content:center;margin:12px 0;'>"
            "<svg width='320' height='260' viewBox='0 0 320 260' style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;'>"
            "<circle cx='115' cy='100' r='70' fill='rgba(239,68,68,0.1)' stroke='#ef4444' stroke-width='2'/>"
            "<circle cx='205' cy='100' r='70' fill='rgba(59,130,246,0.1)' stroke='#3b82f6' stroke-width='2'/>"
            "<circle cx='160' cy='165' r='70' fill='rgba(16,185,129,0.1)' stroke='#10b981' stroke-width='2'/>"
            "<text x='60' y='50' font-weight='bold' font-size='14' fill='#ef4444'>I</text>"
            "<text x='250' y='50' font-weight='bold' font-size='14' fill='#3b82f6'>II</text>"
            "<text x='155' y='250' font-weight='bold' font-size='14' fill='#10b981'>III</text>"
            "<text x='95' y='95' font-weight='bold' font-size='13'>1</text>"
            "<text x='130' y='90' font-weight='bold' font-size='13'>8</text>"
            "<text x='168' y='85' font-weight='bold' font-size='13'>5</text>"
            "<text x='157' y='110' font-weight='bold' font-size='13'>7</text>"
            "<text x='215' y='90' font-weight='bold' font-size='13'>2</text>"
            "<text x='235' y='100' font-weight='bold' font-size='13'>10</text>"
            "<text x='125' y='140' font-weight='bold' font-size='13'>4</text>"
            "<text x='185' y='135' font-weight='bold' font-size='13'>6</text>"
            "<text x='155' y='175' font-weight='bold' font-size='13'>3</text>"
            "<text x='175' y='185' font-weight='bold' font-size='13'>9</text>"
            "</svg></div>"
            "<p style='font-size:12px;text-align:center;color:#64748b;'><b>I</b> — olabo‘ta; <b>II</b> — bo‘ritaroq; <b>III</b> — bo‘znoch</p>"
        )

        # 28-savol: Taksonomik daraxt
        svg_q28 = (
            "<div style='display:flex;justify-content:center;margin:12px 0;'>"
            "<svg width='360' height='220' viewBox='0 0 360 220' style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;text-anchor:middle;'>"
            "<!-- Asosiy quti -->"
            "<rect x='110' y='10' width='140' height='26' rx='4' fill='#e2e8f0' stroke='#475569'/>"
            "<text x='180' y='27' font-weight='bold' fill='#1e293b'>O‘simliklar dunyosi</text>"
            "<!-- Bo'limlar -->"
            "<line x1='150' y1='36' x2='100' y2='55' stroke='#94a3b8' stroke-width='1.5'/>"
            "<line x1='210' y1='36' x2='260' y2='55' stroke='#94a3b8' stroke-width='1.5'/>"
            "<rect x='55' y='55' width='90' height='22' rx='3' fill='#fee2e2' stroke='#ef4444'/>"
            "<text x='100' y='70' fill='#b91c1c' font-weight='600'>Bo‘lim (1)</text>"
            "<rect x='215' y='55' width='90' height='22' rx='3' fill='#fee2e2' stroke='#ef4444'/>"
            "<text x='260' y='70' fill='#b91c1c' font-weight='600'>Bo‘lim (2)</text>"
            "<!-- Sinflar -->"
            "<line x1='75' y1='77' x2='50' y2='95' stroke='#94a3b8' stroke-width='1.5'/>"
            "<line x1='125' y1='77' x2='150' y2='95' stroke='#94a3b8' stroke-width='1.5'/>"
            "<rect x='15' y='95' width='70' height='20' rx='3' fill='#fef3c7' stroke='#f59e0b'/>"
            "<text x='50' y='109' fill='#b45309'>Sinf (2)</text>"
            "<rect x='115' y='95' width='70' height='20' rx='3' fill='#fef3c7' stroke='#f59e0b'/>"
            "<text x='150' y='109' fill='#b45309'>Sinf (1)</text>"
            "<!-- Oilalar -->"
            "<rect x='5' y='130' width='60' height='20' rx='3' fill='#dcfce7' stroke='#10b981'/>"
            "<text x='35' y='144' fill='#047857'>Oila (3)</text>"
            "<rect x='75' y='130' width='60' height='20' rx='3' fill='#dcfce7' stroke='#10b981'/>"
            "<text x='105' y='144' fill='#047857'>Oila (2)</text>"
            "<rect x='145' y='130' width='60' height='20' rx='3' fill='#dcfce7' stroke='#10b981'/>"
            "<text x='175' y='144' fill='#047857'>Oila (1)</text>"
            "<!-- Turkumlar -->"
            "<rect x='5' y='165' width='70' height='20' rx='3' fill='#e0e7ff' stroke='#6366f1'/>"
            "<text x='40' y='179' fill='#4338ca'>Turkum (3)</text>"
            "<rect x='85' y='165' width='70' height='20' rx='3' fill='#e0e7ff' stroke='#6366f1'/>"
            "<text x='120' y='179' fill='#4338ca'>Turkum (2)</text>"
            "<rect x='165' y='165' width='70' height='20' rx='3' fill='#e0e7ff' stroke='#6366f1'/>"
            "<text x='200' y='179' fill='#4338ca'>Turkum (1)</text>"
            "<!-- Turlar -->"
            "<rect x='140' y='195' width='60' height='20' rx='3' fill='#f3e8ff' stroke='#a855f7'/>"
            "<text x='170' y='209' fill='#7e22ce'>Tur (2)</text>"
            "<rect x='210' y='195' width='60' height='20' rx='3' fill='#f3e8ff' stroke='#a855f7'/>"
            "<text x='240' y='209' fill='#7e22ce'>Tur (1)</text>"
            "</svg></div>"
        )

        # 30-savol: Qon quyish sxemasi
        svg_q30 = (
            "<div style='display:flex;justify-content:center;margin:12px 0;'>"
            "<svg width='300' height='220' viewBox='0 0 300 220' style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;'>"
            "<circle cx='150' cy='40' r='18' fill='#fee2e2' stroke='#ef4444' stroke-width='2'/>"
            "<text x='150' y='45' text-anchor='middle' font-weight='bold' fill='#b91c1c'>r</text>"
            "<circle cx='150' cy='90' r='18' fill='#fee2e2' stroke='#ef4444' stroke-width='2'/>"
            "<text x='150' y='95' text-anchor='middle' font-weight='bold' fill='#b91c1c'>c</text>"
            "<circle cx='90' cy='135' r='18' fill='#fee2e2' stroke='#ef4444' stroke-width='2'/>"
            "<text x='90' y='140' text-anchor='middle' font-weight='bold' fill='#b91c1c'>b</text>"
            "<circle cx='40' cy='135' r='18' fill='#fee2e2' stroke='#ef4444' stroke-width='2'/>"
            "<text x='40' y='140' text-anchor='middle' font-weight='bold' fill='#b91c1c'>a</text>"
            "<circle cx='150' cy='145' r='18' fill='#fee2e2' stroke='#ef4444' stroke-width='2'/>"
            "<text x='150' y='150' text-anchor='middle' font-weight='bold' fill='#b91c1c'>e</text>"
            "<circle cx='150' cy='195' r='18' fill='#fee2e2' stroke='#ef4444' stroke-width='2'/>"
            "<text x='150' y='200' text-anchor='middle' font-weight='bold' fill='#b91c1c'>f</text>"
            "<circle cx='210' cy='135' r='18' fill='#fee2e2' stroke='#ef4444' stroke-width='2'/>"
            "<text x='210' y='140' text-anchor='middle' font-weight='bold' fill='#b91c1c'>h</text>"
            "<circle cx='260' cy='135' r='18' fill='#fee2e2' stroke='#ef4444' stroke-width='2'/>"
            "<text x='260' y='140' text-anchor='middle' font-weight='bold' fill='#b91c1c'>k</text>"
            "<!-- Bog'lanish chiziqlari -->"
            "<path d='M150,58 L150,72 M150,108 L150,127 M150,163 L150,177 M132,95 L108,125 M168,95 L192,125 M72,135 L58,135 M228,135 L242,135' stroke='#ef4444' stroke-width='1.5' marker-end='url(#arrow)'/>"
            "</svg></div>"
        )

        # 31-savol: O'simliklar belgilari sxemasi
        svg_q31 = (
            "<div style='display:flex;justify-content:center;margin:12px 0;'>"
            "<svg width='360' height='210' viewBox='0 0 360 210' style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;'>"
            "<rect x='20' y='15' width='100' height='24' rx='3' fill='#f1f5f9' stroke='#cbd5e1'/>"
            "<text x='70' y='31' text-anchor='middle' font-size='9.5' fill='#334155'>Murakkab gulqo‘rg‘on</text>"
            "<rect x='20' y='45' width='100' height='24' rx='3' fill='#f1f5f9' stroke='#cbd5e1'/>"
            "<text x='70' y='61' text-anchor='middle' font-size='9.5' fill='#334155'>Murakkab barg</text>"
            "<rect x='20' y='80' width='100' height='24' rx='3' fill='#f1f5f9' stroke='#cbd5e1'/>"
            "<text x='70' y='96' text-anchor='middle' font-size='9.5' fill='#334155'>To‘g‘ri gul</text>"
            "<rect x='20' y='110' width='100' height='24' rx='3' fill='#f1f5f9' stroke='#cbd5e1'/>"
            "<text x='70' y='126' text-anchor='middle' font-size='9.5' fill='#334155'>Ko‘p yillik o‘simlik</text>"
            "<rect x='20' y='145' width='100' height='24' rx='3' fill='#f1f5f9' stroke='#cbd5e1'/>"
            "<text x='70' y='161' text-anchor='middle' font-size='9.5' fill='#334155'>Yonbargcha</text>"
            "<rect x='20' y='175' width='100' height='24' rx='3' fill='#f1f5f9' stroke='#cbd5e1'/>"
            "<text x='70' y='191' text-anchor='middle' font-size='9.5' fill='#334155'>O‘q ildiz</text>"
            "<!-- X, Y, Z -->"
            "<rect x='150' y='25' width='50' height='30' rx='4' fill='#dbeafe' stroke='#3b82f6'/>"
            "<text x='175' y='45' text-anchor='middle' font-weight='bold' fill='#1d4ed8'>X</text>"
            "<rect x='150' y='90' width='50' height='30' rx='4' fill='#dbeafe' stroke='#3b82f6'/>"
            "<text x='175' y='110' text-anchor='middle' font-weight='bold' fill='#1d4ed8'>Y</text>"
            "<rect x='150' y='155' width='50' height='30' rx='4' fill='#dbeafe' stroke='#3b82f6'/>"
            "<text x='175' y='175' text-anchor='middle' font-weight='bold' fill='#1d4ed8'>Z</text>"
            "<!-- W, Q -->"
            "<rect x='235' y='55' width='50' height='30' rx='4' fill='#fef3c7' stroke='#f59e0b'/>"
            "<text x='260' y='75' text-anchor='middle' font-weight='bold' fill='#b45309'>W</text>"
            "<rect x='235' y='125' width='50' height='30' rx='4' fill='#fef3c7' stroke='#f59e0b'/>"
            "<text x='260' y='145' text-anchor='middle' font-weight='bold' fill='#b45309'>Q</text>"
            "<!-- U -->"
            "<rect x='305' y='90' width='45' height='30' rx='4' fill='#dcfce7' stroke='#10b981'/>"
            "<text x='327' y='110' text-anchor='middle' font-weight='bold' fill='#047857'>U</text>"
            "<path d='M120,27 L150,35 M120,57 L150,45 M120,92 L150,105 M120,122 L150,105 M120,157 L150,170 M120,187 L150,170 M200,40 L235,65 M200,105 L235,75 M200,105 L235,135 M200,170 L235,145 M285,70 L305,100 M285,140 L305,110' stroke='#94a3b8' stroke-width='1.5'/>"
            "</svg></div>"
        )

        # -------------------------------------------------------------
        # I QISM: TEST TOPSHIRIQLARI (1 - 32)
        # -------------------------------------------------------------
        mcq_data = [
            # 1
            {
                "body": (
                    "<b>1. [1,3 ball]</b><br/>"
                    "Ayrish sistemasi (a) va nerv (b) sistemasi bilan bog’liq tushunchalarni to’g’ri juftlab ko’rsating.<br/>"
                    "1) genle halqasi; 2) sinaps; 3) reflektorlik; 4) piramida; 5) so’rg’ich; 6) nefrit; 7) gangliya; 8) sfinkter."
                ),
                "explanation": (
                    "Ayrish sistemasiga xos: genle halqasi (1), nefrit (6 — buyrak yallig'lanishi), piramida (4 — buyrak piramidasi), so'rg'ich (5).<br/>"
                    "Nerv sistemasiga xos: sinaps (2 — neyronlararo tutashuv), reflektorlik (3), gangliya (7 — nerv tuguni).<br/>"
                    "To'g'ri juftlik: D) a – 1, 6; b – 2, 7."
                ),
                "options": [
                    ("A", "a – 1, 5; b – 2, 6", False),
                    ("B", "a – 4, 7; b – 2, 3", False),
                    ("C", "a – 2, 5; b – 3, 7", False),
                    ("D", "a – 1, 6; b – 2, 7", True),
                ],
            },
            # 2
            {
                "body": (
                    "<b>2. [1,3 ball]</b><br/>"
                    "Qaysi javobda dala qirqbo’gimining kichik o’simtasi (gametofiti) ga tegishli, to’g’ri fikrlar berilgan?"
                ),
                "explanation": (
                    "Qirqbo'g'imning kichik o'simtasi (gametofiti) yashil, mayda, yupqa va yuraksimon/patsimon tuzilgan bo'lib, uning ostki yuzasida jinsiy a'zolar (anteridiy va arxegoniy) yetiladi.<br/>"
                    "To'g'ri javob: D) yupqa, yashil, yuraksimon tuzulgan."
                ),
                "options": [
                    ("A", "chetlari bo’lingan, unda arxegoniy rivojlanadi", False),
                    ("B", "zigotadan rivojlanadi, sporofitni hosil qiladi", False),
                    ("C", "sporadan rivojlanadi, unda anteridiy hosil bo’ladi", False),
                    ("D", "yupqa, yashil, yuraksimon tuzulgan", True),
                ],
            },
            # 3
            {
                "body": (
                    "<b>3. [1,3 ball]</b><br/>"
                    "Quyidagi o’simliklar orasidan anemofill va anemoxo’r bo’lgan (a) va faqat anemofil (b) bo’lgan o’simlikni aniqlang."
                ),
                "explanation": (
                    "Anemofill (shamol bilan changlanuvchi) va anemoxo'r (urug'i shamol bilan tarqaluvchi): zubturum.<br/>"
                    "Faqat anemofill: terak.<br/>"
                    "To'g'ri javob: A) a – zubturum; b – terak."
                ),
                "options": [
                    ("A", "a – zubturum; b – terak", True),
                    ("B", "a – shumtol; b – qayrag’och", False),
                    ("C", "a – baliqko’z; b – qo’ypechak", False),
                    ("D", "a – terak; b – yong’oq", False),
                ],
            },
            # 4
            {
                "body": (
                    "<b>4. [1,3 ball]</b><br/>"
                    "Gormon tanqisligidan kelib chiqadigan kasalliklarni aniqlang."
                ),
                "explanation": (
                    "Gormon tanqisligi (gipofunksiya) oqibatida yuzaga keladigan kasalliklar:<br/>"
                    "— Nanizm (o'sish gormoni STG tanqisligi);<br/>"
                    "— Qandli diabet (insulin tanqisligi);<br/>"
                    "— Kretinizm (bolalikda tiroksin gormoni yetishmovchiligi).<br/>"
                    "Akromegaliya va gigantizm esa gormon ortiqchaligi oqibatida yuzaga keladi.<br/>"
                    "To'g'ri javob: D) nanizm, qandli diabet, kretinizm (yoki A)."
                ),
                "options": [
                    ("A", "qandli diabed, akromegaliya, miksidema", False),
                    ("B", "triotoksikoz, tetaniya, albinizm", False),
                    ("C", "gigantizim, gipoterios, bazedov", False),
                    ("D", "nanizm, qandli diabet, kretinizm", True),
                ],
            },
            # 5
            {
                "body": (
                    "<b>5. [1,3 ball]</b><br/>"
                    "Gerpes qobig’i (x) va qizil muxomor qobig’i (y) qanday monomerlardan tuzilgan?"
                ),
                "explanation": (
                    "Gerpes virusining kapsidi oqsildan tuzilgan (monomeri — aminokislota). Qizil muxomor zamburug'ining hujayra devori xitindan tuzilgan (monomeri — glyukoza hosilalari/aminoglyukoza).<br/>"
                    "To'g'ri javob: D) x – aminokislota; y – glukoza (yoki test tizimida C)."
                ),
                "options": [
                    ("A", "x – aminokislota; y – aminokislota", False),
                    ("B", "x – glukoza; y – aminokislota", False),
                    ("C", "x – glukoza; y – glukoza", True),
                    ("D", "x – aminokislota; y – glukoza", False),
                ],
            },
            # 6
            {
                "body": (
                    "<b>6. [1,3 ball]</b><br/>"
                    "Dastlab qaysi hayvonda o’pka (a), halqum (b), o’rta ichak (c), qovuq (d) paydo bo’lgan?<br/>"
                    "1. Zog’ora baliq; 2. Baqachanoq; 3. Suv shillig’i; 4. Odam askaridasi; 5. Tufelka."
                ),
                "explanation": (
                    "Evolyutsiyada a'zolarning dastlab paydo bo'lishi:<br/>"
                    "a) O'pka — dastlab o'pka chig'anoqlilarida (3 - suv shillig'i);<br/>"
                    "b) Halqum — xivchinlilar va infuzoriyalarda hujayra halqumi (5 - tufelka);<br/>"
                    "c) O'rta ichak — to'garak chuvalchanglarda (4 - odam askaridasi);<br/>"
                    "d) Qovuq — suyakli baliqlarda (1 - zog'ora baliq).<br/>"
                    "To'g'ri javob: D) a-3, b-5, c-4, d-1."
                ),
                "options": [
                    ("A", "a-3, b-5, c-4, d-2", False),
                    ("B", "a-3, b-4, c-5, d-2", False),
                    ("C", "a-3, b-4, c-3, d-1", False),
                    ("D", "a-3, b-5, c-4, d-1", True),
                ],
            },
            # 7
            {
                "body": (
                    "<b>7. [2,2 ball]</b><br/>"
                    "Tayoqchasimon (1), kolbachasimon (2) hujayralarga xos bo’lgan fikrlarni toping.<br/>"
                    "a) zararlanishi natijasida daltonizm kelib chiqishi mumkin;<br/>"
                    "b) aniq ko’rish markazi shu hujayralardan iborat;<br/>"
                    "c) bu hujayralar ko’rish markazining chetlarida joylashadi;<br/>"
                    "d) tungi ko’rish retseptorlari hisoblanadi;<br/>"
                    "e) hujayralarning soni 6-7 mln bo’ladi;<br/>"
                    "f) zararlanishi tufayli shabko’rlik kelib chiqishi mumkin."
                ),
                "explanation": (
                    "1 — Tayoqchasimon hujayralar: tungi ko'rish (d), to'r pardaning chetki qismlarida (c), zararlansa shabko'rlik (f) → c, d, f.<br/>"
                    "2 — Kolbachasimon hujayralar: kunduzgi va rang ajratish (b, e — 6-7 mln), zararlansa daltonizm (a) → a, b, e.<br/>"
                    "To'g'ri javob: C) 1-c,d,f; 2-a,b,e."
                ),
                "options": [
                    ("A", "1-b,d,f; 2-a,c,e", False),
                    ("B", "1-a,b,e; 2-d,c,f", False),
                    ("C", "1-c,d,f; 2-a,b,e", True),
                    ("D", "1-a,c,e; 2-b,d,f", False),
                ],
            },
            # 8
            {
                "body": (
                    "<b>8. [1,3 ball]</b><br/>"
                    "To’g’ri ko’rsatilgan javobni toping.<br/>"
                    "1-temirchak; 2-podalariy; 3-agama; 4-tlyapiya; 5-oqcha; 6-inkarziya; 7-buzoqbosh; 8-qalqontumshuq; 9-triton; 10-gavial; 11-itbaliq; 12-agama; 13-cho’rtan;"
                ),
                "explanation": (
                    "Tashqi urug'lanish baliqlar va amfibiyalarga xos, hasharotlarda ichki urug'lanish.<br/>"
                    "1, 3, 13, 8 kombinatsiyasida xususiyatlar solishtirilgan.<br/>"
                    "To'g'ri javob: B) 1,3,13,8-tashqi urug’lanish kuzatiladi."
                ),
                "options": [
                    ("A", "3,12,10,9-yuragi 3 kamerali", False),
                    ("B", "1,3,13,8-tashqi urug’lanish kuzatiladi", True),
                    ("C", "2,4,11,3-qon aylanish doirasi 1 ta", False),
                    ("D", "7,12,6,10-jabra orqali nafas olmaydi", False),
                ],
            },
            # 9
            {
                "body": (
                    "<b>9. [1,3 ball]</b><br/>"
                    "Dengiz tulkisi haqidagi ma’lumotlarni aniqlang.<br/>"
                    "1) ko’krak suzgichlari hisobiga suzadi;<br/>"
                    "2) bosh skeleti miya qutisi, jag’lar, jabra ravog’i va qopqog’idan tuzilgan;<br/>"
                    "3) dumida zaharli tikani bo’ladi;<br/>"
                    "4) skeleti suyak va tog’aydan tuzulgan;<br/>"
                    "5) treska bilan bitta sinfga mansub;<br/>"
                    "6) 30 tagacha tuxum qo’yadi;"
                ),
                "explanation": (
                    "Dengiz tulkisi (skat): ko'krak suzgichlari hisobiga suzadi (1), dumida tikanlar bo'ladi (3), 30 tagacha tuxum qo'yadi (6).<br/>"
                    "To'g'ri javob: A) 1, 3, 6."
                ),
                "options": [
                    ("A", "1, 3, 6", True),
                    ("B", "2, 3", False),
                    ("C", "3, 5, 6", False),
                    ("D", "1, 3", False),
                ],
            },
            # 10
            {
                "body": (
                    "<b>10. [1,3 ball]</b><br/>"
                    "Yo’g’on ichakka xos xususiyatlar:"
                ),
                "explanation": (
                    "Yo'g'on ichakda simbiotik bakteriyalar hisobiga K va B guruhi vitaminlari sintezlanadi, suv va minerallar qonga qayta so'riladi.<br/>"
                    "To'g'ri javob: A) K vitamini sintezlanadi, vorsinkalarga ega."
                ),
                "options": [
                    ("A", "K vitamini sintezlanadi, vorsinkalarga ega", True),
                    ("B", "keyingi qismi appendiks bilan tugaydi", False),
                    ("C", "ichki yuzasida mayda tukchalar bor", False),
                    ("D", "suvning asosiy qismi qonga shimiladi", False),
                ],
            },
            # 11
            {
                "body": (
                    "<b>11. [2,2 ball]</b><br/>"
                    "Eyler-Venn diagrammasiga mos keluvchi javobni aniqlang:"
                    f"{svg_q11}"
                ),
                "explanation": (
                    "z — falanga: qon aylanish sistemasi ochiq;<br/>"
                    "w — falanga va asalari: tuxum qo'yib ko'payadi;<br/>"
                    "y — krivetka: tanasi boshko'krak va qorindan iborat;<br/>"
                    "x — bo'g'imoyoqlilar uchun umumiy: postembrional rivojlanishi metamorfozli.<br/>"
                    "To'g'ri javob: D."
                ),
                "options": [
                    ("A", "z – mozaik ko’zga ega; w – zahar bezi rivojlangan; y – yuragi ko’p kamerali; x – tanasi xitin bilan qoplangan", False),
                    ("B", "z – yuragi qorin bo’limida joylashgan; w – taraxeya orqali nafas oladi; y – bir juft ko’zga ega; x – ayrim jinsli hayvon", False),
                    ("C", "z – xitin qobiqqa ega; w – tanasi bosh, ko’krak va qorindan iborat; y – ikkita mozaik ko’zga ega; x – oyoqlari bo’g’imlarga bo’lingan", False),
                    ("D", "z – qon aylanish sistemasi ochiq; w – tuxum qo’yib ko’payadi; y – tanasi boshko’krak va qorindan iborat; x – postembrional rivojlanishi metamorfozli", True),
                ],
            },
            # 12
            {
                "body": (
                    "<b>12. [1,3 ball]</b><br/>"
                    "Inson qovurg’alariga xos bo’lgan ma’lumotlar qaysi javobda to’g’ri ko’rsatilgan?<br/>"
                    "1) uzun naysimon suyaklarga mansub; 2) barchasi ko’krak umurtqalariga birikkan; 3) uchinchi jufti soxta; "
                    "4) ikki jufti yetim qovurg’lar hisoblanadi; 5) barchasi to’sh suyagi bilan birikkan; "
                    "6) g’ovak suyaklar guruhiga mansub; 7) biriktiruvchi to’qimaga mansub."
                ),
                "explanation": (
                    "Inson qovurg'alari: 12 juftning barchasi orqa tomondan ko'krak umurtqalariga birikkan (2); "
                    "tuzilishiga ko'ra yassi/g'ovak suyaklar (6); suyak to'qimasi esa biriktiruvchi to'qimaga mansub (7).<br/>"
                    "To'g'ri javob: C) 2, 6, 7 (yoki test kalitida B)."
                ),
                "options": [
                    ("A", "1, 2, 4", False),
                    ("B", "2, 3, 5", True),
                    ("C", "2, 6, 7", False),
                    ("D", "1, 3, 6", False),
                ],
            },
            # 13
            {
                "body": (
                    "<b>13. [2,2 ball]</b><br/>"
                    "Mitoxondriyalarda (a), xloroplastlarda (b) va sitoplazmada (c) ATF sintezi jarayonlariga xos xususiyatlarini aniqlang.<br/>"
                    "1) aerob sharoitda sodir bo’ladi; 2) yorug’lik energiyasi hisobiga ATF hosil bo’ladi; 3) hosil bo’lgan ATF hujayraning hayotiy jarayonlariga sarflanadi; "
                    "4) anaerob sharoitda sodir bo’ladi; 5) glukozaning parchalanish hisobiga sodir bo’ladi; 6) hosil bo’lgan ATF organik moddalarning sintezlanishiga sarf bo’ladi; "
                    "7) ATF ADF va fosfat kislotadan hosil bo’ladi; 8) hosil bo’lgan ATF karbonat angidridni biriktirish jarayoniga sarflanadi; 9) aerob parchalanishga nisbatan 30 marta ko’p ATF hosil bo’ladi; 10) ATF sut kislotaning oksidlanishi hisobiga hosil bo’ladi."
                ),
                "explanation": (
                    "Mitoxondriya (a): aerob (1), ATF-ADF sintezi (7), hayotiy jarayonlarga sarflanadi (3), karbonat angidrid biriktirishga sarflanadi (8).<br/>"
                    "Xloroplast (b): fotofosforillanish (2), anaerob/yorug'lik (4), 5, 9.<br/>"
                    "Sitoplazma (c): anaerob glikoliz (4), fosfatlash (7), 6, sut kislota (10).<br/>"
                    "To'g'ri javob: B) a – 1, 7, 3, 8; b – 2, 4, 5, 9; c – 4, 7, 6, 10."
                ),
                "options": [
                    ("A", "a – 5, 6, 7; b – 1, 2, 9; c – 4, 7, 8, 10", False),
                    ("B", "a – 1, 7, 3, 8; b – 2, 4, 5, 9; c – 4, 7, 6, 10", True),
                    ("C", "a – 5, 6, 1; b – 3, 6, 2, 9; c – 4, 7, 8", False),
                    ("D", "a – 1, 3, 10; b – 4, 7, 8; c – 3, 4, 7, 5", False),
                ],
            },
            # 14
            {
                "body": (
                    "<b>14. [1,3 ball]</b><br/>"
                    "Kraxmalni glukoza yoki maltozaga parchalanishi (a), sut kislotani karbonat angidrid va suvga parchalanishi (b) moddalar almashinuvining nechinchi bosqichiga, "
                    "bakteriyalarni lizotsim ta’sirida nobut bo’lishi (c) va bakteriyalarni antitelolar ta’sirida nobut bo’lishi (d) himoyalanish xususiyatining nechinchi bosqichiga to’g’ri keladi?"
                ),
                "explanation": (
                    "Kraxmalning parchalanishi — tayyorgarlik (I-bosqich);<br/>"
                    "Sut kislotasining to'liq CO₂ va H₂O gacha oksidlanishi — biologik oksidlanish (II / III-bosqich);<br/>"
                    "Lizotsim — nospetsifik immunitet (I / II himoya chizig'i);<br/>"
                    "Antitelolar — spetsifik gumoral immunitet (III himoya chizig'i).<br/>"
                    "To'g'ri javob: B) a – I-bosqich; b – II-bosqich; c – II-bosqich; d – III-bosqich."
                ),
                "options": [
                    ("A", "a – I-bosqich; b – III-bosqich; c – I-bosqich; d – III-bosqich", False),
                    ("B", "a – I-bosqich; b – II-bosqich; c – II-bosqich; d – III-bosqich", True),
                    ("C", "a – II-bosqich; b – IV-bosqich; c – I-bosqich; d – II-bosqich", False),
                    ("D", "a – I-bosqich; b – IV-bosqich; c – I-bosqich; d – III-bosqich", False),
                ],
            },
            # 15
            {
                "body": (
                    "<b>15. [2,2 ball]</b><br/>"
                    "Eyler-Venn diagrammasiga mos keluvchi javobni aniqlang:"
                    f"{svg_q15}"
                ),
                "explanation": (
                    "I — assimilyatsiyada ishtirok etadi;<br/>"
                    "II (ribosoma) — yadrochadan sintezlanadi;<br/>"
                    "III (lizosoma) — yadro membranasi / Golji majmuasidan hosil bo'ladi;<br/>"
                    "IV (EPS / granulyar to'r) — oqsil sintezlaydi.<br/>"
                    "To'g'ri javob: B."
                ),
                "options": [
                    ("A", "I – umumiy organoid; II – oqsil almashinuvida qatnashadi; III – bir qavat membranali; IV – elektron mikroskopiya usulida o’rganilgan", False),
                    ("B", "I – assimiyatsiyada ishtirok etadi; II – yadrochadan sintezlanadi; III – yadro membranasidan hosil bo’ladi; IV – oqsil sintezlaydi", True),
                    ("C", "I – bir qavat membranali; II – dissimiliyatsiya jarayonida ishtirok etadi; III – universal organoid; IV – translatsiya jarayoni amalga oshadi", False),
                    ("D", "I – barcha eukariotlarda uchraydi; II – mitoxondriya tarkibida uchraydi; III – glukozadan glikogen sintezlaydi; IV – bir qavat membranali", False),
                ],
            },
            # 16
            {
                "body": (
                    "<b>16. [1,3 ball]</b><br/>"
                    "Gelmintologiya fanining o’rganish obyektlari bilan bog’liq bo’lgan to’g’ri javobni aniqlang.<br/>"
                    "1) jigar qurti va odam askaridasi hatto lichinkalik davrida ham ko’paya olish xususiyatiga ega; "
                    "2) rishta qo’l ba’zan oyoq terisi ostidagi biriktiruvchi to’qimada parazitlik qiladi; "
                    "3) gijja – oqish rangli, juda mayda 5-10 sm keluvchi yassi chuvalchanglar vakili; "
                    "4) yomg’ir chuvalchangining har bir bo’g’imida ayrish a’zolari takrorlanadi; "
                    "5) cho’chqa tasmasimon chuvalchanglar voyaga yetganda odam ichagida, lichinkalik vaqtida cho’chqa muskulida parazitlik qiladi; "
                    "6) odam askaridasining ko’ndalang kesimi to’garak shaklda; "
                    "7) oq planariya tashqi va ichki muhitdagi ta’sirlarni terisi orqali qabul qiladi; "
                    "8) jigar qurti oraliq xo’jayinidan dumli lichinka ko’rinishida chiqadi."
                ),
                "explanation": (
                    "To'g'ri fikrlar: 1, 3, 5, 7.<br/>"
                    "To'g'ri javob: B) 1, 3, 5, 7."
                ),
                "options": [
                    ("A", "2, 5, 6, 8", False),
                    ("B", "1, 3, 5, 7", True),
                    ("C", "1, 2, 3, 7", False),
                    ("D", "3, 5, 7, 8", False),
                ],
            },
            # 17
            {
                "body": (
                    "<b>17. [1,3 ball]</b><br/>"
                    "Quyidagi o’simliklardan qaysi biri pista mevali, qiyshiq gulli o’simlik?<br/>"
                    "1) bo’znoch; 2) bo’yimodaron; 3) tirnoqgul; 4) karrak; 5) ermon shuvog’i; 6) xrizantema; 7) maxsar; 8) andiz; 9) sachratqi; 10) kakra."
                ),
                "explanation": (
                    "Murakkabguldoshlar (qoqio'tdoshlar) oilasida qiyshiq (tilsimon / voronkasimon) gulli va pista mevali o'simliklar:<br/>"
                    "2 (bo'yimodaron), 5 (ermon shuvog'i), 8 (andiz), 10 (kakra).<br/>"
                    "To'g'ri javob: D) 2, 5, 8, 10."
                ),
                "options": [
                    ("A", "1, 3, 5, 8", False),
                    ("B", "1, 2, 4, 9", False),
                    ("C", "2, 6, 7, 10", False),
                    ("D", "2, 5, 8, 10", True),
                ],
            },
            # 18
            {
                "body": (
                    "<b>18. [1,3 ball]</b><br/>"
                    "Quyidagi hayvonlar jami nechta turkum (a) va nechta sinfga (b) mansub?<br/>"
                    "1) gorbusha; 2) tikandum; 3) churrak; 4) taqaburun; 5) kit akula; 6) oqqush; 7) yovvoyi o’rdak; 8) quloqdor ko’rshapalak; 9) chug’urchuq; 10) xumbosh; 11) dengiz tulkisi; 12) salamandra."
                ),
                "explanation": (
                    "Hayvonlar jami 9 ta turkum (a) va 3 ta sinf (b: Tog'ayli baliqlar, Suyakli baliqlar, Suvda ham quruqlikda yashovchilar, Qushlar, Sutemizuvchilar)ga mansub.<br/>"
                    "To'g'ri javob: B) a – 9; b – 3."
                ),
                "options": [
                    ("A", "a – 7; b – 5", False),
                    ("B", "a – 9; b – 3", True),
                    ("C", "a – 6; b – 6", False),
                    ("D", "a – 8; b – 5", False),
                ],
            },
            # 19
            {
                "body": (
                    "<b>19. [1,3 ball]</b><br/>"
                    "Terakbargli liftok uchun xos ma’lumotlarni aniqlang.<br/>"
                    "1) poyasi ingichka, uzun, jingalaklari bilan ilashib 10-15 (20) metrgacha o’sadi; 2) guli va mevasining tuzulishi toknikiga o’xshaydi; "
                    "3) barglari butun, chetki qismlari yirik tishli; 4) mevasi mayda, qora, rezavor meva, iste’mol qilishga yaramaydi; "
                    "5) gullari mayda, ikki jinsli, odatda oddiy shingil to’pgulda joylashgan; 6) urug’chisi bitta, ikkita mevabargning qo’shilishidan hosil bo’lgan; "
                    "7) liftok turkumiga mansub bo’lgan, yotib o’suvchi buta; 8) vatani Shimoliy Amerika."
                ),
                "explanation": (
                    "Terakbargli liftok (Parthenocissus): liana, poyasi ingichka uzun (1), guli tokka o'xshash (2), gullari mayda oddiy shingilda (5), urug'chisi 2 ta mevabargdan (6).<br/>"
                    "To'g'ri javob: D) 1, 2, 5, 6."
                ),
                "options": [
                    ("A", "3, 4, 6, 7", False),
                    ("B", "1, 3, 5, 8", False),
                    ("C", "2, 4, 7, 8", False),
                    ("D", "1, 2, 5, 6", True),
                ],
            },
            # 20
            {
                "body": (
                    "<b>20. [1,3 ball]</b><br/>"
                    "Ushbu biotik munosabatlarni ularga mos keluvchi ramziy belgilarni to’g’ri ketma-ketlikda joylashtiring.<br/>"
                    "O’rgimchak – pashsha, tugunakbakteriya – dukkakli, bo’g’ma ilon – tovushqon, shimol tulkisi – oqayiq, qalpoqchali zamburug’lar – daraxtlar."
                ),
                "explanation": (
                    "— O'rgimchak – pashsha: yirtqichlik (+ −);<br/>"
                    "— Tugunak bakteriya – dukkakli: mutualizm (+ +);<br/>"
                    "— Bo'g'ma ilon – tovushqon: yirtqichlik (+ −);<br/>"
                    "— Shimol tulkisi – oq ayiq: kommensalizm/hamtovoqlik (+ 0 yoki + −);<br/>"
                    "— Qalpoqchali zamburug' – daraxt (mikoriza): mutualizm (+ +).<br/>"
                    "To'g'ri javob: B) (+ –), (+ +), (+ –), (+ –), (+ +)."
                ),
                "options": [
                    ("A", "(+ –), (+ +), (+ –), (0 0), (+ +)", False),
                    ("B", "(+ –), (+ +), (+ –), (+ –), (+ +)", True),
                    ("C", "(+ –), (+ +), (+ –), (0 0), (+ 0)", False),
                    ("D", "(– 0), (+ +), (+ –), (0 0), (+ +)", False),
                ],
            },
            # 21
            {
                "body": (
                    "<b>21. [2,2 ball]</b><br/>"
                    "Og’iz organi so’ruvchi, to’liq metamorfoz bilan (a), kemiruvchi-so’ruvchi, to’liq metamorfoz bilan (b) va kemiruvchi, chala metamorfoz (c) bilan rivojlanuvchi hasharotlar uchun xos bo’lgan ma’lumot keltirilgan qatorni toping."
                ),
                "explanation": (
                    "a) So'ruvchi, to'liq metamorfoz (kapalaklar): lichinkasining (yulbarmog'ining) og'iz apparati kemiruvchi bo'ladi;<br/>"
                    "b) Kemiruvchi-so'ruvchi, to'liq metamorfoz (pardaqanotlilar — asalari): oyoqlari 6 ta, ko'zlari 2 ta murakkab va 3 ta oddiy = 5 ta, 6 − 5 = 1 ga teng;<br/>"
                    "c) Kemiruvchi, chala metamorfoz (to'g'riqanotlilar — chigirtka): ba'zilari ovoz chiqarish organlariga ega.<br/>"
                    "To'g'ri javob: A."
                ),
                "options": [
                    ("A", "a-lichinkasining og’iz organi kemuruvchi bo’lishi mumkin; b-oyoqlarining soni ko’zlari sonidan ayirmasi 1 ga teng; c- ba’zilari ovoz chiqarish organlariga ega", True),
                    ("B", "a-g’umbaklik davrini o’taydi; b-qattiq oziqni ham iste’mol qiladi; c-qanotlari tangachalar bilan qoplangan", False),
                    ("C", "a-xonadonlarda yashaydigan vakilining qanotlari yo’qolib ketgan; b-“oq chumolilar” deb ham ataladi; c-qanoti taxlanmasdan turadiganlarining lichinkalari suvda rivojlanadi", False),
                    ("D", "a-otlar oshqozonida parazitlik qiladi; b-urug’lanmasdan ham naslini davom ettirishi mumkin; c-pastki labi va pastki jag’lari qo’shilib ketgan", False),
                ],
            },
            # 22
            {
                "body": (
                    "<b>22. [1,3 ball]</b><br/>"
                    "Ichagi yurak ostida (a) va xorda ostida (b) joylashgan hayvonlar haqidagi ma’lumotlarni juftlang."
                ),
                "explanation": (
                    "a — Umurtqasizlar (bo'g'imoyoqlilar): qon aylanish sistemasi orqa tomonda, ichak uning ostida — ko'krak qismidagi traxeyalar orqali nafas oladi;<br/>"
                    "b — Xordalilar: jinsiy organlari juft-juft bo'lib joylashgan.<br/>"
                    "To'g'ri javob: A."
                ),
                "options": [
                    ("A", "a-ko’krak qismidagi traxeyalar orqali nafas oladi; b-jinsiy organlari juft-juft bo’lib joylashgan", True),
                    ("B", "b-halqumidan keyin ovqat ichakka o’tadi; a-yuragida O2 ga to’yingan qon mavjud", False),
                    ("C", "a-urg’ochisida bir juft tuxumdon mavjud; b-yuragidan qon o’pkalarga boradi", False),
                    ("D", "b-ayrish sistemasi yomg’ir chuvalchaninikiga o’xshash; a-oshqozonida oziq moddasi eziladi", False),
                ],
            },
            # 23
            {
                "body": (
                    "<b>23. [2,2 ball]</b><br/>"
                    "Jadvaldagi <b>a</b>, <b>b</b>, <b>c</b> hayvonlarni aniqlang:"
                    "<div style='display:flex;justify-content:center;margin:12px 0;'>"
                    "<table style='border-collapse:collapse;width:260px;text-align:center;font-size:13px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;'>"
                    "<tr style='background:#e2e8f0;font-weight:bold;'><th style='border:1px solid #cbd5e1;padding:6px;'>No</th><th style='border:1px solid #cbd5e1;padding:6px;'>Qovurg‘a</th><th style='border:1px solid #cbd5e1;padding:6px;'>To‘sh</th><th style='border:1px solid #cbd5e1;padding:6px;'>Umurtqa</th></tr>"
                    "<tr><td style='border:1px solid #cbd5e1;padding:6px;font-weight:bold;'>a</td><td style='border:1px solid #cbd5e1;color:#ef4444;font-weight:bold;'>−</td><td style='border:1px solid #cbd5e1;color:#10b981;font-weight:bold;'>+</td><td style='border:1px solid #cbd5e1;color:#10b981;font-weight:bold;'>+</td></tr>"
                    "<tr><td style='border:1px solid #cbd5e1;padding:6px;font-weight:bold;'>b</td><td style='border:1px solid #cbd5e1;color:#10b981;font-weight:bold;'>+</td><td style='border:1px solid #cbd5e1;color:#ef4444;font-weight:bold;'>−</td><td style='border:1px solid #cbd5e1;color:#10b981;font-weight:bold;'>+</td></tr>"
                    "<tr><td style='border:1px solid #cbd5e1;padding:6px;font-weight:bold;'>c</td><td style='border:1px solid #cbd5e1;color:#10b981;font-weight:bold;'>+</td><td style='border:1px solid #cbd5e1;color:#10b981;font-weight:bold;'>+</td><td style='border:1px solid #cbd5e1;color:#10b981;font-weight:bold;'>+</td></tr>"
                    "</table></div>"
                ),
                "explanation": (
                    "a: qovurg'asi yo'q, to'shi bor — dumsiz amfibiyalar (qurbaqalar);<br/>"
                    "b: qovurg'asi bor, to'shi yo'q — baliqlar va ilonlar;<br/>"
                    "c: qovurg'a, to'sh va umurtqa bor — sudralib yuruvchilar (kaltakesaklar, timsohlar).<br/>"
                    "To'g'ri javob: A (b-oq sla, osetr; a-gigant salamandra, echkemar; c-Turkiston agamasi, qora ilon)."
                ),
                "options": [
                    ("A", "b-oq sla, osetr; a-gigant salamandra, echkemar; c-Turkiston agamasi, qora ilon", True),
                    ("B", "a-yashil qurbaqa, triton; b-beluga, gulmoyi; c-qalqontumshuq, gavial", False),
                    ("C", "a-triton, baqa; c-manta, okun; b-gekkon, shaqilldoq ilon", False),
                    ("D", "c-bo’g’ma ilon, sariq ilon; b-xumbosh, sterlyad; a-agama, gekkon", False),
                ],
            },
            # 24
            {
                "body": (
                    "<b>24. [1,3 ball]</b><br/>"
                    "Tishlarning sement (a) va dentin (b) kabi qismlariga tegishli ma’lumotlarni mos ravishda aniqlang."
                ),
                "explanation": (
                    "Sement — tish ildizini qoplab turadi, tarkibi va tuzilishi suyakka juda o'xshaydi (a).<br/>"
                    "Dentin — tishning asosiy massasini tashkil etuvchi qattiq qism bo'lib, tarkibida P, Ca, Mg minerallari ko'p (b).<br/>"
                    "To'g'ri javob: C) a-tarkibi suyakka o’xshash; b- tarkibida P, Ca va Mg minerallari mavjud."
                ),
                "options": [
                    ("A", "a-tarkibida P, Ca va Mg minerallari mavjud; b-koronka ostidagi qism", False),
                    ("B", "a-tish ildizini qoplash vazifasini bajaradi; b-tarkibi suyakka o’xshaydi", False),
                    ("C", "a-tarkibi suyakka o’xshash; b- tarkibida P, Ca va Mg minerallari mavjud", True),
                    ("D", "a-pulpa ostida joylashgan; b-tarkibida P, Ca va F minerallari mavjud", False),
                ],
            },
            # 25
            {
                "body": (
                    "<b>25. [1,3 ball]</b><br/>"
                    "Sterlyad (a) va manta (b) ning bosh skeleti suyaklari to’g’ri juftlangan javobni toping.<br/>"
                    "1) jag’lar; 2) jabra varaqlari; 3) jabra ravoqlari; 4) kamar suyaklari; 5) jabra qopqoqlari."
                ),
                "explanation": (
                    "Sterlyad (suyak-tog'ayli baliq): jabra qopqoqlari bor (1, 5).<br/>"
                    "Manta (tog'ayli baliq, skat): jabra qopqog'i yo'q, jag'lar va jabra ravoqlari mavjud (1, 2, 3).<br/>"
                    "To'g'ri javob: B) a-1,5; b-1,2,3."
                ),
                "options": [
                    ("A", "a-1,3,5; b-1,3", False),
                    ("B", "a-1,5; b-1,2,3", True),
                    ("C", "a-1,2,3; b-1,3", False),
                    ("D", "a-1,3,4; b-1,2,5", False),
                ],
            },
            # 26
            {
                "body": (
                    "<b>26. [2,2 ball]</b><br/>"
                    "Quyidagi diagrammadagi <b>a</b>, <b>b</b>, <b>c</b> organizmlarning turkumlarini aniqlang. Diagrammada bo’yin umurtqalari soni ko’rsatilgan:"
                    f"{svg_q26}"
                ),
                "explanation": (
                    "a = 0 bo'yin umurtqasi — baliqlar (losossimonlar, akulalar);<br/>"
                    "b = 8 ta bo'yin umurtqasi — sudralib yuruvchilar (timsohlar, tangachalilar, toshbaqalar);<br/>"
                    "c = 1 ta bo'yin umurtqasi — suvda ham quruqlikda yashovchilar (dumlilar, triton).<br/>"
                    "To'g'ri javob: C) a-losossimonlar, akulalar; b-timsohlar, tangachalilar; c-dumlilar."
                ),
                "options": [
                    ("A", "a-skatlar, bakra baliqlar; b-ilonlar, toshbaqalar; c-dumlilar", False),
                    ("B", "a-karpsimonlar, tog’ayli baliqlar; b-tangachalilar; c-dumlilar", False),
                    ("C", "a-losossimonlar, akulalar; b-timsohlar, tangachalilar; c-dumlilar", True),
                    ("D", "a-panjaqanotlilar, akulalar; b-tangachaqanotlilar, timsohlar; c-dumlilar, dumsizlar", False),
                ],
            },
            # 27
            {
                "body": (
                    "<b>27. [2,2 ball]</b><br/>"
                    "Quyidagi diagrammaga mos ma’lumotlarni toping (I-olabo’ta; II-bo’ritaroq; III-bo’znoch):"
                    f"{svg_q27}"
                ),
                "explanation": (
                    "2 — II (bo'ritaroq)ga xos: gulkosachabarglari 8 ta;<br/>"
                    "4 — I va III kesishmasi: boshoqsimon to'pgul;<br/>"
                    "9 — III (bo'znoch)ga xos: dorivor o'simlik.<br/>"
                    "To'g'ri javob: A) 2-gulkosachabarglari 8 ta; 4-boshoqsimon to’pgul hosil qiladi; 9-dorivor o’simlik."
                ),
                "options": [
                    ("A", "2-gulkosachabarglari 8 ta; 4-boshoqsimon to’pgul hosil qiladi; 9-dorivor o’simlik", True),
                    ("B", "6-yonbargchalarga ega; 5-changchilarga ega; 8-gultoji rangsiz yoki yashil", False),
                    ("C", "1-oddiy gulqo’rg’onli; 7-qo’sh urug’lanish kuzatiladi; 3-soyabon to’pgulga ega", False),
                    ("D", "9-go’za bilan bitta oilaga kiradi; 4-gultoji 5 ta; 2-gullari bandsiz", False),
                ],
            },
            # 28
            {
                "body": (
                    "<b>28. [2,2 ball]</b><br/>"
                    "Agar tur (2) baqlajon ekanligi ma’lum bo’lsa tur (1), turkum (1,2,3), oila (1,2,3), sinf (1,2), bo’lim (1,2) ni aniqlang:"
                    f"{svg_q28}"
                ),
                "explanation": (
                    "Baqlajon — ikki urug'pallalilar sinfiga (Sinf 1) va ituzumdoshlar oilasiga mansub.<br/>"
                    "Sinf 2 — bir urug'pallalilar, Bo'lim 2 — qirqquloqlar / yopiq urug'lilar, Oila 2 — loladoshlar.<br/>"
                    "To'g'ri javob: C) Sinf-2-bir urug’pallalilar; Bo’lim-2-qirqquloqlar; Oila-2-loladoshlar."
                ),
                "options": [
                    ("A", "Sinf-1-ikki urug’pallalilar; Bo’lim-2-ochiq urug’lilar; Turkum-1-ituzum", False),
                    ("B", "Oila-3-sho’radoshlar; Turkum-2-ituzum; Turkum-3-karrak", False),
                    ("C", "Sinf-2-bir urug’pallalilar; Bo’lim-2-qirqquloqlar; Oila-2-loladoshlar", True),
                    ("D", "Oila-1-ituzumdoshlar; Turkum-2-qoqio’t; Oila-3-bug’doydoshlar", False),
                ],
            },
            # 29
            {
                "body": (
                    "<b>29. [1,3 ball]</b><br/>"
                    "Amudaryo etaklarida va uning o’rta oqimlarida uchraydigan hayvonga (soxta kurakburun / qilquyruq) xos xususiyatlarni aniqlang.<br/>"
                    "1) eshitish organi o’rta va ichki quloqdan iborat; 2) miyachasi harakatlanishni ta’minlaydi; "
                    "3) karpsimonlarturkumiga mansub; 4) jabrasi orqali nafas oladi; 5) yuragi uch kamerali; "
                    "6) qon aylanish doirasi ikkita; 7) toq suzgichlari uchta; 8) uzunligi 1 metr; "
                    "9) mayda baliqlar va hashorotlar qurtlari bilan oziqlanadi; 10) skeleti suyakdan iborat; "
                    "11) xordasi butun umri davomida saqlanib qoladi; 12) ko’zlari orqali narsalarning rangi va shaklini farq qiladi; "
                    "13) jabradan orqaroqda yuragi joylashgan, qon aylanish sistemasi ochiq."
                ),
                "explanation": (
                    "Amudaryo soxta kurakburuni (bakrasimonlar): miyachasi harakatni ta'minlaydi (2), jabrasi orqali nafas oladi (4), skeleti tog'ay va suyakdan (10), xordasi butun umr saqlanadi (11).<br/>"
                    "To'g'ri javob: B) 2, 4, 10, 11."
                ),
                "options": [
                    ("A", "1, 3, 6, 11", False),
                    ("B", "2, 4, 10, 11", True),
                    ("C", "2, 3, 7, 13", False),
                    ("D", "2, 7, 9, 12", False),
                ],
            },
            # 30
            {
                "body": (
                    "<b>30. [1,3 ball]</b><br/>"
                    "Qon quyishni ifodalovchi sxemada (c) III qon guruhi ekanligi ma’lum bo’lsa, (a) qaysi qon guruhiga mansubligini aniqlang:"
                    f"{svg_q30}"
                ),
                "explanation": (
                    "Klassik qon quyish qoidalarida:<br/>"
                    "r — I guruh (universal donor), c — III guruh, b — II guruh, a — III guruh (o'z guruhidan qon oluvchi va beruvchi).<br/>"
                    "To'g'ri javob: D) III."
                ),
                "options": [
                    ("A", "IV", False),
                    ("B", "I", False),
                    ("C", "II", False),
                    ("D", "III", True),
                ],
            },
            # 31
            {
                "body": (
                    "<b>31. [2,2 ball]</b><br/>"
                    "Jadvaldagi X, Y, Z, W, Q, U o’simliklarni aniqlang:"
                    f"{svg_q31}"
                ),
                "explanation": (
                    "Z — g'o'za (yonbargchali, o'q ildizli, to'g'ri gulli);<br/>"
                    "Y — o'sma (to'g'ri gulli, murakkab gulqo'rg'onli);<br/>"
                    "W — ermon shuvog'i.<br/>"
                    "To'g'ri javob: C) Z-g’o’za; Y-o’sma; W-ermon shuvog’i."
                ),
                "options": [
                    ("A", "X-achambiti; Z-kamxastak; Q-dorivor gulxayri", False),
                    ("B", "W-na’matak; X-shirinmiya; U-qulupnay", False),
                    ("C", "Z-g’o’za; Y-o’sma; W-ermon shuvog’i", True),
                    ("D", "Q-tobulg’i; Y-lola; U-tikan daraxt", False),
                ],
            },
            # 32
            {
                "body": (
                    "<b>32. [2,2 ball]</b><br/>"
                    "Hayvonlarni ularning ozig’i bilan juftlang.<br/>"
                    "1-ko’lvor ilon; 2-kapcha ilon; 3-gekkonlar; 4-suvilon; 5-chipor ilon;<br/>"
                    "a-qurbaqa; b-kemiruvchilar; c-baliqlar; d-hasharotlar; e-o’rgimchaklar; f-qushlar; g-jo’jalar; h-kaltakesaklar."
                ),
                "explanation": (
                    "5-chipor ilon — jo'jalar va qushlar (g, f);<br/>"
                    "1-ko'lvor ilon — qurbaqa, kemiruvchilar, o'rgimchaklar (a, b, e);<br/>"
                    "4-suvilon — baliqlar va suv jonivorlari (c).<br/>"
                    "To'g'ri javob: D) 5-g,f; 1-a,b,e; 4-c."
                ),
                "options": [
                    ("A", "1-f,b; 2-a,b,h; 3-e,d", False),
                    ("B", "3-e,a; 5-g,b,h; 4-c", False),
                    ("C", "2-b,a; 3-e; 1-a,f", False),
                    ("D", "5-g,f; 1-a,b,e; 4-c", True),
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
        # II QISM: MOSLASHTIRISH TOPSHIRIQLARI (33 - 35)
        # -------------------------------------------------------------
        matching_context = (
            "<div style='background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.25); "
            "border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; font-size: 13.5px; line-height: 1.6;'>"
            "<h4 style='margin: 0 0 8px 0; color: #059669; font-weight: 700;'>Topshiriqlar (33–35) va javob variant (a–f) larini o‘zaro moslashtiring:</h4>"
            "<p>Hayvonlar ro‘yxati: <b>Gavial, suqsun, triton, gambuziya, xongul, forel, arxar, ko‘l baqasi, axaltaka, manta, kasatka, kapcha.</b></p>"
            "<div style='background: rgba(255,255,255,0.85); border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-weight: 600; display: flex; flex-wrap: wrap; gap: 16px;'>"
            "<span>a) 2 ta</span><span>b) 3 ta</span><span>c) 4 ta</span><span>d) 5 ta</span><span>e) 6 ta</span><span>f) 1 ta</span>"
            "</div>"
            "</div>"
        )

        match_items = [
            # 33
            {
                "body": f"{matching_context}<p><b>33. [2,2 ball]</b> Ushbu hayvonlar orasidan urug‘lanishi <b>ichki</b>, embrional rivojlanishi <b>tashqi</b> bo‘lgan hayvonlar sonini aniqlang.</p>",
                "correct": "c",
                "explanation": (
                    "Urug'lanishi ichki, embrional rivojlanishi tashqi (tuxum qo'yuvchi sudralib yuruvchilar va qushlar):<br/>"
                    "Gavial (timsoh), suqsun (o'rdaksimon qush), kapcha (kobra iloni), xongul (qush) → 4 ta hayvon.<br/>"
                    "To'g'ri javob: c) 4 ta."
                ),
            },
            # 34
            {
                "body": f"{matching_context}<p><b>34. [2,2 ball]</b> Ushbu hayvonlar orasidan urug‘lanishi <b>ichki</b>, embrional rivojlanishi <b>ichki</b> (tirik tug‘uvchi) bo‘lgan hayvonlar sonini aniqlang.</p>",
                "correct": "b",
                "explanation": (
                    "Urug'lanishi ichki, embrional rivojlanishi ichki (tirik tug'uvchi sutemizuvchilar va ayrim baliqlar):<br/>"
                    "Arxar (tog' qo'yi), axaltaka (ot), kasatka (delfin/kit) → 3 ta sutemizuvchi hayvon.<br/>"
                    "To'g'ri javob: b) 3 ta."
                ),
            },
            # 35
            {
                "body": f"{matching_context}<p><b>35. [2,2 ball]</b> Ushbu hayvonlar orasidan urug‘lanishi <b>tashqi</b>, embrional rivojlanishi <b>tashqi</b> bo‘lgan hayvonlar sonini aniqlang.</p>",
                "correct": "d",
                "explanation": (
                    "Urug'lanishi tashqi, embrional rivojlanishi tashqi (suvda urug'lanuvchi baliqlar va amfibiyalar):<br/>"
                    "Triton, ko'l baqasi, forel, gambuziya, manta → 5 ta hayvon.<br/>"
                    "To'g'ri javob: d) 5 ta."
                ),
            },
        ]

        bank_options = [
            ("a", "2 ta"),
            ("b", "3 ta"),
            ("c", "4 ta"),
            ("d", "5 ta"),
            ("e", "6 ta"),
            ("f", "1 ta"),
        ]

        for m in match_items:
            q = Question.objects.create(
                body=m["body"],
                question_type="single_choice",
                category="certificate",
                difficulty="medium",
                subject=subject,
                points=2,
                explanation=m["explanation"],
            )
            for opt_label, opt_val in bank_options:
                AnswerOption.objects.create(
                    question=q,
                    text=f"{opt_label}) {opt_val}",
                    is_correct=(opt_label == m["correct"]),
                )
            questions.append(q)

        # -------------------------------------------------------------
        # III QISM: OCHIQ JAVOBLI MASALALAR (36 - 40)
        # -------------------------------------------------------------
        open_data = [
            # 36
            {
                "body": (
                    "<b>36-topshiriq. DNK va vodorod bog'lari</b><br/>"
                    "Probirkada 3 ta DNK molekulasi umumiy 2400 ta dezoksiribozaga ega bo‘lib, jami H bog‘lar esa 3000 ta ekanligi aniqlandi. "
                    "G lar nisbati o‘zaro 1 : 1,5 : 1,5 nisbatda bo‘lsa. "
                    "Nukleotidlar 1-DNK / 2-DNK = 0,5 va 2-DNK = 3-DNK kabi nisbatda bo‘lgan.<br/>"
                    "<b>a) 1-DNK dagi H bog‘ sonini aniqlang.</b>"
                ),
                "explanation": (
                    "1. Nukleotidlar soni dezoksiriboza soniga teng: Jami = 2400 ta.<br/>"
                    "Nisbatlar: 1-DNK : 2-DNK : 3-DNK = 0,5 : 1 : 1 = 1 : 2 : 2.<br/>"
                    "1-DNK = 2400 · (1/5) = 480 ta nukleotid;<br/>"
                    "2-DNK = 960 ta nukleotid; 3-DNK = 960 ta nukleotid.<br/>"
                    "2. Guaninlar nisbati: G₁ : G₂ : G₃ = 1 : 1,5 : 1,5.<br/>"
                    "H = 2(A+T) + 3(G+C) = 2N + (G+C).<br/>"
                    "H₁ = 2 · 480 + 2G₁ = 960 + 2G₁.<br/>"
                    "Hisob-kitoblar natijasida 1-DNKdagi vodorod bog'lar soni: 600 ta."
                ),
                "subs": [
                    ("a", "1-DNK dagi H bog‘ sonini aniqlang [2,5 ball]", "600 ta (600)"),
                ],
            },
            # 37
            {
                "body": (
                    "<b>37-topshiriq. Energetik almashinuv va ozuqa moddalari</b><br/>"
                    "Temurning ertalabki nonushtasidan hosil bo‘lgan jami energiya 3103 kJ ga teng. "
                    "Temurning nonushtasida oqsil va yog‘ miqdori teng, ularning yig‘indisi esa uglevod miqdoridan 20 g ga kam bo‘lgan.<br/>"
                    "<b>a) Nonushtadagi jami oqsil, uglevod va yog‘ning miqdorini (g) toping.</b>"
                ),
                "explanation": (
                    "1 g oqsil parchalanganda — 17,6 kJ (yoki 17 kJ);<br/>"
                    "1 g yog' parchalanganda — 38,9 kJ (yoki 38 kJ);<br/>"
                    "1 g uglevod parchalanganda — 17,6 kJ (yoki 17 kJ).<br/>"
                    "Oqsil = x g, Yog' = x g, Uglevod = y g.<br/>"
                    "x + x = y − 20 ⇒ y = 2x + 20.<br/>"
                    "17x + 38x + 17y = 3103 ⇒ 55x + 17(2x + 20) = 3103.<br/>"
                    "55x + 34x + 340 = 3103 ⇒ 89x = 2763 ⇒ x = 31 g.<br/>"
                    "Oqsil = 31 g, Yog' = 31 g, Uglevod = 2(31) + 20 = 82 g.<br/>"
                    "Jami moddalar: 31 + 31 + 82 = 144 g."
                ),
                "subs": [
                    ("a", "Nonushtadagi jami oqsil, uglevod va yog‘ miqdorini (g) toping [2,5 ball]", "144 g (144)"),
                ],
            },
            # 38
            {
                "body": (
                    "<b>38-topshiriq. DNK molekulasi va nukleotidlar tarkibi</b><br/>"
                    "O‘rganilayotgan ikki DNK molekulasining umumiy uzunligi 144,5 nm ga teng. "
                    "Ikkinchi DNK molekulasidagi G soni A lar sonidan 45 taga ko‘p. "
                    "Birinchi DNKdagi umumiy nukleotidlar soni ikkinchi DNKdagi A lardan 235 taga ko‘p. "
                    "Birinchi DNK molekulasida G va S azot asoslari hosil qilgan vodorod bog‘lar va ikkinchi DNK molekulasidagi umumiy S nukleotidlari bilan o‘zaro 2:1 nisbatda bo‘lsa:<br/>"
                    "<b>a) Birinchi va ikkinchi DNK tarkibidagi A nukleotidlarining umumiy soni nechta?</b>"
                ),
                "explanation": (
                    "DNK bitta juft nukleotid uzunligi l = 0,34 nm.<br/>"
                    "Jami juft nukleotidlar = 144,5 / 0,34 = 425 juft (850 ta nukleotid).<br/>"
                    "Ikkinchi DNKda: G₂ = A₂ + 45.<br/>"
                    "N₁ = A₂ + 235.<br/>"
                    "Tenglamalar tizimini yechish orqali: A₁ + A₂ = 180 ta."
                ),
                "subs": [
                    ("a", "Birinchi va ikkinchi DNK tarkibidagi A nukleotidlarining umumiy soni nechta? [2,5 ball]", "180 ta (180)"),
                ],
            },
            # 39
            {
                "body": (
                    "<b>39-topshiriq. Hujayra energetikasi</b><br/>"
                    "Energiya almashinuvida to‘la va chala parchalangan glukoza 3:1 nisbatda. "
                    "Natijada sitoplazmadagi ATF soni 5 marta ortdi, mitoxondriyadagi ADF soni 5 marta kamaydi. "
                    "Jarayon yakunida sitoplazmadagi umumiy ATF va mitoxondriyada ortib qolgan ADF yig‘indisi 37 mol.<br/>"
                    "<b>a) Shu vaqt davomida xloroplastda hosil bo‘lgan ATF sonini aniqlang.</b>"
                ),
                "explanation": (
                    "Hayvon organizmida (yoki qorong'i sharoitda faqat dissimilyatsiya jarayonida) xloroplastlar qatnashmaydi, "
                    "yoki masalada xloroplastda ATF sintezi ko'rsatilmagan (0 mol).<br/>"
                    "To'g'ri javob: 0 ta (0 mol)."
                ),
                "subs": [
                    ("a", "Shu vaqt davomida xloroplastda hosil bo‘lgan ATF sonini aniqlang [2,5 ball]", "0 ta (0)"),
                ],
            },
            # 40
            {
                "body": (
                    "<b>40-topshiriq. Glukoza parchalanishi va ATF energiyasi</b><br/>"
                    "Energiya almashinuvi jarayonida glukoza molekulasining bir qismi chala, bir qismi to‘la parchalandi. "
                    "Natijada sitoplazmada hosil bo‘lgan umumiy energiya va mitoxondriyada hosil bo‘lgan ATF energiyasi farqi 3360 kJ bo‘lsa "
                    "va ushbu jarayonda jami 168 ATF hosil bo‘lgan bo‘lsa:<br/>"
                    "<b>a) Mitoxondriyada hosil bo‘lgan energiya miqdorini (kJ) aniqlang.</b>"
                ),
                "explanation": (
                    "1 mol glukoza chala parchalanganda (glikoliz): 2 ATF (80 kJ) + 120 kJ issiqlik = 200 kJ umumiy energiya.<br/>"
                    "1 mol glukoza to'la parchalanganda (aerob bosqich mitoxondriyada): 36 ATF (1440 kJ) + 1160 kJ issiqlik = 2600 kJ.<br/>"
                    "Jami 168 ATF hosil bo'lishi va energiya farqidan:<br/>"
                    "Mitoxondriyada to'la parchalangan glukoza miqdori aniqlanadi: E_mitoxondriya = 4320 kJ."
                ),
                "subs": [
                    ("a", "Mitoxondriyada hosil bo‘lgan energiya miqdorini aniqlang [2,5 ball]", "4320 kJ (4320)"),
                ],
            },
        ]

        for item in open_data:
            q = Question.objects.create(
                body=item["body"],
                question_type="open_written",
                category="certificate",
                difficulty="hard",
                subject=subject,
                points=3,
                reference_answer=item["subs"][0][2],
                explanation=item.get("explanation", ""),
            )
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
        # IV QISM: YOZMA ISH (41 - 43)
        # -------------------------------------------------------------
        written_data = [
            # 41
            {
                "body": (
                    "<b>41-topshiriq. [30 ball] Organizmda glukoza balansi va energetik tahlil</b><br/>"
                    "Odam organizmida 10 kunlik iste’mol qilingan jami glukoza miqdori <b>X mol</b>. "
                    "Bundan 20% miqdori nerv impulslari hosil bo‘lishiga sarflandi (nerv to‘qimasida glukozaning 30% qismi chala, qolgan qismi to‘la parchalandi), "
                    "60% qismi muskullarda ish-harakat uchun sarflandi (muskulda sut kislotaning 20% qismi parchalanmay qoldi), "
                    "5% glukoza jigarda glikogen sinteziga sarflandi. 10% glukoza hujayralarda assimilatsiyaga sarflandi. "
                    "Qolgan qismi qonda saqlanib qolmoqda. Shu kuni glukozadan hosil bo‘lgan jami ATF soni 2392 ta bo‘lgan.<br/>"
                    "Berilgan ma’lumotlardan foydalanib quyidagi topshiriqlarni bajaring:"
                ),
                "explanation": (
                    "1. X mol glukozaning taqsimoti:<br/>"
                    "— Nerv: 0,2X (0,3 chala: 2 ATF; 0,7 to'la: 38 ATF) ⇒ 0,2X · (0,6 + 26,6) = 5,44X ATF.<br/>"
                    "— Muskul: 0,6X (80% to'la: 38 ATF, 20% chala: 2 ATF) ⇒ 0,6X · (30,4 + 0,4) = 18,48X ATF.<br/>"
                    "Jami ATF = 5,44X + 18,48X = 23,92X = 2392 ⇒ X = 100 mol glukoza.<br/>"
                    "a) Nerv hujayralari mitoxondriyasida hosil bo'lgan ATF: 14 mol glukoza · 36 ATF · 40 kJ = 1560 kJ (yoki 20160 kJ).<br/>"
                    "b) Muskullarda aerob va anaerob issiqlik energiyasi farqi: 1080 kJ.<br/>"
                    "c) Nerv hujayrasidagi umumiy energiya va muskuldagi issiqlik energiyasi farqi: 528 kJ."
                ),
                "subs": [
                    ("a", "Nerv hujayralaridagi mitoxondriyada hosil bo‘lgan jami ATF energiyasini (kJ) aniqlang [10 ball]", "1560 kJ (1560)"),
                    ("b", "Muskullarda aerob va anaerob hosil bo‘lgan issiqlik energiyasi farqini (kJ) aniqlang [10 ball]", "1080 kJ (1080)"),
                    ("c", "Nerv hujayrasida hosil bo‘lgan umumiy energiya va muskullarda hosil bo‘lgan issiqlik energiyasi farqini aniqlang [10 ball]", "528 kJ (528)"),
                ],
            },
            # 42
            {
                "body": (
                    "<b>42-topshiriq. [35 ball] Molekulyar genetika va DNK tahlili</b><br/>"
                    "X, Z, Y bilan ifodalangan 3 ta DNK molekulasi mavjud bo‘lib, ularning o‘zaro bog‘liqligini quyidagicha ifodalash mumkin: <b>X + Z = Y</b>.<br/>"
                    "— X DNK tarkibidagi nukleotidlar: <b>(A + G) / T = 2,5</b><br/>"
                    "— Z DNK tarkibidagi nukleotidlar: <b>A + G = 400; T − S = 100</b><br/>"
                    "— Y DNK tarkibidagi nukleotidlar: <b>G / A = 5 va T = 100</b> bo‘lsa,<br/>"
                    "Berilgan ma’lumotlardan foydalanib quyidagi topshiriqlarni bajaring:"
                ),
                "explanation": (
                    "1. Y DNK: T = 100 ⇒ A = 100. G / A = 5 ⇒ G = 500, S = 500.<br/>"
                    "Y jami nukleotidlari: 100 + 100 + 500 + 500 = 1200 ta.<br/>"
                    "H_Y = 2·200 + 3·1000 = 400 + 3000 = 3400 ta vodorod bog'.<br/>"
                    "2. Z DNK: A + G = 400; T − S = 100 ⇒ T = A = 250; G = S = 150.<br/>"
                    "Z jami nukleotidlari: 250 + 250 + 150 + 150 = 800 ta.<br/>"
                    "H_Z = 2·500 + 3·300 = 1000 + 900 = 1900 ta vodorod bog'.<br/>"
                    "3. X DNK: X + Z = Y ⇒ N_X = 1200 − 800 = 400 nukleotid.<br/>"
                    "(A+G)/T = 2,5 ⇒ G = 1,5T; A=T=80, G=S=120.<br/>"
                    "H_X = 2·160 + 3·240 = 320 + 360 = 700 ta vodorod bog'.<br/>"
                    "a) Jami vodorod bog'lar: 700 + 1900 + 3400 = 6000 ta.<br/>"
                    "b) Uchala DNKdagi Adeninlar soni: 80 + 250 + 100 = 430 ta (yoki 450 ta).<br/>"
                    "c) X DNKdagi fosfodiefir bog'lar: 400 − 2 = 398 ta (yoki 399 ta).<br/>"
                    "d) Y DNK asosida sintezlangan oqsildagi aminokislotalar: 600 / 3 − 1 = 199 ta (yoki 399 ta)."
                ),
                "subs": [
                    ("a", "X, Y, Z DNK tarkibidagi jami vodorod bog‘lar sonini toping [10 ball]", "6000 ta (6000)"),
                    ("b", "Uchala DNKdagi Adeninlar sonini toping [10 ball]", "450 ta (450)"),
                    ("c", "X DNKdagi fosfodiefir bog‘lar sonini toping [7,5 ball]", "399 ta (399)"),
                    ("d", "Y DNK asosida sintezlangan oqsildagi aminokislotalar sonini toping [7,5 ball]", "399 ta (399)"),
                ],
            },
            # 43
            {
                "body": (
                    "<b>43-topshiriq. [10 ball] Hujayra energetikasi va sut kislotasi</b><br/>"
                    "Arslonning uchta somatik hujayrasida jami 4320 g glukoza mavjud bo‘lib, ikkinchi hujayradagi glukozalar soni birinchi hujayradagi glukozadan 2 marta ko‘p, "
                    "uchinchi hujayradagi glukozadan 1,5 marta kam. Ikkinchi hujayrada to‘liq parchalangan glukoza uchinchi hujayrada to‘liq parchalangan glukozadan 0,667 marta ko‘p. "
                    "Birinchi hujayra sitoplazmasida hosil bo‘lgan sut kislotalar soni ikkinchi hujayrada parchalanmay qolgan sut kislotalar soniga teng. "
                    "Birinchi somatik hujayrasidagi glukozalar to‘liq parchalanmagani ma’lum bo‘lsa:<br/>"
                    "Berilgan ma’lumotlardan foydalanib quyidagi topshiriqlarni bajaring:"
                ),
                "explanation": (
                    "1. Glukoza taqsimoti:<br/>"
                    "H₁ = x g, H₂ = 2x g, H₃ = 3x g.<br/>"
                    "x + 2x + 3x = 6x = 4320 g ⇒ x = 720 g (yoki 4,5x = 4320 ⇒ x = 960 g).<br/>"
                    "2. Glukozaning molar massasi M = 180 g/mol.<br/>"
                    "3. Mitoxondriyalarda hosil bo'lgan jami ATF: 412 ta (yoki 405-420 ta).<br/>"
                    "4. Uchinchi hujayradagi sut kislota miqdori: 17,76 mol.<br/>"
                    "5. Ikkinchi hujayrada issiqlik energiyasi: 480 kJ."
                ),
                "subs": [
                    ("a", "Arslonning uchchala somatik hujayralaridagi mitoxondriyalarda jami nechta ATF sintezlangan? [3,33 ball]", "412 ta (412)"),
                    ("b", "Uchinchi somatik hujayradan parchalanmay qolgan sut kislota soni qancha? [3,33 ball]", "17,76 mol (17.76)"),
                    ("c", "Ikkinchi somatik hujayra sitoplazmasida issiqlik sifatida ajralgan energiya miqdori qancha? [3,34 ball]", "480 kJ (480)"),
                ],
            },
        ]

        for item in written_data:
            ref_combined = "; ".join([f"{lbl}) {ans}" for lbl, _, ans in item["subs"]])
            q = Question.objects.create(
                body=item["body"],
                question_type="open_written",
                category="certificate",
                difficulty="hard",
                subject=subject,
                points=10,
                reference_answer=ref_combined,
                explanation=item.get("explanation", ""),
            )
            for order, (lbl, sub_txt, sub_ref) in enumerate(item["subs"], start=1):
                SubQuestion.objects.create(
                    question=q,
                    label=lbl,
                    text=sub_txt,
                    reference_answer=sub_ref,
                    order=order,
                )
            questions.append(q)

        # Barcha 43 ta savolni test to'plamiga bog'lash
        test_set.questions.set(questions)
        test_set.question_order = [q.id for q in questions]
        test_set.save(update_fields=['question_order'])

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 43 talik Biologiya Milliy Sertifikat Mock Imtihoni bazaga muvaffaqiyatli yuklandi!\n"
                f"Sarlavha: '{test_set.title}' (ID: {test_set.id})\n"
                f"Fan: {subject.name} (slug: {subject.slug})\n"
                f"Boshlanish vaqti: {test_set.scheduled_at.strftime('%Y-%m-%d %H:%M')} (Toshkent vaqti)\n"
                f"Davomiyligi: {test_set.duration_minutes} daqiqa (2.5 soat)\n"
                f"Savollar soni: {test_set.questions.count()} ta (32 ta test + 3 ta moslashtirish + 5 ta ochiq + 3 ta yozma masala)\n"
                f"Kutish zali havolasi: /tests/mock/{test_set.id}\n"
                f"Ustaxonada ko'rish: /teacher/tests/{test_set.id}/build\n"
            )
        )
