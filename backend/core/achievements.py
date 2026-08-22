"""Real, computed achievements — no fabricated numbers. Each definition's `check`
evaluates the profile's actual stats; badges are only ever awarded once earned."""
from django.db.models import Avg

from .models import Badge, ProfileBadge


def _total_tests(profile):
    return profile.attempts.filter(completed_at__isnull=False).count()


def _avg_score(profile):
    return profile.attempts.filter(completed_at__isnull=False, score__isnull=False).aggregate(a=Avg('score'))['a'] or 0


def _arena_wins(profile):
    from battles.models import Battle
    return Battle.objects.filter(winner=profile).count()


BADGE_DEFS = [
    dict(slug='first_test', name='Birinchi Qadam', description='Birinchi testni yakunladingiz',
         icon_name='footprints', rarity='common', check=lambda p: _total_tests(p) >= 1),
    dict(slug='tarix_bilimdoni', name='Tarix Bilimdoni', description="Tarixdan 100 ta test muvaffaqiyatli yechildi",
         icon_name='book-open', rarity='rare', check=lambda p: _total_tests(p) >= 100),
    dict(slug='streak_7', name='Haftalik Olov', description='7 kun ketma-ket dars qoldirilmadi',
         icon_name='flame', rarity='common', check=lambda p: p.streak >= 7),
    dict(slug='streak_14', name='14-Kunlik Olov', description='14 kun ketma-ket dars qoldirilmadi',
         icon_name='flame', rarity='rare', check=lambda p: p.streak >= 14),
    dict(slug='streak_30', name='Oylik Sadoqat', description='30 kun ketma-ket dars qoldirilmadi',
         icon_name='flame', rarity='epic', check=lambda p: p.streak >= 30),
    dict(slug='arena_first_win', name="Birinchi G'alaba", description='Arenada birinchi jangda g\'olib chiqdingiz',
         icon_name='swords', rarity='common', check=lambda p: _arena_wins(p) >= 1),
    dict(slug='arena_champion', name='Arena Chempioni', description="1v1 jangda 25 marta g'alaba qozonildi",
         icon_name='swords', rarity='epic', check=lambda p: _arena_wins(p) >= 25),
    dict(slug='certificate_a', name='Sertifikat A+', description="Diagnostika testida 85%+ ball olindi",
         icon_name='award', rarity='epic', check=lambda p: _avg_score(p) >= 85 and _total_tests(p) >= 5),
    dict(slug='level_5', name='Bilim Ildizi: Daraja 5', description='5-darajaga yetildi',
         icon_name='sprout', rarity='rare', check=lambda p: p.level >= 5),
    dict(slug='level_10', name='Bilim Ildizi: Daraja 10', description='10-darajaga yetildi',
         icon_name='sprout', rarity='legendary', check=lambda p: p.level >= 10),
    dict(slug='premium_member', name='PRO A\'zo', description='Premium obunaga ega bolindi',
         icon_name='crown', rarity='rare', check=lambda p: p.is_premium),
    dict(slug='elo_1400', name='Mingboshi', description='Arena ELO 1400 ga yetkazildi',
         icon_name='shield', rarity='epic', check=lambda p: p.elo_rating >= 1400),
]

TOTAL_BADGES = len(BADGE_DEFS)


def seed_badges():
    for d in BADGE_DEFS:
        Badge.objects.get_or_create(
            name=d['name'],
            defaults=dict(description=d['description'], icon_name=d['icon_name'], rarity=d['rarity']),
        )


def evaluate_badges(profile):
    """Awards any newly-earned badges for this profile. Cheap no-op once all are earned."""
    earned_names = set(ProfileBadge.objects.filter(profile=profile).values_list('badge__name', flat=True))
    to_check = [d for d in BADGE_DEFS if d['name'] not in earned_names]
    if not to_check:
        return
    seed_badges()
    badges_by_name = {b.name: b for b in Badge.objects.filter(name__in=[d['name'] for d in to_check])}
    for d in to_check:
        if d['check'](profile):
            badge = badges_by_name.get(d['name'])
            if badge:
                ProfileBadge.objects.get_or_create(profile=profile, badge=badge)
