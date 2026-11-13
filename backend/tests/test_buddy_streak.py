from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from core.models import BuddyStreak, Notification
from core.services import buddy_coin_bonus, send_buddy_evening_nudges
from tests.factories import make_user


class BuddyStreakTests(TestCase):
    def setUp(self):
        _, self.p1 = make_user('buddy_a')
        _, self.p2 = make_user('buddy_b')
        self.bs = BuddyStreak.objects.create(
            user1=self.p1, user2=self.p2, invite_code='ILD-11111', status='active',
            current_streak=3, best_streak=3,
        )

    def test_bonus_only_when_both_finished_a_test_today(self):
        self.assertEqual(buddy_coin_bonus(self.p1, 100), 0)  # sherik hali ishlamagan
        self.assertEqual(buddy_coin_bonus(self.p2, 100), 50)  # endi ikkalasi ham — 1.5x
        self.bs.refresh_from_db()
        self.assertEqual(self.bs.current_streak, 4)
        self.assertEqual(self.bs.last_paired_date, timezone.localdate())
        # Ikkalasi bajargan kunning keyingi testlari ham 1.5x, streak esa qayta oshmaydi
        self.assertEqual(buddy_coin_bonus(self.p1, 40), 20)
        self.bs.refresh_from_db()
        self.assertEqual(self.bs.current_streak, 4)

    def test_plain_activity_does_not_count_as_a_test(self):
        self.p1.update_streak()
        self.bs.refresh_from_db()
        self.assertIsNone(self.bs.user1_last_active)

    def test_no_pair_means_no_bonus(self):
        _, loner = make_user('loner')
        self.assertEqual(buddy_coin_bonus(loner, 100), 0)

    @patch('core.services.send_message', return_value={'ok': True})
    def test_evening_nudge_goes_to_the_partner_who_has_not_tested(self, send):
        self.p2.telegram_id = '555'
        self.p2.save(update_fields=['telegram_id'])
        buddy_coin_bonus(self.p1, 10)

        res = send_buddy_evening_nudges()

        self.assertEqual(res, {'sent': 1, 'failed': 0})
        self.assertTrue(Notification.objects.filter(profile=self.p2).exists())
        self.assertFalse(Notification.objects.filter(profile=self.p1, type='system').exists())
        self.assertEqual(send.call_args[0][0], '555')

    @patch('core.services.send_message')
    def test_no_evening_nudge_when_both_or_neither_tested(self, send):
        self.assertEqual(send_buddy_evening_nudges()['sent'], 0)
        buddy_coin_bonus(self.p1, 10)
        buddy_coin_bonus(self.p2, 10)
        self.assertEqual(send_buddy_evening_nudges()['sent'], 0)
        send.assert_not_called()
