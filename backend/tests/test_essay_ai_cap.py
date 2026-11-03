"""The AI essay endpoint has a per-user daily cap: a locked (free) evaluation is still a
full Groq call, so without a cap one user could burn the shared AI quota."""
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from core.reward_caps import DAILY_REWARD_LIMITS
from tests.factories import make_user

FAKE_RESULT = {
    'word_count': 120, 'mazmun_ball': 20, 'mantiq_uslub_ball': 10, 'savodxonlik_ball': 10, 'total_ball': 40,
    'is_locked': True, 'errors_list': [], 'strengths': [], 'weaknesses': [], 'summary_feedback': '',
}


class EssayCapTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user, _ = make_user('essay_cap')
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(self.user).access_token}'

    def _post(self, text='Mening essem matni.'):
        return self.client.post('/api/growth/essay/evaluate/', {'essay_text': text, 'prompt_text': 'Mavzu'},
                                content_type='application/json')

    def test_ai_is_not_called_after_daily_cap(self):
        limit = DAILY_REWARD_LIMITS['essay_ai']
        with patch('growth.views.evaluate_essay_bmb', return_value=FAKE_RESULT) as ai:
            codes = [self._post().status_code for _ in range(limit + 2)]
        self.assertEqual(codes[:limit], [200] * limit)
        self.assertEqual(codes[limit:], [429, 429])
        self.assertEqual(ai.call_count, limit)

    def test_empty_essay_does_not_use_the_cap(self):
        with patch('growth.views.evaluate_essay_bmb', return_value=FAKE_RESULT) as ai:
            self.assertEqual(self._post(text='').status_code, 400)
        ai.assert_not_called()
