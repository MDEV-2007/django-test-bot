from django.db import models
from django_ckeditor_5.fields import CKEditor5Field
from accounts.models import Profile
from learning.models import Topic


class Subject(models.Model):
    """A school subject (Tarix, Matematika...). The platform is history-only today, but
    every TestSet now hangs off a Subject rather than being hard-coded to one, so adding a
    second subject later is just a new row here, not a schema change."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)

    icon_name = models.CharField(max_length=50, default='book', help_text="Lucide ikonka nomi (masalan: book, calculator, flask-conical).")
    color = models.CharField(max_length=20, default='#2d6cff', help_text="Fan uchun asosiy rang (hex).")
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class SubjectScore(models.Model):
    """Per-subject XP for a profile, so the leaderboard can rank students within a subject
    (a historian and a mathematician shouldn't share one ranking). The global Profile.xp
    stays the overall progression; this is the subject-scoped slice, accumulated whenever a
    test belonging to that subject is completed."""
    profile = models.ForeignKey('accounts.Profile', on_delete=models.CASCADE, related_name='subject_scores')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='scores')
    xp = models.IntegerField(default=0)

    class Meta:
        unique_together = ('profile', 'subject')
        ordering = ['-xp']
        # Speeds up the per-subject leaderboard ORDER BY at scale.
        indexes = [models.Index(fields=['subject', '-xp'], name='subjscore_subj_xp_idx')]

    def __str__(self):
        return f"{self.profile.user.username} — {self.subject.name}: {self.xp} XP"


class Question(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Oson'),
        ('medium', 'O\'rta'),
        ('hard', 'Qiyin'),
    ]
    CATEGORY_CHOICES = [
        ('history', 'Tarix'),
        ('certificate', 'Milliy Sertifikat'),
        ('bba', 'BBA Imtihoni'),
    ]
    QUESTION_TYPE_CHOICES = [
        ('single_choice', 'Oddiy test (bitta to\'g\'ri javob)'),
        ('image_based', 'Rasmli savol (xarita/diagramma + variantlar)'),
        ('table_based', 'Jadvalli savol (variantlar bilan)'),
        ('matching', 'Moslashtirish (I/II/III... ni a/b/c... bilan bog\'lash)'),
        ('grouped_item', 'Guruhlangan savol (umumiy A-F javob bankidan)'),
        ('open_written', 'Yozma (ochiq) savol — AI baholaydi'),
    ]
    IMAGE_POSITION_CHOICES = [
        ('after_body', 'Savol matnidan keyin'),
        ('before_body', 'Savol matnidan oldin'),
    ]
    # image_based/table_based render and behave exactly like single_choice (same
    # AnswerOption-based grading) — they exist as distinct choices only so admins can tag
    # a question by what it visually contains, not because grading differs.
    SINGLE_ANSWER_TYPES = ('single_choice', 'image_based', 'table_based')

    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name='questions')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='questions',
                                help_text="Savol tegishli fan. Test to'plamiga qo'shilganda avtomatik to'ldiriladi.")
    body = CKEditor5Field(
        config_name='default',
        help_text="Savol matni — qalin/kursiv, ro'yxatlar va jadvallarni CKEditor orqali "
                   "to'g'ridan-to'g'ri qo'shish mumkin (masalan 'Asr / Voqea' jadvalli savollar uchun).",
    )
    image_url = models.URLField(max_length=500, null=True, blank=True)
    image = models.ImageField(upload_to='tests/%Y/%m/', null=True, blank=True, help_text="Xarita, Venn diagramma yoki sxema rasmi.")
    image_position = models.CharField(max_length=15, choices=IMAGE_POSITION_CHOICES, default='after_body')
    audio_url = models.URLField(max_length=500, null=True, blank=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='history')
    question_type = models.CharField(max_length=15, choices=QUESTION_TYPE_CHOICES, default='single_choice')
    points = models.PositiveIntegerField(default=1, help_text="Bu savol uchun ball og'irligi.")
    explanation = models.TextField(
        blank=True,
        help_text="Javob izohi — foydalanuvchiga natija sahifasida ko'rsatiladi (ixtiyoriy).",
    )
    reference_answer = models.TextField(
        blank=True,
        help_text="Ochiq savollar uchun namunaviy to'g'ri javob — Groq shu bilan solishtirib, "
                   "o'quvchining matnli javobini to'g'ri/xato deb baholaydi. Faqat shu savol "
                   "qism-savollarga (SubQuestion) bo'linmagan bo'lsa ishlatiladi.",
    )
    group = models.ForeignKey(
        'QuestionGroup', on_delete=models.CASCADE, null=True, blank=True, related_name='questions',
        help_text="Faqat 'grouped_item' turidagi savollar uchun — shu savol qaysi umumiy javob bankiga tegishli.",
    )
    correct_group_option = models.ForeignKey(
        'GroupOption', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
        help_text="Faqat 'grouped_item' turidagi savollar uchun — bankdagi to'g'ri variant.",
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"[{self.get_difficulty_display()}] {self.body[:50]}..."

    def clean(self):
        from django.core.exceptions import ValidationError
        # The teacher wizard builds a grouped question's QuestionGroup *after* this base
        # instance is first saved, so it sets this transient flag to defer the "grouped
        # needs a group" rule (it guarantees consistency itself). The admin's own form
        # doesn't set the flag, so admin validation stays strict.
        if getattr(self, '_skip_group_validation', False):
            return
        errors = {}
        if self.question_type == 'grouped_item' and not self.group_id:
            errors['group'] = "Guruhlangan savol uchun 'group' majburiy."
        if self.question_type != 'grouped_item' and self.group_id:
            errors['group'] = "Faqat 'grouped_item' turidagi savollarda guruh belgilanadi."
        if errors:
            raise ValidationError(errors)


class AnswerOption(models.Model):
    """A selectable answer for single_choice / image_based / table_based / matching /
    grouped_item... wait: grouped_item questions answer from GroupOption, not this model.
    Used by every OTHER type that presents lettered A/B/C/D choices."""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.question.body[:20]} -> {self.text} ({self.is_correct})"


class MatchingPair(models.Model):
    """One row of a 'matching' question: a left-column item (I, II, III...) linked to its
    correct right-column item (a, b, c...). A row with a blank left_key is a pure distractor —
    it only appears as a selectable right-column option and never has a correct match, modeling
    exam questions where the right column has more items than the left. This single model
    drives both the visual two-column layout AND the actual per-pair grading (interactive
    drag/select-style matching, not a precomputed-combination multiple choice)."""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='matching_pairs')
    left_key = models.CharField(
        max_length=10, blank=True,
        help_text="Chap ustun belgisi (I, II, III...). Bo'sh qoldirilsa, bu qator faqat "
                   "chalg'ituvchi (distractor) variant sifatida o'ng ustunda ko'rinadi.",
    )
    left_text = models.CharField(max_length=300, blank=True)
    right_key = models.CharField(max_length=10, help_text="O'ng ustun belgisi (a, b, c...)")
    right_text = models.CharField(max_length=500)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        unique_together = ('question', 'right_key')

    def __str__(self):
        return f"{self.left_key or '(distraktor)'} -> {self.right_key}) {self.right_text[:30]}"


class QuestionGroup(models.Model):
    """A shared answer bank (A, B, C...) referenced by several 'grouped_item' questions at
    once — e.g. exam items 33-35 that all pick from the same six lettered options."""
    test_set = models.ForeignKey('TestSet', on_delete=models.CASCADE, related_name='question_groups')
    instruction = models.TextField(
        help_text="Masalan: '33-35 savollarga mos javoblarni quyidagi A-F variantlaridan tanlang'",
    )
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.test_set.title} — javob banki #{self.id}"


class GroupOption(models.Model):
    group = models.ForeignKey(QuestionGroup, on_delete=models.CASCADE, related_name='options')
    label = models.CharField(max_length=5, help_text="A, B, C, D...")
    text = models.CharField(max_length=500)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        unique_together = ('group', 'label')

    def __str__(self):
        return f"{self.label}) {self.text[:40]}"


class SubQuestion(models.Model):
    """One lettered part (a, b...) of an 'open_written' question with multiple sub-answers,
    e.g. exam item 43: a shared context paragraph, then 'a) ... javob:' and 'b) ... javob:'.
    Optional: a plain single-part open_written question has zero SubQuestions and is graded
    directly off Question.reference_answer instead, exactly as before — this keeps every
    already-answered open question (and the real users' history on it) working unchanged."""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='sub_questions')
    label = models.CharField(max_length=5, help_text="a, b, c...")
    text = models.TextField()
    reference_answer = models.TextField(
        help_text="Groq shu namunaviy javob bilan solishtirib, o'quvchining matnli javobini baholaydi.",
    )
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        unique_together = ('question', 'label')

    def __str__(self):
        return f"{self.question_id} - {self.label}) {self.text[:40]}"


class TestSet(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='test_sets')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=Question.CATEGORY_CHOICES, default='history')
    duration_minutes = models.IntegerField(default=20)
    questions = models.ManyToManyField(Question, related_name='test_sets')
    question_order = models.JSONField(
        default=list, blank=True,
        help_text="Savollar tartibi (Question id'lari ro'yxati) — test ustaxonasidagi "
                   "drag-drop tartibi shu yerda saqlanadi. Bo'sh bo'lsa, id bo'yicha tartiblanadi.",
    )
    created_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='test_sets',
        help_text="Testni yaratgan o'qituvchi/admin. Teacher panelda faqat o'z testlari ko'rinadi.",
    )
    is_random = models.BooleanField(default=False, help_text="One-off test generated for a single random-quiz attempt; hidden from the browsable catalog.")
    is_premium = models.BooleanField(default=True, help_text="Mock test tizimi uchun bir martalik xarid qilganlargagina ochiq. Tasodifiy test har doim bepul.")
    is_published = models.BooleanField(
        default=False,
        help_text="Qoralama (draft) yoki nashr etilgan. Faqat nashr etilgan testlar o'quvchilar "
                   "katalogida ko'rinadi. Tasodifiy testlar bundan mustasno.",
    )
    is_archived = models.BooleanField(
        default=False,
        help_text="Test katalogida ko'rinmaydi, lekin o'chirilmaydi — foydalanuvchilarning bu "
                   "testga oid eski urinishlari (Attempt) va ballari to'liq saqlanib qoladi.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.questions.count()} savol)"

    def ordered_questions(self):
        """Questions in the teacher-defined drag-drop order (question_order), with any
        questions not yet in that list appended by id. Falls back to plain id order when
        no custom order is stored — so existing tests behave exactly as before."""
        qs = list(self.questions.all())
        order = self.question_order or []
        if not order:
            return qs
        rank = {qid: i for i, qid in enumerate(order)}
        return sorted(qs, key=lambda q: (rank.get(q.id, len(order) + q.id)))

    @property
    def status_label(self):
        if self.is_archived:
            return "Arxivlangan"
        return "Nashr etilgan" if self.is_published else "Qoralama"

    @property
    def has_attempts(self):
        """A test with real attempts must be archived rather than hard-deleted, to keep
        students' score history intact — the teacher/admin delete flows check this."""
        return self.attempts.exists()


class Attempt(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='attempts')
    test = models.ForeignKey(TestSet, on_delete=models.CASCADE, null=True, blank=True, related_name='attempts')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True) # Percentage e.g. 85.0
    correct_answers = models.IntegerField(default=0)
    wrong_answers = models.IntegerField(default=0)
    skipped_answers = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    def __str__(self):
        test_title = self.test.title if self.test else "Tasodifiy Test"
        return f"{self.profile.user.username} - {test_title} - {self.score or 0}%"

    @property
    def time_spent_display(self):
        if not self.completed_at:
            return "Kutilmoqda"
        diff = self.completed_at - self.started_at
        minutes = int(diff.total_seconds() // 60)
        seconds = int(diff.total_seconds() % 60)
        return f"{minutes}m {seconds}s"


class AttemptAnswer(models.Model):
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(AnswerOption, on_delete=models.CASCADE, null=True, blank=True)
    text_answer = models.TextField(blank=True, help_text="Bo'linmagan ochiq savol uchun o'quvchi kiritgan matnli javob.")
    open_answers = models.JSONField(
        default=dict, blank=True,
        help_text="Qism-savollarga (SubQuestion) bo'lingan ochiq savol uchun har bir band bo'yicha "
                   "javob, masalan {'a': 'Varfolomey kechasi', 'b': 'Katerina Medichi'}.",
    )
    matching_data = models.JSONField(
        default=dict, blank=True,
        help_text="Juftlashtirish savoli uchun tanlangan juftliklar, masalan {'I': 'd', 'II': 'a'}.",
    )
    grouped_option = models.ForeignKey(
        GroupOption, on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
        help_text="Guruhlangan (grouped_item) savol uchun tanlangan variant.",
    )
    is_correct = models.BooleanField(default=False)
    ai_grading_note = models.CharField(
        max_length=300, blank=True,
        help_text="Ochiq savol uchun AI bahosining qisqa izohi (nega to'g'ri/xato deb topilgani).",
    )
    open_grading = models.JSONField(
        default=dict, blank=True,
        help_text="Qism-savolli ochiq javob uchun har bir band bo'yicha AI bahosi, masalan "
                   "{'a': {'is_correct': true, 'note': '...'}, 'b': {...}}.",
    )

    class Meta:
        unique_together = ('attempt', 'question')

    def __str__(self):
        return f"Attempt {self.attempt.id} Q:{self.question.id} -> Correct: {self.is_correct}"

    @property
    def is_skipped(self):
        qtype = self.question.question_type
        if qtype == 'open_written':
            if self.question.sub_questions.exists():
                return not any((self.open_answers or {}).values())
            return not self.text_answer.strip()
        if qtype == 'matching':
            return not self.matching_data
        if qtype == 'grouped_item':
            return self.grouped_option_id is None
        return self.selected_choice_id is None

    def grade(self):
        """Sets is_correct for every type except 'open_written' (which is graded separately,
        in a single batched Groq call across the whole attempt — see
        tests_app.services.grading). Matching questions require every non-distractor pair
        to match; there's no partial credit, consistent with how every other question type
        here counts as a single correct/wrong unit toward the attempt's score."""
        qtype = self.question.question_type
        if qtype in Question.SINGLE_ANSWER_TYPES:
            self.is_correct = bool(self.selected_choice_id and self.selected_choice.is_correct)
        elif qtype == 'matching':
            expected = {p.left_key: p.right_key for p in self.question.matching_pairs.all() if p.left_key}
            submitted = self.matching_data or {}
            self.is_correct = bool(expected) and all(submitted.get(k) == v for k, v in expected.items())
        elif qtype == 'grouped_item':
            self.is_correct = bool(self.grouped_option_id) and self.grouped_option_id == self.question.correct_group_option_id
        return self.is_correct


class RevisionItem(models.Model):
    """A wrong-answered question parked in the student's spaced-repetition deck (Feature 7).
    Created/updated automatically when a test finishes; removed from the active deck once the
    student re-answers it correctly (`mastered=True`). One row per (profile, question)."""

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='revision_items')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='revision_items')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='revision_items')
    times_wrong = models.PositiveIntegerField(default=1)
    times_reviewed = models.PositiveIntegerField(default=0)
    mastered = models.BooleanField(default=False, db_index=True)
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('profile', 'question')
        ordering = ['mastered', '-times_wrong', 'updated_at']
        indexes = [models.Index(fields=['profile', 'mastered'])]

    def __str__(self):
        return f"{self.profile.user.username} — revise Q{self.question_id} (wrong x{self.times_wrong})"


class AIFeedback(models.Model):
    attempt = models.OneToOneField(Attempt, on_delete=models.CASCADE, related_name='ai_feedback')
    overall_analysis = models.TextField()
    weak_topics = models.TextField(help_text="Comma-separated or JSON list of weak areas")
    strong_topics = models.TextField(help_text="Comma-separated or JSON list of strong areas")
    recommendations = models.TextField(help_text="Custom step-by-step suggestions")
    predicted_score = models.CharField(max_length=50, blank=True, help_text="Predicted National Certificate or BBA level")
    roadmap = models.JSONField(default=list, help_text="List of tasks in chronological order")
    ai_motivation = models.TextField(blank=True)
    detailed_mistakes = models.JSONField(
        default=list,
        help_text="Per-question breakdown from the AI: topic, question, student's wrong/skipped "
                   "answer, the correct answer, why it matters, and a memory aid. Empty when the "
                   "rule-based fallback (no Groq) generated this feedback instead.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI Feedback for Attempt {self.attempt.id}"
