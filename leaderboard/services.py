"""Leaderboard ranking with a cache layer (Feature 1).

The expensive part at thousands of users is the full-table ORDER BY xp; caching its top-N
result for a few minutes turns every leaderboard hit after the first into a single cache
read. We cache only lightweight (profile_id, xp) tuples — not model instances — and the
view rehydrates the 15 Profile rows with one indexed `id__in` query, so avatars/names stay
fresh and correct while the costly sort is amortised.

Refresh model: time-based (RANKING_TTL), matching the "auto refresh every 5-10 minutes"
requirement. We deliberately do NOT bust on every XP change — that would defeat the cache
under constant test activity. `invalidate()` exists for explicit admin resets.

Scale path: the cache backend is Redis the moment REDIS_URL is set (see settings.CACHES).
For true O(log N) live ranks at very large scale, this same interface can be backed by a
Redis sorted set (ZADD on XP change, ZREVRANGE for the top-N, ZREVRANK for a user's own
rank) without touching the view.
"""
from django.core.cache import cache

from accounts.models import Profile
from tests_app.models import SubjectScore

RANKING_TTL = 60 * 7  # 7 minutes
TOP_N = 15


def _key(view):
    return f'leaderboard:top:{view}'


def get_top_ranking(view):
    """Cached ordered list of {'profile_id', 'xp'} for a leaderboard view
    ('all' = overall Profile.xp, otherwise a subject slug = that subject's SubjectScore)."""
    key = _key(view)
    data = cache.get(key)
    if data is not None:
        return data

    if view == 'all':
        rows = Profile.objects.order_by('-xp').values_list('id', 'xp')[:TOP_N]
    else:
        rows = (SubjectScore.objects
                .filter(subject__slug=view, xp__gt=0)
                .order_by('-xp')
                .values_list('profile_id', 'xp')[:TOP_N])
    data = [{'profile_id': pid, 'xp': xp} for pid, xp in rows]
    cache.set(key, data, RANKING_TTL)
    return data


def invalidate(view=None):
    """Explicitly drop cached rankings (e.g. after an admin XP reset). No arg = overall."""
    cache.delete(_key(view or 'all'))
