"""CEFR moduli: natijalar sahifasi, vaqt chegarasi, audio hisobi va o'qituvchi paneli.

Bu yerdagi testlar `test_cefr_exam.py` qamramaydigan qismlarni tekshiradi — imtihon
tugagandan KEYINGI oqim va uni tuzadigan panel.
"""
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from analytics.services import compute_cefr_skills
from tests_app.models import (
    AcceptedAnswer, AIFeedback, AnswerOption, AttemptAnswer, ExamSection, GroupOption,
    Question, QuestionGroup,
)

from .factories import make_attempt, make_subject, make_test_set, make_user


def _auth(client, user):
    access = str(RefreshToken.for_user(user).access_token)
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {access}'
    return client


class FeedbackAnswerTextTests(TestCase):
    """Natijalar sahifasi HAR BIR savol turi uchun javob matnini ko'rsatishi kerak.

    Ilgari u faqat variantli savollarni bilardi, shuning uchun CEFR testining bo'shliqli,
    TRUE/FALSE va moslashtirish savollari "javobsiz" bo'lib ko'rinardi."""

    def setUp(self):
        self.user, self.profile = make_user()
        self.subject = make_subject()
        self.test_set = make_test_set(subject=self.subject)
        self.section = ExamSection.objects.create(
            test_set=self.test_set, skill='reading', part_number=1, title='INJURED BIRD')

        self.gap = Question.objects.create(
            body='1.', question_type='gap_fill', category='cefr', subject=self.subject,
            section=self.section, exam_number=1, max_words=1)
        AcceptedAnswer.objects.create(question=self.gap, text='forest')
        AcceptedAnswer.objects.create(question=self.gap, text='the forest')

        self.tfng = Question.objects.create(
            body='Humboldt believed forests influence climate.', question_type='tfng',
            category='cefr', subject=self.subject, section=self.section, exam_number=2)
        AcceptedAnswer.objects.create(question=self.tfng, text='NOT GIVEN')

        self.group = QuestionGroup.objects.create(test_set=self.test_set, instruction='A-C')
        option_a = GroupOption.objects.create(group=self.group, label='A', text='World news')
        GroupOption.objects.create(group=self.group, label='B', text='Cooking')
        self.grouped = Question.objects.create(
            body='Think', question_type='grouped_item', category='cefr', subject=self.subject,
            section=self.section, exam_number=3, group=self.group, correct_group_option=option_a)

        self.test_set.questions.set([self.gap, self.tfng, self.grouped])
        self.attempt = make_attempt(self.profile, self.test_set,
                                    [self.gap, self.tfng, self.grouped])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _finish_and_read(self):
        self.attempt.is_completed = True
        self.attempt.completed_at = timezone.now()
        self.attempt.save()
        # Natijalar sahifasi AI xulosasi tayyor bo'lgandagina ochiladi; bu test uni
        # tekshirmaydi, shuning uchun bo'sh xulosa yozib qo'yiladi.
        AIFeedback.objects.create(
            attempt=self.attempt, overall_analysis='—', weak_topics='', strong_topics='',
            recommendations='', roadmap=[])
        response = self.client.get(f'/api/tests/attempts/{self.attempt.id}/feedback/')
        self.assertEqual(response.status_code, 200)
        return {item['question_id']: item for item in response.json()['review_items']}

    def test_gap_fill_answers_are_described(self):
        answer = AttemptAnswer.objects.get(attempt=self.attempt, question=self.gap)
        answer.text_answer = 'Forest'
        answer.save()

        item = self._finish_and_read()[self.gap.id]
        self.assertEqual(item['your_answer'], 'Forest')
        self.assertEqual(item['correct_answer'], 'forest / the forest')
        self.assertEqual(item['exam_number'], 1)

    def test_tfng_answer_is_described(self):
        answer = AttemptAnswer.objects.get(attempt=self.attempt, question=self.tfng)
        answer.text_answer = 'TRUE'
        answer.save()

        item = self._finish_and_read()[self.tfng.id]
        self.assertEqual(item['your_answer'], 'TRUE')
        self.assertEqual(item['correct_answer'], 'NOT GIVEN')

    def test_grouped_answer_shows_label_and_text(self):
        answer = AttemptAnswer.objects.get(attempt=self.attempt, question=self.grouped)
        answer.grouped_option = self.group.options.get(label='B')
        answer.save()

        item = self._finish_and_read()[self.grouped.id]
        self.assertEqual(item['your_answer'], 'B) Cooking')
        self.assertEqual(item['correct_answer'], 'A) World news')

    def test_part_label_travels_with_each_question(self):
        item = self._finish_and_read()[self.gap.id]
        self.assertEqual(item['section']['part_number'], 1)
        self.assertEqual(item['section']['title'], 'INJURED BIRD')


class TimeLimitTests(TestCase):
    """Vaqt tugagach javob qabul qilinmaydi — chegara serverda."""

    def setUp(self):
        self.user, self.profile = make_user()
        self.subject = make_subject()
        self.test_set = make_test_set(subject=self.subject)  # duration_minutes = 10
        self.section = ExamSection.objects.create(
            test_set=self.test_set, skill='reading', part_number=1)
        self.question = Question.objects.create(
            body='1.', question_type='gap_fill', category='cefr', subject=self.subject,
            section=self.section, exam_number=1)
        AcceptedAnswer.objects.create(question=self.question, text='forest')
        self.test_set.questions.set([self.question])
        self.attempt = make_attempt(self.profile, self.test_set, [self.question])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _age_the_attempt(self, minutes):
        self.attempt.started_at = timezone.now() - timedelta(minutes=minutes)
        self.attempt.save(update_fields=['started_at'])

    def test_answer_is_accepted_while_time_remains(self):
        response = self.client.post(f'/api/tests/attempts/{self.attempt.id}/exam/answer/', {
            'question_id': self.question.id, 'text_answer': 'forest',
        }, format='json')
        self.assertEqual(response.status_code, 200)

    def test_answer_is_refused_after_the_deadline(self):
        self._age_the_attempt(20)
        response = self.client.post(f'/api/tests/attempts/{self.attempt.id}/exam/answer/', {
            'question_id': self.question.id, 'text_answer': 'forest',
        }, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertTrue(response.json()['time_up'])
        self.assertEqual(AttemptAnswer.objects.get(attempt=self.attempt).text_answer, '')

    def test_classic_flow_is_guarded_too(self):
        self._age_the_attempt(20)
        response = self.client.post(f'/api/tests/attempts/{self.attempt.id}/answer/', {
            'question_id': self.question.id, 'q_idx': 1, 'text_answer': 'forest',
        }, format='json')
        self.assertEqual(response.status_code, 409)

    def test_seconds_left_reaches_zero(self):
        self._age_the_attempt(20)
        data = self.client.get(f'/api/tests/attempts/{self.attempt.id}/exam/').json()
        self.assertEqual(data['seconds_left'], 0)


class AudioPlayLimitTests(TestCase):
    """Audioni necha marta eshitish mumkinligi serverda sanaladi — sahifani yangilash
    bilan cheklovni aylanib o'tib bo'lmaydi."""

    def setUp(self):
        self.user, self.profile = make_user()
        self.subject = make_subject()
        self.test_set = make_test_set(subject=self.subject)
        self.section = ExamSection.objects.create(
            test_set=self.test_set, skill='listening', part_number=1,
            audio_url='https://cdn.example.com/p1.mp3', audio_play_limit=2)
        self.question = Question.objects.create(
            body='9.', question_type='gap_fill', category='cefr', subject=self.subject,
            section=self.section, exam_number=9)
        AcceptedAnswer.objects.create(question=self.question, text='July')
        self.test_set.questions.set([self.question])
        self.attempt = make_attempt(self.profile, self.test_set, [self.question])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _play(self):
        return self.client.post(f'/api/tests/attempts/{self.attempt.id}/exam/audio-play/',
                                {'section_id': self.section.id}, format='json')

    def test_limit_is_enforced_across_requests(self):
        self.assertEqual(self._play().json()['left'], 1)
        self.assertEqual(self._play().json()['left'], 0)

        third = self._play()
        self.assertEqual(third.status_code, 409)
        self.assertFalse(third.json()['allowed'])

    def test_count_survives_a_page_reload(self):
        self._play()
        data = self.client.get(f'/api/tests/attempts/{self.attempt.id}/exam/').json()
        self.assertEqual(data['audio_plays'][str(self.section.id)], 1)

    def test_zero_limit_means_unlimited(self):
        self.section.audio_play_limit = 0
        self.section.save(update_fields=['audio_play_limit'])
        for _ in range(5):
            self.assertTrue(self._play().json()['allowed'])

    def test_another_students_attempt_is_not_playable(self):
        other, _ = make_user(username='intruder')
        self.client.force_authenticate(user=other)
        self.assertEqual(self._play().status_code, 404)


class CefrAnalyticsTests(TestCase):
    """Ko'nikmalar kesimi: Listening / Reading / Writing."""

    def setUp(self):
        self.user, self.profile = make_user()
        self.subject = make_subject()
        self.test_set = make_test_set(subject=self.subject)
        self.reading = ExamSection.objects.create(
            test_set=self.test_set, skill='reading', part_number=1)
        self.listening = ExamSection.objects.create(
            test_set=self.test_set, skill='listening', part_number=1)

        self.questions = []
        for section, count in ((self.reading, 2), (self.listening, 2)):
            for i in range(count):
                question = Question.objects.create(
                    body=f'{section.skill}-{i}', question_type='gap_fill', category='cefr',
                    subject=self.subject, section=section, exam_number=i + 1)
                AcceptedAnswer.objects.create(question=question, text='x')
                self.questions.append(question)
        self.test_set.questions.set(self.questions)

    def test_mastery_is_split_by_skill(self):
        attempt = make_attempt(self.profile, self.test_set, self.questions)
        attempt.is_completed = True
        attempt.completed_at = timezone.now()
        attempt.save()
        # O'qishda ikkalasi to'g'ri, tinglashda bittasi.
        for answer in attempt.answers.select_related('question__section'):
            answer.is_correct = (answer.question.section.skill == 'reading'
                                 or answer.question.exam_number == 1)
            answer.save(update_fields=['is_correct'])

        data = compute_cefr_skills(self.profile)
        by_skill = {row['skill']: row['mastery'] for row in data['skills']}
        self.assertEqual(by_skill['reading'], 100)
        self.assertEqual(by_skill['listening'], 50)
        self.assertTrue(data['has_data'])

    def test_no_cefr_attempts_means_no_block(self):
        other, other_profile = make_user(username='newcomer')
        self.assertFalse(compute_cefr_skills(other_profile)['has_data'])


class TeacherSectionApiTests(TestCase):
    """O'qituvchi CEFR partini panel orqali yarata olishi kerak — ilgari buni faqat
    Django admin qila olardi."""

    def setUp(self):
        self.user = User.objects.create_user(username='teacher_cefr', password='pw-1234-teacher')
        self.user.profile.role = 'teacher'
        self.user.profile.save()
        self.subject = make_subject()
        _auth(self.client, self.user)

        create = self.client.post('/api/teacher/tests/create/', {
            'title': 'CEFR sinov', 'subject': self.subject.id, 'category': 'cefr',
            'duration_minutes': 60, 'description': '',
        }, content_type='application/json')
        self.assertEqual(create.status_code, 200)
        self.test_id = create.json()['id']

    def _create_section(self, **overrides):
        payload = {
            'skill': 'reading', 'part_number': 1, 'title': 'INJURED BIRD',
            'instruction': 'Fill in each gap with ONE word.',
            'passage': '<p>A narrow path in the {{1}}.</p>', 'audio_play_limit': 2,
        }
        payload.update(overrides)
        return self.client.post(f'/api/teacher/tests/{self.test_id}/sections/', payload,
                                content_type='application/json')

    def test_section_round_trips(self):
        created = self._create_section()
        self.assertEqual(created.status_code, 201)
        section_id = created.json()['id']

        listed = self.client.get(f'/api/teacher/tests/{self.test_id}/sections/').json()
        self.assertEqual(len(listed['sections']), 1)
        self.assertIn('{{1}}', listed['sections'][0]['passage'])
        self.assertEqual(listed['sections'][0]['skill_label'], 'Reading')

        updated = self.client.put(
            f'/api/teacher/tests/{self.test_id}/sections/{section_id}/',
            {'skill': 'reading', 'part_number': 1, 'title': 'YANGI NOM',
             'instruction': '', 'passage': '', 'audio_play_limit': 1},
            content_type='application/json')
        self.assertEqual(updated.json()['title'], 'YANGI NOM')

        deleted = self.client.delete(f'/api/teacher/tests/{self.test_id}/sections/{section_id}/')
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(ExamSection.objects.filter(test_set_id=self.test_id).count(), 0)

    def test_duplicate_part_number_is_rejected(self):
        self._create_section()
        self.assertEqual(self._create_section().status_code, 400)

    def test_gap_fill_question_is_created_with_its_answers(self):
        section_id = self._create_section().json()['id']
        response = self.client.post(f'/api/teacher/tests/{self.test_id}/questions/add/', {
            'question_type': 'gap_fill', 'body': '1.', 'difficulty': 'medium', 'points': 1,
            'explanation': '', 'image_position': 'after_body',
            'section': section_id, 'exam_number': 1, 'max_words': 1,
            'type_data': {'accepted_answers': ['forest', 'the forest']},
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        question = Question.objects.get(id=response.json()['id'])
        self.assertEqual(question.section_id, section_id)
        self.assertEqual(question.exam_number, 1)
        self.assertEqual([a.text for a in question.accepted_answers.all()],
                         ['forest', 'the forest'])

    def test_shared_answer_bank_can_be_reused(self):
        """CEFR'da bitta A-F banki bir nechta savolga xizmat qiladi (15-20 sarlavhalar)."""
        section_id = self._create_section().json()['id']
        first = self.client.post(f'/api/teacher/tests/{self.test_id}/questions/add/', {
            'question_type': 'grouped_item', 'body': '15.', 'difficulty': 'medium', 'points': 1,
            'explanation': '', 'image_position': 'after_body', 'section': section_id,
            'type_data': {'group': {
                'instruction': 'Sarlavhani tanlang',
                'options': [{'label': 'A', 'text': 'Birinchi'}, {'label': 'B', 'text': 'Ikkinchi'}],
                'correct_index': 0,
            }},
        }, content_type='application/json')
        self.assertEqual(first.status_code, 200)
        bank = QuestionGroup.objects.get(test_set_id=self.test_id)

        second = self.client.post(f'/api/teacher/tests/{self.test_id}/questions/add/', {
            'question_type': 'grouped_item', 'body': '16.', 'difficulty': 'medium', 'points': 1,
            'explanation': '', 'image_position': 'after_body', 'section': section_id,
            'type_data': {'group': {'group_id': bank.id, 'correct_label': 'B'}},
        }, content_type='application/json')
        self.assertEqual(second.status_code, 200)

        self.assertEqual(QuestionGroup.objects.filter(test_set_id=self.test_id).count(), 1)
        question = Question.objects.get(id=second.json()['id'])
        self.assertEqual(question.group_id, bank.id)
        self.assertEqual(question.correct_group_option.label, 'B')

    def test_a_foreign_section_cannot_be_attached(self):
        """Boshqa o'qituvchining partiga savol ulab bo'lmaydi."""
        other = User.objects.create_user(username='teacher_other', password='pw-1234-teacher')
        other.profile.role = 'teacher'
        other.profile.save()
        other_test = make_test_set(subject=self.subject, title='Begona test')
        other_test.created_by = other
        other_test.save(update_fields=['created_by'])
        foreign_section = ExamSection.objects.create(
            test_set=other_test, skill='reading', part_number=1)

        response = self.client.post(f'/api/teacher/tests/{self.test_id}/questions/add/', {
            'question_type': 'gap_fill', 'body': '1.', 'difficulty': 'medium', 'points': 1,
            'explanation': '', 'image_position': 'after_body',
            'section': foreign_section.id, 'type_data': {'accepted_answers': ['x']},
        }, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('section', response.json()['errors'])
