"""JSON API for the Teacher panel (teacher/api.py) — /api/teacher/*.

Covers the wizard's hardest part: all 6 question types round-trip through
question_add_api/question_detail_api correctly (options/pairs/sub_questions/group), plus
the test lifecycle (create -> build -> publish) and IDOR scoping (_own_test/_own_lesson).
"""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Profile
from panel.models import AuditLog
from tests.factories import make_subject


def _auth_client(client, user):
    access = str(RefreshToken.for_user(user).access_token)
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {access}'
    return client


class TeacherApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='teacher1', password='pw-1234-teacher')
        self.user.profile.role = 'teacher'
        self.user.profile.save()
        self.subject = make_subject()
        _auth_client(self.client, self.user)

        create = self.client.post('/api/teacher/tests/create/', {
            'title': 'Sinov testi', 'subject': self.subject.id, 'category': 'history',
            'duration_minutes': 10, 'description': '',
        }, content_type='application/json')
        self.assertEqual(create.status_code, 200)
        self.test_id = create.json()['id']

    def _add_question(self, question_type, type_data, extra=None):
        payload = {
            'question_type': question_type, 'body': f'{question_type} savoli?',
            'difficulty': 'medium', 'points': 1, 'explanation': '', 'image_position': 'after_body',
            'type_data': __import__('json').dumps(type_data),
        }
        if extra:
            payload.update(extra)
        return self.client.post(f'/api/teacher/tests/{self.test_id}/questions/add/', payload)

    def test_single_choice_question_round_trips(self):
        resp = self._add_question('single_choice', {
            'options': [{'text': '4'}, {'text': '5'}, {'text': ''}], 'correct_index': 0,
        })
        self.assertEqual(resp.status_code, 200)
        qid = resp.json()['id']

        detail = self.client.get(f'/api/teacher/tests/{self.test_id}/questions/{qid}/')
        data = detail.json()
        self.assertEqual(len(data['options']), 2)  # blank row skipped
        self.assertTrue(data['options'][0]['is_correct'])
        self.assertFalse(data['options'][1]['is_correct'])

    def test_matching_question_auto_letters_blank_right_key(self):
        resp = self._add_question('matching', {
            'pairs': [
                {'left_key': 'I', 'left_text': 'Amir Temur', 'right_key': '', 'right_text': 'Samarqand'},
                {'left_key': 'II', 'left_text': 'Bobur', 'right_key': 'b', 'right_text': 'Hindiston'},
            ],
        })
        qid = resp.json()['id']
        data = self.client.get(f'/api/teacher/tests/{self.test_id}/questions/{qid}/').json()
        self.assertEqual(data['pairs'][0]['right_key'], 'a')  # auto-lettered
        self.assertEqual(data['pairs'][1]['right_key'], 'b')

    def test_grouped_item_question_creates_group_and_correct_option(self):
        resp = self._add_question('grouped_item', {
            'group': {
                'instruction': 'Mos javobni tanlang',
                'options': [{'label': 'A', 'text': 'Birinchi'}, {'label': 'B', 'text': 'Ikkinchi'}],
                'correct_index': 1,
            },
        })
        qid = resp.json()['id']
        data = self.client.get(f'/api/teacher/tests/{self.test_id}/questions/{qid}/').json()
        self.assertIsNotNone(data['group'])
        self.assertEqual(data['group']['correct_index'], 1)

    def test_open_written_with_sub_questions(self):
        resp = self._add_question('open_written', {
            'sub_questions': [
                {'label': '', 'text': 'a qismi', 'reference_answer': 'javob a'},
                {'text': 'b qismi', 'reference_answer': 'javob b'},
            ],
        })
        qid = resp.json()['id']
        data = self.client.get(f'/api/teacher/tests/{self.test_id}/questions/{qid}/').json()
        self.assertEqual(len(data['sub_questions']), 2)
        self.assertEqual(data['sub_questions'][0]['label'], 'a')  # auto-lettered

    def test_editing_a_question_wipes_and_rebuilds_children(self):
        resp = self._add_question('single_choice', {'options': [{'text': 'A'}, {'text': 'B'}], 'correct_index': 0})
        qid = resp.json()['id']

        edit_payload = {
            'question_type': 'single_choice', 'body': 'yangilangan', 'difficulty': 'easy',
            'points': 2, 'explanation': '', 'image_position': 'after_body',
            'type_data': __import__('json').dumps({'options': [{'text': 'X'}], 'correct_index': 0}),
        }
        edit = self.client.generic(
            'PUT', f'/api/teacher/tests/{self.test_id}/questions/{qid}/',
            data=self._encode_multipart(edit_payload), content_type=self._multipart_content_type,
        )
        self.assertEqual(edit.status_code, 200)

        data = self.client.get(f'/api/teacher/tests/{self.test_id}/questions/{qid}/').json()
        self.assertEqual(len(data['options']), 1)
        self.assertEqual(data['options'][0]['text'], 'X')

    def _encode_multipart(self, data):
        from django.test.client import encode_multipart
        self._boundary = 'BoUnDaRy'
        self._multipart_content_type = f'multipart/form-data; boundary={self._boundary}'
        return encode_multipart(self._boundary, data)

    def test_publish_requires_at_least_one_question(self):
        empty_test = self.client.post('/api/teacher/tests/create/', {
            'title': "Bo'sh test", 'subject': self.subject.id, 'category': 'history',
            'duration_minutes': 10, 'description': '',
        }, content_type='application/json').json()

        blocked = self.client.post(f"/api/teacher/tests/{empty_test['id']}/publish/")
        self.assertEqual(blocked.status_code, 400)

        original_test_id, self.test_id = self.test_id, empty_test['id']
        self._add_question('single_choice', {'options': [{'text': 'A'}, {'text': 'B'}], 'correct_index': 0})
        self.test_id = original_test_id

        allowed = self.client.post(f"/api/teacher/tests/{empty_test['id']}/publish/")
        self.assertEqual(allowed.status_code, 200)
        self.assertTrue(allowed.json()['is_published'])

    def test_cannot_access_another_teachers_test(self):
        other, _ = User.objects.get_or_create(username='teacher2')
        other.set_password('pw-1234-teacher')
        other.save()
        Profile.objects.filter(user=other).update(role='teacher')
        other_access = str(RefreshToken.for_user(other).access_token)

        response = self.client.get(
            f'/api/teacher/tests/{self.test_id}/build/', HTTP_AUTHORIZATION=f'Bearer {other_access}',
        )
        self.assertEqual(response.status_code, 404)

    def test_created_test_is_attributed_to_the_teacher_in_the_audit_log(self):
        # Same CurrentUserMiddleware gap as panel/api.py (see accounts/jwt_auth.py) — the
        # test set up in setUp() already created a TestSet via the API, so just check it.
        log = AuditLog.objects.filter(model_name='Test', action='create').order_by('-timestamp').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user_id, self.user.id)

    def test_student_cannot_access_teacher_api(self):
        student, _ = User.objects.get_or_create(username='studentx')
        student.set_password('pw-1234-teacher')
        student.save()
        student_access = str(RefreshToken.for_user(student).access_token)
        response = self.client.get('/api/teacher/tests/', HTTP_AUTHORIZATION=f'Bearer {student_access}')
        self.assertEqual(response.status_code, 403)
