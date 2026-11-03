"""Re-engagement broadcasts: segment audiences, a random test batch, "send to the rest"
without repeats, and the {ism} placeholder."""
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Notification
from panel.broadcasting import audience_profiles
from panel.models import Broadcast
from tests.factories import make_attempt, make_question, make_test_set, make_user


def auth(client, user):
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'


class SegmentTests(TestCase):
    def setUp(self):
        now = timezone.now()
        self.active = self._student('seg_active', now - timedelta(days=2))
        self.lapsed = self._student('seg_lapsed', now - timedelta(days=15))
        self.dormant = self._student('seg_dormant', now - timedelta(days=60))
        q = make_question()
        attempt = make_attempt(self.active, make_test_set(questions=[q]), [q])
        type(attempt).objects.filter(pk=attempt.pk).update(is_completed=True)
        _, self.teacher = make_user('seg_teacher', role='teacher')

    @staticmethod
    def _student(name, seen):
        _, p = make_user(name)
        type(p).objects.filter(pk=p.pk).update(last_seen_at=seen)
        return p

    def ids(self, audience):
        return set(audience_profiles(audience).values_list('id', flat=True))

    def test_segments_split_students_by_last_visit(self):
        self.assertEqual(self.ids('active_7d'), {self.active.id})
        self.assertEqual(self.ids('lapsed'), {self.lapsed.id})
        self.assertEqual(self.ids('dormant'), {self.dormant.id})

    def test_no_test_segment_excludes_finishers_and_teachers(self):
        self.assertEqual(self.ids('no_test'), {self.lapsed.id, self.dormant.id})


class BroadcastBatchTests(TestCase):
    def setUp(self):
        self.admin, _ = make_user('bc_admin', role='superadmin')
        self.students = []
        for i in range(6):
            user, p = make_user(f'bc_s{i}')
            type(user).objects.filter(pk=user.pk).update(first_name=f'Ism{i}')
            type(p).objects.filter(pk=p.pk).update(telegram_id=1000 + i,
                                                   last_seen_at=timezone.now() - timedelta(days=10))
            self.students.append(p)
        auth(self.client, self.admin)

    def _send(self, **extra):
        data = {'title': 'Salom', 'message': 'Salom, {ism}! Shanba mocki bor.', 'audience': 'lapsed',
                'via_telegram': 'true', **extra}
        with patch('panel.api.background.submit', side_effect=lambda fn: fn()), \
             patch('panel.api.execute_telegram_broadcast', return_value={'sent_count': 0}) as tg:
            res = self.client.post('/api/panel/broadcast/', data)
        return res, tg

    def test_test_batch_then_rest_never_repeats(self):
        res, tg = self._send(limit=2)
        self.assertEqual(res.status_code, 200, res.content)
        first = Broadcast.objects.latest('id')
        self.assertEqual(len(first.recipient_ids), 2)
        self.assertEqual(len(tg.call_args.kwargs['telegram_ids']), 2)

        res, _ = self._send(exclude_broadcast=first.id)
        rest = Broadcast.objects.latest('id')
        self.assertEqual(len(rest.recipient_ids), 4)
        self.assertFalse(set(first.recipient_ids) & set(rest.recipient_ids))

    def test_name_placeholder_is_personalized(self):
        _, tg = self._send(limit=1)
        bc = Broadcast.objects.latest('id')
        profile = next(p for p in self.students if p.id == bc.recipient_ids[0])
        profile.refresh_from_db()
        note = Notification.objects.get(profile=profile, title='Salom')
        self.assertIn(f'Ism{self.students.index(profile)}', note.message)
        caption_for = tg.call_args.kwargs['caption_for']
        self.assertIn(f'Ism{self.students.index(profile)}', caption_for(str(profile.telegram_id)))
        self.assertNotIn('{ism}', caption_for(str(profile.telegram_id)))
