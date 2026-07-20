"""Per-page unit tests.

`test_pages.py` is a broad smoke sweep (does every URL return 200?). This module goes one
level deeper: each page gets its own test asserting the template it renders, the context
it publishes and the content a user actually sees — so a page that returns 200 while
silently rendering an empty or broken body still fails.
"""
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase

from shop import services as shop_services
from tests_app.models import AIFeedback, RevisionItem

from .factories import (make_attempt, make_freeze_item, make_question, make_shop_item,
                        make_subject, make_test_set, make_topic, make_user)


class PageTestCase(TestCase):
    """Shared fixture: a student with a subject, topic, questions and a published test."""

    def setUp(self):
        # Analytics, the leaderboard and equipped cosmetics are all cache-backed, and the
        # locmem cache outlives the per-test transaction. Without this, a rolled-back
        # test's cached payload is served to the next one (row ids get reused).
        cache.clear()
        self.subject = make_subject()
        self.topic = make_topic(subject=self.subject)
        self.questions = [
            make_question(subject=self.subject, topic=self.topic, body=f"Savol {i}")
            for i in range(3)
        ]
        self.test_set = make_test_set(subject=self.subject, questions=self.questions)
        self.user, self.profile = make_user(coins=1000, xp=250, streak=4)
        self.client.force_login(self.user)

    def complete_attempt(self, correctly=False):
        attempt = make_attempt(self.profile, self.test_set, self.questions)
        for answer in attempt.answers.select_related('question'):
            option = answer.question.choices.filter(is_correct=correctly).first()
            self.client.post(f'/tests/submit-answer/{attempt.id}/', {
                'question_id': answer.question_id, 'q_idx': 1, 'choice_id': option.id,
            })
        self.client.post(f'/tests/finish/{attempt.id}/')
        attempt.refresh_from_db()
        return attempt


class DashboardPageTests(PageTestCase):
    def test_renders_with_gamification_stats(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'dashboard/home.html')
        self.assertEqual(response.context['coins'], 1000)
        self.assertEqual(response.context['xp'], 250)
        self.assertIn('missions', response.context)

    def test_shows_streak_freeze_count_when_owned(self):
        freeze = make_freeze_item()
        shop_services.purchase_item(self.profile, freeze)
        response = self.client.get('/')
        self.assertEqual(response.context['freeze_count'], 1)


class TestCentrePageTests(PageTestCase):
    def test_lists_published_tests(self):
        response = self.client.get('/tests/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'tests_app/center.html')
        self.assertIn(self.test_set, response.context['tests'])

    def test_average_score_reflects_completed_attempts(self):
        self.complete_attempt(correctly=True)
        response = self.client.get('/tests/')
        self.assertEqual(response.context['avg_score'], 100)
        self.assertEqual(response.context['total_attempts'], 1)


class TestHistoryPageTests(PageTestCase):
    def test_lists_completed_attempts(self):
        self.complete_attempt(correctly=True)
        response = self.client.get('/tests/history/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'tests_app/history.html')
        self.assertEqual(len(response.context['attempts']), 1)

    def test_is_paginated(self):
        response = self.client.get('/tests/history/')
        self.assertIn('page_obj', response.context)
        self.assertEqual(response.context['page_obj'].paginator.per_page, 25)


class AnalyticsPageTests(PageTestCase):
    def test_shows_empty_state_before_any_test(self):
        response = self.client.get('/analytics/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'analytics/dashboard.html')
        self.assertEqual(response.context['data']['total_tests'], 0)

    def test_publishes_chart_datasets_after_a_test(self):
        self.complete_attempt(correctly=True)
        response = self.client.get('/analytics/')
        charts = response.context['charts']
        for key in ('radar', 'daily', 'weekly', 'subject_dist', 'accuracy_breakdown'):
            self.assertIn(key, charts)
        self.assertEqual(response.context['data']['total_tests'], 1)
        self.assertEqual(response.context['data']['accuracy'], 100)

    def test_radar_axes_come_from_answered_topics(self):
        self.complete_attempt(correctly=True)
        response = self.client.get('/analytics/')
        self.assertIn(self.topic.title, response.context['charts']['radar']['labels'])


class RevisionPageTests(PageTestCase):
    def test_empty_deck_before_any_mistake(self):
        response = self.client.get('/tests/revision/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'tests_app/revision.html')
        self.assertEqual(response.context['deck'], [])

    def test_deck_contains_wrong_questions(self):
        self.complete_attempt(correctly=False)
        response = self.client.get('/tests/revision/')
        self.assertEqual(len(response.context['deck']), len(self.questions))
        self.assertEqual(response.context['total'], len(self.questions))

    def test_subject_filter_narrows_the_deck(self):
        self.complete_attempt(correctly=False)
        other = make_subject(name='Matematika', slug='matematika')
        response = self.client.get('/tests/revision/', {'subject': other.slug})
        self.assertEqual(response.context['deck'], [])
        self.assertEqual(response.context['selected_subject'], other.slug)

    def test_progress_counters_are_published(self):
        self.complete_attempt(correctly=False)
        item = RevisionItem.objects.filter(profile=self.profile).first()
        item.mastered = True
        item.save(update_fields=['mastered'])
        response = self.client.get('/tests/revision/')
        self.assertEqual(response.context['mastered_count'], 1)


class ShopPageTests(PageTestCase):
    def setUp(self):
        super().setUp()
        self.item = make_shop_item(slug='title_bilimdon', price=200)

    def test_lists_items_grouped_by_category(self):
        response = self.client.get('/shop/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'shop/home.html')
        all_items = [i for group in response.context['categories'].values() for i in group]
        self.assertIn(self.item, all_items)

    def test_marks_affordability_against_the_balance(self):
        pricey = make_shop_item(slug='frame_diamond', price=99_999)
        response = self.client.get('/shop/')
        items = {i.slug: i for group in response.context['categories'].values() for i in group}
        self.assertTrue(items['title_bilimdon'].affordable)
        self.assertFalse(items['frame_diamond'].affordable)

    def test_owned_item_is_flagged(self):
        shop_services.purchase_item(self.profile, self.item)
        response = self.client.get('/shop/')
        items = {i.slug: i for group in response.context['categories'].values() for i in group}
        self.assertTrue(items['title_bilimdon'].owned)


class InventoryPageTests(PageTestCase):
    def test_shows_owned_items_and_purchase_history(self):
        item = make_shop_item(slug='title_bilimdon', price=200)
        shop_services.purchase_item(self.profile, item)
        response = self.client.get('/shop/inventory/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'shop/inventory.html')
        self.assertEqual(len(response.context['items']), 1)
        self.assertEqual(len(response.context['history']), 1)

    def test_reports_streak_freeze_balance(self):
        freeze = make_freeze_item()
        shop_services.purchase_item(self.profile, freeze)
        response = self.client.get('/shop/inventory/')
        self.assertEqual(response.context['freeze_count'], 1)


class LeaderboardPageTests(PageTestCase):
    def test_renders_podium_and_rankings(self):
        response = self.client.get('/leaderboard/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'leaderboard/rankings.html')
        self.assertIn('podium', response.context)
        self.assertEqual(response.context['selected_view'], 'all')

    def test_ranks_users_by_xp(self):
        make_user(username='top_student', xp=99_999)
        response = self.client.get('/leaderboard/')
        # The podium is deliberately reordered for display: rank 2 left, rank 1 CENTRE,
        # rank 3 right — so the winner is index 1, not index 0.
        self.assertEqual(response.context['podium'][1].user.username, 'top_student')

    def test_unknown_subject_falls_back_to_overall(self):
        response = self.client.get('/leaderboard/', {'subject': 'does-not-exist'})
        self.assertEqual(response.context['selected_view'], 'all')


class ProfilePageTests(PageTestCase):
    def test_renders_profile_with_hub_links(self):
        response = self.client.get('/accounts/profile/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'accounts/profile.html')
        body = response.content.decode()
        for link in ('/analytics/', '/tests/revision/', '/shop/', '/premium/'):
            self.assertIn(link, body)

    def test_shows_equipped_title(self):
        item = make_shop_item(slug='title_bilimdon', price=10, payload={'title': 'Bilimdon'})
        shop_services.purchase_item(self.profile, item)
        shop_services.equip_item(self.profile, item)
        response = self.client.get('/accounts/profile/')
        self.assertEqual(response.context['equipped_cosmetics']['title']['payload']['title'], 'Bilimdon')


class PremiumPageTests(PageTestCase):
    def test_renders_plans(self):
        response = self.client.get('/premium/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'premium/plans.html')


class LearningPageTests(PageTestCase):
    def test_renders_learning_centre(self):
        response = self.client.get('/learning/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'learning/center.html')


class GamePageTests(PageTestCase):
    def test_all_three_games_render(self):
        for url in ('/games/timeline/', '/games/map/', '/games/character/'):
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)


class BattlePageTests(PageTestCase):
    def test_arena_renders(self):
        self.assertEqual(self.client.get('/battles/').status_code, 200)


class TestTakingFlowTests(PageTestCase):
    """The core product flow, asserted end to end."""

    def test_finish_awards_xp_coins_and_records_the_score(self):
        attempt = self.complete_attempt(correctly=True)
        self.profile.refresh_from_db()

        self.assertTrue(attempt.is_completed)
        self.assertEqual(attempt.score, 100)
        self.assertEqual(attempt.correct_answers, len(self.questions))
        self.assertEqual(self.profile.xp, 250 + len(self.questions) * 50)
        self.assertEqual(self.profile.coins, 1000 + len(self.questions) * 5)

    def test_wrong_answers_are_counted_and_queued_for_revision(self):
        attempt = self.complete_attempt(correctly=False)
        self.assertEqual(attempt.wrong_answers, len(self.questions))
        self.assertEqual(attempt.score, 0)
        self.assertEqual(RevisionItem.objects.filter(profile=self.profile).count(),
                         len(self.questions))

    def test_feedback_page_is_reachable_after_finishing(self):
        attempt = self.complete_attempt(correctly=True)
        response = self.client.get(f'/tests/feedback/{attempt.id}/')
        self.assertEqual(response.status_code, 200)

    def test_cannot_open_another_students_attempt(self):
        attempt = self.complete_attempt(correctly=True)
        other, _ = make_user(username='nosy')
        self.client.force_login(other)
        self.assertEqual(self.client.get(f'/tests/feedback/{attempt.id}/').status_code, 404)

    def test_finish_does_not_generate_feedback_inline(self):
        """The Groq call can take 20s+, so finishing must not wait for it — the job is
        only queued. Without this guarantee one worker is blocked per submission."""
        with patch('tests_app.views.background.submit') as submit:
            attempt = self.complete_attempt(correctly=True)
        self.assertFalse(AIFeedback.objects.filter(attempt=attempt).exists(),
                         "feedback must not be built during the request")
        submit.assert_not_called()  # queued via on_commit, not during the transaction

    def test_ai_feedback_is_generated_once_the_transaction_commits(self):
        """Regression guard: the job used to be dispatched *before* commit, so the
        background thread could not see the attempt yet — on SQLite it hit a table lock,
        on PostgreSQL it silently produced no feedback at all."""
        with patch('core.background.submit', side_effect=lambda fn, *a, **kw: fn(*a, **kw)):
            with self.captureOnCommitCallbacks(execute=True):
                attempt = self.complete_attempt(correctly=True)

        feedback = AIFeedback.objects.filter(attempt=attempt).first()
        self.assertIsNotNone(feedback, "feedback must exist after the commit hook runs")
        self.assertTrue(feedback.overall_analysis)

    def test_feedback_generation_is_idempotent(self):
        from tests_app.views import generate_ai_feedback

        with patch('core.background.submit', side_effect=lambda fn, *a, **kw: fn(*a, **kw)):
            with self.captureOnCommitCallbacks(execute=True):
                attempt = self.complete_attempt(correctly=True)

        generate_ai_feedback(attempt.id)  # re-running must not duplicate
        self.assertEqual(AIFeedback.objects.filter(attempt=attempt).count(), 1)
