"""Streak freeze: a missed day is bridged only when the student owns enough freezes,
and a freeze is never spent on a gap it cannot fully cover."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from shop.models import InventoryItem, StreakFreezeLog
from shop.services import available_freezes

from .factories import make_freeze_item, make_user


class StreakFreezeTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user()
        self.freeze = make_freeze_item()

    def _give_freezes(self, count):
        InventoryItem.objects.update_or_create(
            profile=self.profile, item=self.freeze, defaults={'quantity': count})

    def _set_last_active(self, days_ago, streak):
        self.profile.streak = streak
        self.profile.last_active_date = timezone.localdate() - timedelta(days=days_ago)
        self.profile.save()

    def test_active_yesterday_increments_normally(self):
        self._set_last_active(1, streak=3)
        self.profile.update_streak()
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.streak, 4)

    def test_same_day_activity_does_not_double_count(self):
        self.profile.streak = 5
        self.profile.last_active_date = timezone.localdate()
        self.profile.save()
        self.profile.update_streak()
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.streak, 5)

    def test_one_missed_day_is_bridged_by_a_freeze(self):
        self._give_freezes(1)
        self._set_last_active(2, streak=5)  # missed exactly one day
        self.profile.update_streak()
        self.profile.refresh_from_db()

        self.assertEqual(self.profile.streak, 6, "streak survives and today still counts")
        self.assertEqual(available_freezes(self.profile), 0, "the freeze was spent")
        self.assertEqual(StreakFreezeLog.objects.filter(profile=self.profile).count(), 1)

    def test_missed_day_without_a_freeze_resets_the_streak(self):
        self._set_last_active(2, streak=9)
        self.profile.update_streak()
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.streak, 1)

    def test_freeze_is_not_wasted_when_it_cannot_cover_the_whole_gap(self):
        self._give_freezes(1)
        self._set_last_active(3, streak=7)  # missed two days, only one freeze owned
        self.profile.update_streak()
        self.profile.refresh_from_db()

        self.assertEqual(self.profile.streak, 1, "not enough cover -> reset")
        self.assertEqual(available_freezes(self.profile), 1, "freeze must NOT be consumed")
        self.assertEqual(StreakFreezeLog.objects.count(), 0)

    def test_multiple_freezes_bridge_a_multi_day_gap(self):
        self._give_freezes(2)
        self._set_last_active(3, streak=7)  # missed two days, owns two freezes
        self.profile.update_streak()
        self.profile.refresh_from_db()

        self.assertEqual(self.profile.streak, 8)
        self.assertEqual(available_freezes(self.profile), 0)
