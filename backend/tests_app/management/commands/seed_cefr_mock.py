"""Django management command: CEFR Multi-Level to'liq Mock imtihonini yaratish.

Bitta test kartasida barcha 3 ta ko'nikma:
1. LISTENING (6 ta part, 35 ta savol: MCQ, Gap-fill, Matching, Map labeling SVG bilan)
2. READING (5 ta part, 35 ta savol: Gap-fill, Matching, Headings, MCQ, TFNG)
3. WRITING (3 ta topshiriq: Task 1.1 norasmiy xat, Task 1.2 rasmiy xat, Task 2 insho/esse)

Foydalanish:
    python manage.py seed_cefr_mock
    python manage.py seed_cefr_mock --force
    python manage.py seed_cefr_mock --today
"""
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from learning.models import Topic
from tests_app.models import (
    Subject, TestSet, Question, AnswerOption, AcceptedAnswer,
    ExamSection, QuestionGroup, GroupOption
)


MOCK_TITLE = "CEFR Multi-Level Complete Mock (Listening + Reading + Writing)"
MOCK_DESC = (
    "Davlat Test Markazi (BMB) va CEFR B2-C1 milliy sertifikat formati: "
    "Listening (6 parts, 35 questions), Reading (5 parts, 35 questions) va "
    "Writing (Task 1.1, Task 1.2, Task 2). Barcha ko'nikmalar bitta imtihon oqimida."
)


class Command(BaseCommand):
    help = "CEFR Multi-Level (Listening + Reading + Writing) mock imtihonini bazaga to'liq yuklaydi."

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
            help="Imtihon davomiyligi daqiqalarda (standart: 150 daqiqa: 35m listening + 60m reading + 55m writing).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get('force', False)
        for_today = options.get('today', False)
        duration = options.get('duration', 150)

        # Subject 'Ingliz tili' topish yoki yaratish
        subject = Subject.objects.filter(slug__in=['ingliz-tili', 'english', 'cefr']).first()
        if not subject:
            subject = Subject.objects.filter(name__icontains='ingliz').first()
        if not subject:
            subject, _ = Subject.objects.get_or_create(
                slug="ingliz-tili",
                defaults={
                    "name": "Ingliz tili",
                    "icon_name": "languages",
                    "color": "#a855f7",
                    "order": 5,
                },
            )

        existing = TestSet.objects.filter(title=MOCK_TITLE).first()
        if existing:
            if force:
                self.stdout.write(f"Eski '{MOCK_TITLE}' (#{existing.id}) o'chirilmoqda...")
                # ExamSections va QuestionGroups tozalash
                ExamSection.objects.filter(test_set=existing).delete()
                QuestionGroup.objects.filter(test_set=existing).delete()
                existing.delete()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"'{MOCK_TITLE}' allaqachon mavjud (ID: {existing.id}). "
                        f"Qayta yaratish uchun --force bayrog'ini ishlating:\n"
                        f"python manage.py seed_cefr_mock --force"
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
            category="cefr",
            duration_minutes=duration,
            is_live_mock=True,
            scheduled_at=scheduled_at,
            is_published=True,
            is_premium=False,
            notify_all=True,
        )

        all_questions = []

        # =========================================================================
        # 1. LISTENING BO'LIMI (6 ta Part, 35 ta savol)
        # =========================================================================

        # --- Listening Part 1 (Questions 1-8: Single Choice) ---
        l_sec1 = ExamSection.objects.create(
            test_set=test_set,
            skill="listening",
            part_number=1,
            title="Part 1 — Sentence Replies",
            instruction="You will hear some sentences. You will hear each sentence twice. Choose the correct reply to each sentence (A, B, or C).",
            audio_play_limit=2,
            duration_minutes=6,
            order=1,
        )
        l_part1_data = [
            (1, [("A", "Congratulations on your promotion."), ("B", "What benefit can I get?"), ("C", "Jenny will deal with the complaint.")], "B"),
            (2, [("A", "Who arrived at the airport yesterday?"), ("B", "We don't have to worry about it."), ("C", "She's the chief flight attendant.")], "B"),
            (3, [("A", "The conference will be held next month."), ("B", "Before March 3rd."), ("C", "In the bottom drawer.")], "B"),
            (4, [("A", "Can you tell me why?"), ("B", "No, I didn't stare straight into the camera."), ("C", "I usually use the copy machine at the corner.")], "A"),
            (5, [("A", "You're welcome."), ("B", "Was it out of order?"), ("C", "I was in the meeting room.")], "B"),
            (6, [("A", "Yes, he comes back next Monday."), ("B", "This product will be released next week."), ("C", "Don't throw the receipt away.")], "A"),
            (7, [("A", "I usually wear a suit."), ("B", "It's across from the post office."), ("C", "It's 3 o'clock sharp.")], "B"),
            (8, [("A", "It's 50% off today."), ("B", "There's a walking path only."), ("C", "Actually, it's a stolen vehicle.")], "B"),
        ]
        for num, choices, correct_lbl in l_part1_data:
            q = Question.objects.create(
                subject=subject,
                section=l_sec1,
                exam_number=num,
                body=f"<b>Question {num}.</b> Choose the correct reply (A, B, or C):",
                question_type="single_choice",
                category="cefr",
                difficulty="easy",
                points=1,
            )
            for lbl, text in choices:
                AnswerOption.objects.create(
                    question=q,
                    text=f"{lbl}) {text}",
                    is_correct=(lbl == correct_lbl),
                )
            all_questions.append(q)

        # --- Listening Part 2 (Questions 9-14: Gap Fill) ---
        l_sec2_passage = (
            "<div style='line-height:1.8;'>"
            "<h4 style='margin:0 0 10px 0; color:#4338ca;'>Science Museum Film Event</h4>"
            "<p><b>The Film</b><br/>"
            "• Country featured in the film: Greenland<br/>"
            "• Day of screening: <b>{{9}}</b><br/>"
            "• Museum closing time: <b>{{10}}</b></p>"
            "<p><b>Additional Activities at the Museum</b><br/>"
            "• Utilize the computers located in the <b>{{11}}</b><br/>"
            "• View a model <b>{{12}}</b> on the first floor<br/>"
            "• Visit the <b>{{13}}</b> on the highest floor</p>"
            "<p><b>How to Obtain Free Film Tickets</b><br/>"
            "• If successful, you will be notified by email before 12 o’clock on <b>{{14}}</b></p>"
            "</div>"
        )
        l_sec2 = ExamSection.objects.create(
            test_set=test_set,
            skill="listening",
            part_number=2,
            title="Part 2 — Science Museum Film Event",
            instruction="You will hear someone giving a talk. For each question, fill in the missing information in the numbered space. Write ONE WORD and / or A NUMBER for each answer.",
            passage=l_sec2_passage,
            audio_play_limit=2,
            duration_minutes=6,
            order=2,
        )
        l_part2_data = [
            (9, ["Sunday", "sunday"]),
            (10, ["Seven", "7", "7:00", "7 pm", "seven"]),
            (11, ["Basement", "basement"]),
            (12, ["Space-ship", "spaceship", "space ship", "Spaceship"]),
            (13, ["Café", "Cafe", "café", "cafe"]),
            (14, ["Saturday", "saturday"]),
        ]
        for num, answers in l_part2_data:
            q = Question.objects.create(
                subject=subject,
                section=l_sec2,
                exam_number=num,
                body=f"<b>Question {num}.</b> Fill in the gap with ONE word and/or a number:",
                question_type="gap_fill",
                category="cefr",
                difficulty="medium",
                points=1,
                max_words=2,
            )
            for pos, ans in enumerate(answers):
                AcceptedAnswer.objects.create(question=q, text=ans, order=pos)
            all_questions.append(q)

        # --- Listening Part 3 (Questions 15-18: Matching Speakers to Places) ---
        l_sec3 = ExamSection.objects.create(
            test_set=test_set,
            skill="listening",
            part_number=3,
            title="Part 3 — Speakers and Places",
            instruction="You will hear people speaking in different situations. Match each speaker (15-18) to the place where the speaker is (A-F). There are TWO EXTRA places which you do not need to use.",
            audio_play_limit=2,
            duration_minutes=6,
            order=3,
        )
        l_sec3_group = QuestionGroup.objects.create(
            test_set=test_set,
            instruction="Match each speaker (15-18) to the place where the speaker is (A-F).",
            order=3,
        )
        l_part3_options = [
            ("A", "In the art lesson"),
            ("B", "In a hotel"),
            ("C", "In a vet’s clinic"),
            ("D", "In a music lesson"),
            ("E", "In a children’s playground"),
            ("F", "At a craft exhibition"),
        ]
        l_p3_opt_map = {}
        for pos, (lbl, txt) in enumerate(l_part3_options):
            opt = GroupOption.objects.create(group=l_sec3_group, label=lbl, text=txt, order=pos)
            l_p3_opt_map[lbl] = opt

        l_part3_answers = [(15, "E"), (16, "C"), (17, "D"), (18, "F")]
        for num, ans_lbl in l_part3_answers:
            q = Question.objects.create(
                subject=subject,
                section=l_sec3,
                group=l_sec3_group,
                correct_group_option=l_p3_opt_map[ans_lbl],
                exam_number=num,
                body=f"<b>Speaker {num}</b> is located in:",
                question_type="grouped_item",
                category="cefr",
                difficulty="medium",
                points=1,
            )
            all_questions.append(q)

        # --- Listening Part 4 (Questions 19-23: Map Labeling) ---
        svg_map = (
            "<div style='display:flex;flex-direction:column;align-items:center;margin:12px 0;'>"
            "<svg width='400' height='280' viewBox='0 0 400 280' style='background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;'>"
            "<!-- Fence -->"
            "<rect x='80' y='30' width='300' height='220' rx='4' fill='none' stroke='#64748b' stroke-dasharray='6 3' stroke-width='1.5'/>"
            "<text x='310' y='245' font-size='11' fill='#64748b'>Fence</text>"
            "<!-- Road & Path -->"
            "<path d='M20,40 C45,100 45,180 20,260' fill='none' stroke='#93c5fd' stroke-width='22'/>"
            "<text x='45' y='150' font-size='10' fill='#2563eb' transform='rotate(-90 45,150)'>Road</text>"
            "<path d='M40,240 C90,260 140,240 180,215' fill='none' stroke='#1e40af' stroke-width='5'/>"
            "<text x='95' y='245' font-size='10' font-weight='bold' fill='#1e40af'>Path</text>"
            "<!-- Main Building -->"
            "<rect x='100' y='70' width='180' height='140' fill='#ffffff' stroke='#1e293b' stroke-width='2'/>"
            "<!-- Outside box & A -->"
            "<rect x='105' y='42' width='25' height='16' fill='#3b82f6'/>"
            "<text x='135' y='54' font-size='10' fill='#334155'>Box</text>"
            "<rect x='220' y='40' width='20' height='20' fill='#fef08a' stroke='#ca8a04'/>"
            "<text x='226' y='55' font-weight='bold' font-size='12' fill='#854d0e'>A</text>"
            "<!-- Outside Doors & C -->"
            "<text x='150' y='82' font-size='9' fill='#475569'>Outside Doors</text>"
            "<rect x='145' y='86' width='14' height='10' fill='#2563eb'/>"
            "<rect x='162' y='86' width='14' height='10' fill='#2563eb'/>"
            "<rect x='180' y='86' width='14' height='10' fill='#2563eb'/>"
            "<rect x='142' y='72' width='16' height='14' fill='#fef08a' stroke='#ca8a04'/>"
            "<text x='146' y='83' font-weight='bold' font-size='10' fill='#854d0e'>C</text>"
            "<!-- Rooms inside -->"
            "<circle cx='145' cy='130' r='22' fill='#f1f5f9' stroke='#64748b'/>"
            "<text x='141' y='135' font-weight='bold' fill='#1e293b'>B</text>"
            "<rect x='175' y='120' width='30' height='20' fill='#f8fafc' stroke='#64748b'/>"
            "<text x='185' y='135' font-weight='bold' fill='#1e293b'>H</text>"
            "<rect x='220' y='86' width='30' height='20' fill='#f8fafc' stroke='#64748b'/>"
            "<text x='231' y='101' font-weight='bold' fill='#1e293b'>G</text>"
            "<text x='103' y='110' font-size='9' fill='#475569'>TV</text>"
            "<rect x='102' y='120' width='16' height='20' fill='#fef08a' stroke='#ca8a04'/>"
            "<text x='106' y='135' font-weight='bold' font-size='11' fill='#854d0e'>D</text>"
            "<rect x='120' y='155' width='16' height='18' fill='#f8fafc' stroke='#64748b'/>"
            "<text x='125' y='168' font-weight='bold' font-size='11' fill='#1e293b'>I</text>"
            "<!-- Main Door, Gate, Offices & F -->"
            "<rect x='100' y='195' width='180' height='15' fill='#f8fafc' stroke='#1e293b'/>"
            "<text x='180' y='225' font-size='9' font-weight='bold' fill='#1e293b'>Main Door</text>"
            "<text x='178' y='206' font-size='9' fill='#475569'>Gate</text>"
            "<text x='225' y='206' font-size='9' fill='#475569'>Offices</text>"
            "<rect x='152' y='195' width='16' height='15' fill='#fef08a' stroke='#ca8a04'/>"
            "<text x='157' y='207' font-weight='bold' font-size='11' fill='#854d0e'>F</text>"
            "<!-- Outside right shed E -->"
            "<rect x='330' y='85' width='22' height='40' fill='#fef08a' stroke='#ca8a04'/>"
            "<text x='337' y='110' font-weight='bold' font-size='13' fill='#854d0e'>E</text>"
            "</svg></div>"
        )
        l_sec4 = ExamSection.objects.create(
            test_set=test_set,
            skill="listening",
            part_number=4,
            title="Part 4 — Map Labeling",
            instruction="You will hear someone giving a talk. Label the places (19-23) on the map (A-I). There are FOUR extra options which you do not need to use.",
            passage=svg_map,
            audio_play_limit=2,
            duration_minutes=6,
            order=4,
        )
        l_sec4_group = QuestionGroup.objects.create(
            test_set=test_set,
            instruction="Label the places (19-23) on the map (A-I).",
            order=4,
        )
        l_p4_opt_map = {}
        for pos, char in enumerate("ABCDEFGHI"):
            opt = GroupOption.objects.create(group=l_sec4_group, label=char, text=f"Location {char}", order=pos)
            l_p4_opt_map[char] = opt

        l_part4_items = [
            (19, "Shoe rack", "F"),
            (20, "Bookcase", "D"),
            (21, "Cubbyholes", "G"),
            (22, "Climbing walls", "A"),
            (23, "Chickens", "E"),
        ]
        for num, label_name, ans_lbl in l_part4_items:
            q = Question.objects.create(
                subject=subject,
                section=l_sec4,
                group=l_sec4_group,
                correct_group_option=l_p4_opt_map[ans_lbl],
                exam_number=num,
                body=f"<b>{num}. {label_name}</b> is at location:",
                question_type="grouped_item",
                category="cefr",
                difficulty="medium",
                points=1,
            )
            all_questions.append(q)

        # --- Listening Part 5 (Questions 24-29: Multiple Choice) ---
        l_sec5 = ExamSection.objects.create(
            test_set=test_set,
            skill="listening",
            part_number=5,
            title="Part 5 — Three Extracts",
            instruction="You will hear three extracts. Choose the correct answer (A, B or C) for each question (24-29). There are TWO questions for each extract.",
            audio_play_limit=2,
            duration_minutes=6,
            order=5,
        )
        l_part5_data = [
            (24, "<b>Extract One</b><br/>How does the man feel as he speaks to Amanda?", [("A", "worried about giving her more work"), ("B", "anxious about asking for more time to do a project"), ("C", "embarrassed about needing some help")], "C"),
            (25, "What does the woman say the man should do?", [("A", "write down a limited number of goals"), ("B", "check emails when he gets into the office"), ("C", "look around for a task management system he likes")], "A"),
            (26, "<b>Extract Two</b><br/>The woman advises the man to…", [("A", "check that his best suit still fits him."), ("B", "find out what the company’s employees wear."), ("C", "ask the company what its dress policy is.")], "B"),
            (27, "What does the man get annoyed by?", [("A", "ties with bright patterns on them"), ("B", "shoes that haven’t been cleaned"), ("C", "suits made of shiny material")], "C"),
            (28, "<b>Extract Three</b><br/>What do the speakers identify as their first step?", [("A", "to put together an action plan"), ("B", "to give the woman additional training"), ("C", "to inform everyone involved in the visit")], "C"),
            (29, "What does the woman think is a possible weakness?", [("A", "the preparation of all the documents"), ("B", "the experience of a key member of staff"), ("C", "the availability of some personnel")], "B"),
        ]
        for num, body_txt, choices, ans_lbl in l_part5_data:
            q = Question.objects.create(
                subject=subject,
                section=l_sec5,
                exam_number=num,
                body=f"<b>Question {num}.</b> {body_txt}",
                question_type="single_choice",
                category="cefr",
                difficulty="hard",
                points=1,
            )
            for lbl, text in choices:
                AnswerOption.objects.create(
                    question=q,
                    text=f"{lbl}) {text}",
                    is_correct=(lbl == ans_lbl),
                )
            all_questions.append(q)

        # --- Listening Part 6 (Questions 30-35: Gap Fill) ---
        l_sec6_passage = (
            "<div style='line-height:1.8;'>"
            "<h4 style='margin:0 0 10px 0; color:#4338ca;'>The Early History of Salt</h4>"
            "<p><b>Introduction</b><br/>"
            "- Salt is essential for human <b>{{30}}</b></p>"
            "<p><b>Ancient Rome</b><br/>"
            "- The word <b>{{31}}</b> comes from the Latin word's solarium argetum, which was used to describe the payment to Roman soldiers.</p>"
            "<p><b>Ancient Sweden</b><br/>"
            "- Animals were kept in the local <b>{{32}}</b> at the right time of year.<br/>"
            "- Fresh meat was only available in <b>{{33}}</b><br/>"
            "- Salt has been used widely: we can tell from the diet of the <b>{{34}}</b> in Sweden.<br/>"
            "- <b>{{35}}</b> consumption increased rapidly because the food was much too salty.</p>"
            "</div>"
        )
        l_sec6 = ExamSection.objects.create(
            test_set=test_set,
            skill="listening",
            part_number=6,
            title="Part 6 — The Early History of Salt",
            instruction="You will hear a part of a lecture. For each question, fill in the missing information in the numbered space. Write no more than ONE WORD for each answer.",
            passage=l_sec6_passage,
            audio_play_limit=2,
            duration_minutes=6,
            order=6,
        )
        l_part6_data = [
            (30, ["Health", "health"]),
            (31, ["Salary", "salary"]),
            (32, ["Forest", "forest"]),
            (33, ["October", "october"]),
            (34, ["King", "king"]),
            (35, ["Beer", "beer"]),
        ]
        for num, answers in l_part6_data:
            q = Question.objects.create(
                subject=subject,
                section=l_sec6,
                exam_number=num,
                body=f"<b>Question {num}.</b> Fill in the gap with ONE word:",
                question_type="gap_fill",
                category="cefr",
                difficulty="medium",
                points=1,
                max_words=1,
            )
            for pos, ans in enumerate(answers):
                AcceptedAnswer.objects.create(question=q, text=ans, order=pos)
            all_questions.append(q)

        # =========================================================================
        # 2. READING BO'LIMI (5 ta Part, 35 ta savol)
        # =========================================================================

        # --- Reading Part 1 (Questions 1-6: Gap Fill) ---
        r_sec1_passage = (
            "<p>A boy named Tom went for his usual walk in the forest near his house. He enjoyed spending time in nature because it helped him relax and forget about school stress. There was a narrow path in the <b>{{1}}</b> that he often followed. The path was quiet and peaceful, and Tom liked listening to the sounds of birds and the wind in the trees.</p>"
            "<p>One afternoon, while he was walking along the <b>{{2}}</b>, he suddenly heard a strange noise coming from the bushes. At first, he felt a little nervous, but he was also curious. He walked towards the direction of the <b>{{3}}</b>. As he got closer, he noticed something moving under the leaves.</p>"
            "<p>When he looked more carefully, he saw a small bird on the ground. The <b>{{4}}</b> seemed weak, and the bird’s wing was injured. It could not fly away. Tom felt sorry for the poor animal and decided to help it. He gently picked up the bird and carried it home to heal its <b>{{5}}</b>.</p>"
            "<p>At home, Tom did not know what to do. He did not want to make the situation worse. Therefore, he decided to ask his biology teacher for advice. He called his <b>{{6}}</b> and explained what had happened in the forest. The teacher told him how to take care of the bird and suggested taking it to a local animal clinic if the wing did not improve.</p>"
            "<p>Tom was proud of himself for helping the injured bird. It was a simple walk in the forest, but it became a meaningful experience for him.</p>"
        )
        r_sec1 = ExamSection.objects.create(
            test_set=test_set,
            skill="reading",
            part_number=1,
            title="Part 1 — INJURED BIRD",
            instruction="Read the texts. Fill in each gap with ONE word. You must use a word which is somewhere in the rest of the text. Mark your answers on the answer sheet.",
            passage=r_sec1_passage,
            duration_minutes=10,
            order=7,
        )
        r_part1_data = [
            (1, ["forest", "Forest"]),
            (2, ["path", "Path"]),
            (3, ["noise", "Noise", "sound", "Sound"]),
            (4, ["bird", "Bird", "animal", "Animal"]),
            (5, ["wing", "Wing"]),
            (6, ["teacher", "Teacher"]),
        ]
        for num, answers in r_part1_data:
            q = Question.objects.create(
                subject=subject,
                section=r_sec1,
                exam_number=num,
                body=f"<b>Gap {num}.</b> Fill in with ONE word found elsewhere in the text:",
                question_type="gap_fill",
                category="cefr",
                difficulty="medium",
                points=1,
                max_words=1,
            )
            for pos, ans in enumerate(answers):
                AcceptedAnswer.objects.create(question=q, text=ans, order=pos)
            all_questions.append(q)

        # --- Reading Part 2 (Questions 7-14: Texts 1-8 Matching Statements A-J) ---
        r_sec2 = ExamSection.objects.create(
            test_set=test_set,
            skill="reading",
            part_number=2,
            title="Part 2 — Matching Descriptions",
            instruction="Read the texts 1–8 and the statements A–J. Decide which text matches the situation described in the statements. Each statement can be used ONLY ONCE. There are TWO extra statements you do not need to use.",
            duration_minutes=12,
            order=8,
        )
        r_sec2_group = QuestionGroup.objects.create(
            test_set=test_set,
            instruction="Decide which statement (A-J) matches the situation described in each text.",
            order=8,
        )
        r_part2_options = [
            ("A", "You want to know about events happening recently at a global scale."),
            ("B", "You want to gain experience and build a successful career."),
            ("C", "You like wildlife and want to protect the environment."),
            ("D", "You are fond of cooking and learning other countries' cuisines."),
            ("E", "You want to play computer games and chat with friends."),
            ("F", "You want to go out to eat and meet new friends."),
            ("G", "You have a creative mind and want to learn new skills and make new friends."),
            ("H", "You want your city to become a touristic place for visitors."),
            ("I", "You want to relax and enjoy music and social events."),
            ("J", "You want to meet people and have fun at parties."),
        ]
        r_p2_opt_map = {}
        for pos, (lbl, txt) in enumerate(r_part2_options):
            opt = GroupOption.objects.create(group=r_sec2_group, label=lbl, text=txt, order=pos)
            r_p2_opt_map[lbl] = opt

        r_part2_paragraphs = [
            (7, "1. Think", "Think is a website where you can read short articles about world news. It covers important global events and explains them in simple language. You can learn what is happening in different countries and understand modern problems easily. It is updated every day.", "A"),
            (8, "2. Plus Party", "Plus Party is a fun social club for young people. Members meet at different places to enjoy music, dance, and games. It is a great way to relax after work or study and meet new people in a friendly environment.", "I"),
            (9, "3. A Nature Lover", "A Nature Lover is a group for people who enjoy wildlife and nature. Members take part in activities like cleaning parks, planting trees, and protecting animals. It is perfect for people who care about the environment.", "C"),
            (10, "4. A Food of World", "A Food of World is a cooking club where you can learn recipes from different countries. Members share ideas, cook together, and discover new tastes. It is great for anyone who loves food and wants to try international dishes.", "D"),
            (11, "5. Chat and Game", "Chat and Game is an online platform where users can play computer games and talk with friends. You can join different game rooms, compete with others, and chat at the same time. It is fun and easy to use.", "E"),
            (12, "6. Come and Dine with We", "Come and Dine with We is a social dining group. People meet in restaurants to enjoy meals and have conversations. It is a great chance to try new food and make new friends in a relaxed setting.", "F"),
            (13, "7. Action", "Action is a creative club where young people learn new skills like art, music, and design. Members work on projects together and share ideas. It is perfect for creative minds who want to grow and meet others.", "G"),
            (14, "8. City Explorers", "City Explorers is a group that helps improve cities and make them more attractive for tourists. Members organize tours, create guides, and promote local culture. It is ideal for people who love their city.", "H"),
        ]
        for num, title_txt, body_txt, ans_lbl in r_part2_paragraphs:
            q = Question.objects.create(
                subject=subject,
                section=r_sec2,
                group=r_sec2_group,
                correct_group_option=r_p2_opt_map[ans_lbl],
                exam_number=num,
                body=f"<b>{title_txt}</b><br/>{body_txt}",
                question_type="grouped_item",
                category="cefr",
                difficulty="medium",
                points=1,
            )
            all_questions.append(q)

        # --- Reading Part 3 (Questions 15-20: Headings for Paragraphs 15-20) ---
        r_sec3 = ExamSection.objects.create(
            test_set=test_set,
            skill="reading",
            part_number=3,
            title="Part 3 — Matching Headings",
            instruction="Read the text and choose the correct heading (K–R) for each paragraph (15–20) from the list of headings below. There are more headings than paragraphs, so you will not use all of them. You cannot use any heading more than once.",
            duration_minutes=12,
            order=9,
        )
        r_sec3_group = QuestionGroup.objects.create(
            test_set=test_set,
            instruction="Choose the correct heading (K-R) for each paragraph (15-20).",
            order=9,
        )
        r_part3_headings = [
            ("K", "Weekends as time to recharge"),
            ("L", "Getting ready for the first day"),
            ("M", "Using a journey to school efficiently"),
            ("N", "Preparing homework the night before"),
            ("O", "Building a relationship through a shared activity"),
            ("P", "Sports as the best way to make friends"),
            ("Q", "Staying calm in unexpected situations"),
            ("R", "Short breaks are essential in learning"),
        ]
        r_p3_opt_map = {}
        for pos, (lbl, txt) in enumerate(r_part3_headings):
            opt = GroupOption.objects.create(group=r_sec3_group, label=lbl, text=txt, order=pos)
            r_p3_opt_map[lbl] = opt

        r_part3_paragraphs = [
            (15, "The night before something new, like a job or school, many people feel nervous. They often check their bag several times and lay out clothes for the morning. This helps them feel more in control. Being organised in advance reduces morning stress. It also gives them time to think about what they need. As a result, they start the day feeling prepared and confident.", "L"),
            (16, "When you are stuck in traffic or waiting for a delayed train, it is easy to get angry. However, losing your temper does not solve anything. Taking deep breaths and accepting the delay can help you stay relaxed. Listening to music or a podcast also keeps your mind busy. This way, you arrive at your destination without feeling exhausted or upset.", "Q"),
            (17, "Cooking dinner together or cleaning the house might seem boring. But these ordinary moments can bring people closer. When two people wash dishes or prepare a meal side by side, they talk and laugh naturally. This shared effort creates a feeling of teamwork. Over time, these small activities build trust and understanding between them.", "O"),
            (18, "Studying for hours without stopping often leads to tiredness and poor concentration. The brain needs time to process information. Taking just five minutes to stand up, stretch, or drink water can make a big difference. After a short rest, you return to your work feeling refreshed. Many successful students use this technique to stay focused for longer periods.", "R"),
            (19, "The daily trip to school or work is often seen as wasted time. But it does not have to be. You can listen to educational podcasts, review notes, or plan your day in your head. Some people use this time to read or learn new words in a foreign language. Turning travel time into learning time makes the journey productive and enjoyable.", "M"),
            (20, "After a busy week of studying or working, the body and mind need rest. Sleeping late, meeting friends, or simply doing nothing can help you recover. Without proper rest, you will feel tired when the new week begins. Weekends give you a chance to relax and prepare for the challenges ahead. People who use weekends wisely are usually happier and more energetic.", "K"),
        ]
        for num, body_txt, ans_lbl in r_part3_paragraphs:
            q = Question.objects.create(
                subject=subject,
                section=r_sec3,
                group=r_sec3_group,
                correct_group_option=r_p3_opt_map[ans_lbl],
                exam_number=num,
                body=f"<b>Paragraph {num}</b><br/>{body_txt}",
                question_type="grouped_item",
                category="cefr",
                difficulty="medium",
                points=1,
            )
            all_questions.append(q)

        # --- Reading Part 4 (Questions 21-29: Alexander von Humboldt Passage) ---
        r_sec4_passage = (
            "<p>Alexander von Humboldt, born in 1769, began his professional career as a mining inspector in Prussia. Although the position offered prestige and security, he found the work monotonous and limiting. Humboldt was far more captivated by the prospect of observing nature directly in unfamiliar and uncharted territories. The turning point came with the death of his mother, whose inheritance provided him with sufficient means to abandon his official duties and embark upon extensive scientific travels.</p>"
            "<p>In 1799, he departed for South America, a continent that promised both intellectual discovery and physical challenge. His ascent of Mount Chimborazo in present-day Ecuador became legendary. Although he did not reach the summit, Humboldt climbed higher than any European had previously attempted, establishing a new altitude record and demonstrating extraordinary endurance in an era when high-altitude physiology was scarcely understood.</p>"
            "<p>Humboldt's reputation was further secured through his prolific writings. Works such as <i>Views of Nature</i> and his monumental <i>Cosmos</i> combined meticulous scientific data with a narrative style that was accessible and inspiring to a broad readership. Unlike many of his contemporaries, who presented facts in dry catalogues, Humboldt wove empirical evidence into prose that conveyed both accuracy and aesthetic wonder.</p>"
            "<p>Perhaps the most distinctive element of his scientific vision was his insistence on the interconnectedness of nature. Where others dissected nature into isolated parts, Humboldt described it as an integrated whole in which climate, vegetation, geography, and human activity were deeply entwined. This interdisciplinary outlook enabled him to cross the boundaries of geography, biology, and philosophy, creating a holistic framework that anticipated later ecological thinking.</p>"
            "<p>His ideas resonated far beyond his homeland. Humboldt exchanged letters with leading figures in Europe and America, including President Thomas Jefferson. Among those deeply influenced by his writings was Charles Darwin, who openly acknowledged that Humboldt's works inspired his own voyage on the Beagle. Rather than rejecting Humboldt's views, Darwin praised him as a model of scientific exploration and intellectual ambition.</p>"
            "<p>Despite his fame, financial security eluded Humboldt. The fortune he inherited funded his early travels, but the enormous cost of expeditions and lavish publications gradually exhausted his wealth. In later years, Humboldt depended heavily on financial assistance from the Prussian monarchy in order to continue his scientific work. Nevertheless, his influence extended far beyond Europe, reaching intellectuals and researchers across North and South America.</p>"
            "<p>Today, many historians and scientists regard Humboldt as one of the founders of modern environmental thinking because of his emphasis on the interconnectedness of nature.</p>"
        )
        r_sec4 = ExamSection.objects.create(
            test_set=test_set,
            skill="reading",
            part_number=4,
            title="Part 4 — ALEXANDER VON HUMBOLDT",
            instruction="Read the text for questions 21–29. For questions 21-24 choose A, B, C or D. For 25-29 write TRUE, FALSE, or NOT GIVEN.",
            passage=r_sec4_passage,
            duration_minutes=14,
            order=10,
        )
        # MCQ 21-24
        r_part4_mcq = [
            (21, "Why did Humboldt decide to leave his job as a mining inspector?", [("A", "He wanted to earn more money."), ("B", "He hoped to travel with Charles Darwin."), ("C", "He was eager to study nature in unexplored areas."), ("D", "He was forced to resign by the government.")], "C"),
            (22, "What was notable about his climb on Mount Chimborazo?", [("A", "He was the first person to reach the summit."), ("B", "He achieved the highest altitude recorded at that time."), ("C", "He discovered new plants on the mountain."), ("D", "He climbed it without any local guides.")], "B"),
            (23, "What made his books distinctive?", [("A", "They were the longest scientific works of the century."), ("B", "They combined accurate science with engaging language."), ("C", "They only discussed plants and animals."), ("D", "They were written in both English and German.")], "B"),
            (24, "What was unusual about Humboldt's scientific approach?", [("A", "He avoided philosophy and focused only on data."), ("B", "He emphasized the interconnection of natural systems."), ("C", "He believed humans were separate from nature."), ("D", "He studied only geography and ignored biology.")], "B"),
        ]
        for num, body_txt, choices, ans_lbl in r_part4_mcq:
            q = Question.objects.create(
                subject=subject,
                section=r_sec4,
                exam_number=num,
                body=f"<b>Question {num}.</b> {body_txt}",
                question_type="single_choice",
                category="cefr",
                difficulty="medium",
                points=1,
            )
            for lbl, text in choices:
                AnswerOption.objects.create(question=q, text=f"{lbl}) {text}", is_correct=(lbl == ans_lbl))
            all_questions.append(q)

        # TFNG 25-29
        r_part4_tfng = [
            (25, "Humboldt believed forests influence climate.", ["NOT GIVEN", "Not Given", "not given"]),
            (26, "Charles Darwin criticized Humboldt's scientific views.", ["FALSE", "False", "false"]),
            (27, "Humboldt always had enough money to support his studies.", ["FALSE", "False", "false"]),
            (28, "Humboldt's scientific influence was limited only to Europe.", ["FALSE", "False", "false"]),
            (29, "Humboldt's approach is still valuable in modern science.", ["TRUE", "True", "true"]),
        ]
        for num, body_txt, answers in r_part4_tfng:
            q = Question.objects.create(
                subject=subject,
                section=r_sec4,
                exam_number=num,
                body=f"<b>Question {num}.</b> {body_txt}",
                question_type="tfng",
                category="cefr",
                difficulty="medium",
                points=1,
                tfng_style="tf",
            )
            for pos, ans in enumerate(answers):
                AcceptedAnswer.objects.create(question=q, text=ans, order=pos)
            all_questions.append(q)

        # --- Reading Part 5 (Questions 30-35: Urban Transport) ---
        r_sec5_passage = (
            "<p>In many large cities around the world, traffic has become a serious issue affecting both daily life and the environment. One of the most common problems is traffic congestion, which leads to longer travel times, increased stress, and higher levels of air pollution. As populations grow and more people rely on private vehicles, roads become overcrowded, especially during peak hours. Governments and city planners are therefore under pressure to find effective ways to reduce these problems while still supporting economic activity.</p>"
            "<p>A key factor in addressing traffic issues is improving the flow of vehicles. Efficient traffic systems can reduce delays and make transportation more reliable. This can be achieved through better road design, smart traffic lights, and the promotion of alternative forms of transport such as cycling or public transit. In some cities, authorities have introduced dedicated bus lanes or restricted certain areas to pedestrians only. These strategies not only help to manage traffic more effectively but also encourage people to choose more sustainable travel options.</p>"
            "<p>In recent years, there has also been a growing focus on ecologically friendly solutions. For example, electric vehicles are becoming more popular as they produce fewer emissions compared to traditional cars. Cities are also investing in green infrastructure, such as bike-sharing systems and improved public transport networks. Some governments have even launched pilot programs to test innovative ideas. One notable experiment involved limiting the number of cars allowed in the city center on certain days, which resulted in a noticeable decrease in pollution levels and traffic volume.</p>"
            "<p>Despite these efforts, challenges remain. Not all solutions are equally effective in every city, as local conditions vary greatly. Factors such as population density, economic resources, and public attitudes play a significant role in determining the success of transport policies. However, it is clear that a combination of strategies, including technological innovation and behavioral change, is necessary to create more sustainable urban environments.</p>"
        )
        r_sec5 = ExamSection.objects.create(
            test_set=test_set,
            skill="reading",
            part_number=5,
            title="Part 5 — URBAN TRANSPORT AND SUSTAINABLE SOLUTIONS",
            instruction="Read the text for questions 30–35. Complete sentences 30-33 using ONE WORD ONLY from the text. For 34-35 choose A, B, C or D.",
            passage=r_sec5_passage,
            duration_minutes=12,
            order=11,
        )
        # Gap fill 30-33
        r_part5_gap = [
            (30, "One of the most serious problems in modern cities is traffic [.....]", ["congestion", "Congestion"]),
            (31, "Improving the [.....] of vehicles can help reduce delays.", ["flow", "Flow"]),
            (32, "Many cities are now focusing on more [.....]-friendly transport solutions.", ["ecologically", "Ecologically"]),
            (33, "A government [.....] tested limiting cars in the city center.", ["experiment", "Experiment", "program", "pilot program"]),
        ]
        for num, body_txt, answers in r_part5_gap:
            q = Question.objects.create(
                subject=subject,
                section=r_sec5,
                exam_number=num,
                body=f"<b>Question {num}.</b> {body_txt}",
                question_type="gap_fill",
                category="cefr",
                difficulty="medium",
                points=1,
                max_words=1,
            )
            for pos, ans in enumerate(answers):
                AcceptedAnswer.objects.create(question=q, text=ans, order=pos)
            all_questions.append(q)

        # MCQ 34-35
        r_part5_mcq = [
            (34, "What is one way that cities can improve traffic systems?", [("A", "Building more private roads"), ("B", "Introducing dedicated lanes"), ("C", "Increasing fuel prices"), ("D", "Reducing public transport")], "B"),
            (35, "Why do some solutions not work equally well in all cities?", [("A", "People prefer walking."), ("B", "Weather conditions differ."), ("C", "Local factors vary."), ("D", "Technology is expensive.")], "C"),
        ]
        for num, body_txt, choices, ans_lbl in r_part5_mcq:
            q = Question.objects.create(
                subject=subject,
                section=r_sec5,
                exam_number=num,
                body=f"<b>Question {num}.</b> {body_txt}",
                question_type="single_choice",
                category="cefr",
                difficulty="medium",
                points=1,
            )
            for lbl, text in choices:
                AnswerOption.objects.create(question=q, text=f"{lbl}) {text}", is_correct=(lbl == ans_lbl))
            all_questions.append(q)

        # =========================================================================
        # 3. WRITING BO'LIMI (Task 1.1, Task 1.2, Task 2)
        # =========================================================================

        writing_context = (
            "<div style='background:rgba(168,85,247,0.06); border:1px solid rgba(168,85,247,0.25); border-radius:8px; padding:12px 16px; margin-bottom:14px; font-size:13.5px; line-height:1.6;'>"
            "<h4 style='margin:0 0 6px 0; color:#7e22ce;'>Cinema Club Situation:</h4>"
            "<p>You received a message from your cinema club manager.</p>"
            "<p><i>The cinema club management is considering moving weekly movie time from Friday evenings to Tuesday mornings to reduce the theater rental costs. They are also planning to stop showing international movies with subtitles and instead focus only on high-budget Hollywood films.</i></p>"
            "</div>"
        )

        # Writing Task 1.1 — Informal Letter
        w_sec1 = ExamSection.objects.create(
            test_set=test_set,
            skill="writing",
            part_number=1,
            title="Writing Task 1.1 — Informal Letter to a Friend",
            instruction="Write a short letter to your friend. Write 50-80 words. You have about 15 minutes for this part.",
            duration_minutes=15,
            order=12,
        )
        w_q1 = Question.objects.create(
            subject=subject,
            section=w_sec1,
            exam_number=1,
            body=(
                f"{writing_context}"
                "<p><b>Writing Task 1.1:</b></p>"
                "<p>Write a short letter to your friend who also attends this cinema club with you. "
                "Explain the situation about the possible changes and tell them how you feel about it.</p>"
                "<p><i>Write about 50–80 words.</i></p>"
            ),
            question_type="writing_task",
            category="cefr",
            difficulty="medium",
            points=5,
            min_words=50,
            max_words=90,
            reference_answer=(
                "Hi Alex,\n\n"
                "Have you heard the news from our cinema club manager? They want to move our screenings to Tuesday mornings "
                "and only show big Hollywood films instead of international ones with subtitles! "
                "I'm really upset because I work on Tuesday mornings and can't make it. Plus, I love foreign cinema. "
                "What do you think about this?\n\nBest,\nSam"
            ),
        )
        all_questions.append(w_q1)

        # Writing Task 1.2 — Formal Letter to Manager
        w_sec2 = ExamSection.objects.create(
            test_set=test_set,
            skill="writing",
            part_number=2,
            title="Writing Task 1.2 — Formal Letter to the Manager",
            instruction="Write a letter to the cinema club manager. Write 120-150 words. You have about 25 minutes for this part.",
            duration_minutes=25,
            order=13,
        )
        w_q2 = Question.objects.create(
            subject=subject,
            section=w_sec2,
            exam_number=2,
            body=(
                f"{writing_context}"
                "<p><b>Writing Task 1.2:</b></p>"
                "<p>Write a letter to the cinema club manager:</p>"
                "<ul>"
                "<li>give your opinion about moving the movie time to Tuesday mornings</li>"
                "<li>explain what you think about focusing only on Hollywood movies</li>"
                "<li>suggest what the club should do instead.</li>"
                "</ul>"
                "<p><i>Write about 120–150 words in an appropriate formal or semi-formal style.</i></p>"
            ),
            question_type="writing_task",
            category="cefr",
            difficulty="hard",
            points=10,
            min_words=120,
            max_words=180,
            reference_answer=(
                "Dear Cinema Club Manager,\n\n"
                "I am writing to express my concerns regarding the proposed changes to our weekly movie schedule and film selection.\n\n"
                "Firstly, rescheduling our screenings from Friday evenings to Tuesday mornings would make attendance virtually impossible for members who work or study during standard business hours. The Friday evening slot is ideal as it allows us to unwind after a demanding week.\n\n"
                "Secondly, focusing solely on Hollywood blockbusters would diminish the distinctive character of our club. Many of us joined specifically to explore independent, subtitled international films that are seldom screened in mainstream cinemas.\n\n"
                "Instead of these drastic measures, I suggest organizing student or group discounts, seeking local sponsorships, or introducing a modest increase in monthly membership fees to offset rental costs.\n\n"
                "Thank you for considering member feedback.\n\nYours sincerely,\n[Your Name]"
            ),
        )
        all_questions.append(w_q2)

        # Writing Task 2 — Essay
        w_sec3 = ExamSection.objects.create(
            test_set=test_set,
            skill="writing",
            part_number=3,
            title="Writing Task 2 — Opinion Essay",
            instruction="Write an essay giving reasons and examples. Write 180-250 words. You have about 40 minutes for this part.",
            duration_minutes=40,
            order=14,
        )
        w_q3 = Question.objects.create(
            subject=subject,
            section=w_sec3,
            exam_number=3,
            body=(
                "<p><b>Writing Task 2:</b></p>"
                "<p><b>Do you think schools should provide lunch for students, or should students bring their own food from home?</b></p>"
                "<p>Post your response by giving reasons and examples to support your view.</p>"
                "<p><i>Write at least 180 words (recommended: 180–250 words).</i></p>"
            ),
            question_type="writing_task",
            category="cefr",
            difficulty="hard",
            points=15,
            min_words=180,
            max_words=300,
            reference_answer=(
                "Nutritious meals are indispensable for children's cognitive development and academic performance. "
                "While some argue that students ought to bring packed lunches from home, I firmly believe that schools should provide balanced lunches for all pupils.\n\n"
                "To begin with, institutional school meals ensure equality and nutritional standards. In many households, parents lack either the time or the financial resources to prepare healthy, balanced meals every morning, often resorting to processed snacks. When schools employ certified nutritionists to serve fresh vegetables, proteins, and fruits, every child receives essential vitamins regardless of socioeconomic background. For instance, countries like Finland and Japan provide universal school meals, resulting in superior student well-being and reduced obesity rates.\n\n"
                "Furthermore, communal school lunches foster social harmony and alleviate morning stress for working families. Dining together at common tables teaches children etiquette, culinary diversity, and mutual respect, eliminating stigma between affluent and disadvantaged students.\n\n"
                "In conclusion, although packed lunches offer personal convenience, school-provided lunches promote health, academic focus, and social equity. Governments should prioritize funding high-quality school meal programs."
            ),
        )
        all_questions.append(w_q3)

        # Testga savollarni bog'lash
        test_set.questions.set(all_questions)
        test_set.question_order = [q.id for q in all_questions]
        test_set.save(update_fields=['question_order'])

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 CEFR Multi-Level Complete Mock (Listening + Reading + Writing) bazaga muvaffaqiyatli yuklandi!\n"
                f"Sarlavha: '{test_set.title}' (ID: {test_set.id})\n"
                f"Fan: {subject.name} (slug: {subject.slug})\n"
                f"Boshlanish vaqti: {test_set.scheduled_at.strftime('%Y-%m-%d %H:%M')} (Toshkent vaqti)\n"
                f"Davomiyligi: {test_set.duration_minutes} daqiqa (2.5 soat)\n"
                f"Bo'limlar (Sections): {test_set.sections.count()} ta part\n"
                f"  • Listening: 6 parts (35 questions)\n"
                f"  • Reading: 5 parts (35 questions)\n"
                f"  • Writing: 3 parts (Task 1.1, Task 1.2, Task 2)\n"
                f"Jami savollar: {test_set.questions.count()} ta\n"
                f"Imtihon rejimi: CEFR (bitta ekranda barcha partlar va ko'nikmalar)\n"
                f"Kutish zali havolasi: /tests/mock/{test_set.id}\n"
            )
        )
