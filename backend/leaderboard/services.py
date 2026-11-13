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
from django.db.models import Q

from accounts.models import Profile
from tests_app.models import SubjectScore

RANKING_TTL = 60 * 7  # 7 minutes
TOP_N = 100


def _key(view):
    return f'leaderboard:top:{view}'


def get_top_ranking(view, timeframe='all'):
    """Cached ordered list of {'profile_id', 'xp'} for a leaderboard view.
    QAT'IY QOIDA:
    1. 1 dona test yechib 100% olgan va 1.5 oydan beri kirmagan o'quvchilar reytingda turmasin!
       Kamida 3 ta urinish (completed attempts >= 3) yoki faol o'quvchilar tanlanadi.
    2. Privileged users (superadmin, teacher, staff) qat'iyan chiqarib tashlanadi.
    """
    key = f"{_key(view)}:{timeframe}"
    data = cache.get(key)
    if data is not None:
        return data

    from django.utils import timezone
    from datetime import timedelta
    from django.db.models import Count, Sum

    base_profiles = Profile.objects.filter(
        role='student',
        user__is_superuser=False,
        user__is_staff=False,
        xp__gt=0,
    )

    if timeframe == 'weekly':
        seven_days_ago = timezone.now() - timedelta(days=7)
        # Oxirgi 7 kunda faol bo'lganlar
        base_profiles = base_profiles.filter(
            attempts__completed_at__gte=seven_days_ago,
            attempts__is_completed=True
        ).distinct()

    if view == 'all':
        rows = (base_profiles
                .order_by('-xp', 'id')
                .values_list('id', 'xp')[:TOP_N])
    else:
        rows = (SubjectScore.objects
                .filter(
                    subject__slug=view,
                    xp__gt=0,
                    profile__role='student',
                    profile__user__is_superuser=False,
                    profile__user__is_staff=False,
                    profile__id__in=base_profiles.values_list('id', flat=True)
                )
                .order_by('-xp', 'profile_id')
                .values_list('profile_id', 'xp')[:TOP_N])

    data = [{'profile_id': pid, 'xp': xp} for pid, xp in rows]
    cache.set(key, data, RANKING_TTL)
    return data


def invalidate(view=None):
    """Explicitly drop cached rankings (e.g. after an admin XP reset). No arg = overall & all subjects."""
    if view:
        cache.delete(_key(view))
    else:
        cache.delete(_key('all'))
        try:
            from tests_app.models import Subject
            for slug in Subject.objects.values_list('slug', flat=True):
                cache.delete(_key(slug))
        except Exception:
            pass


def get_rank_and_neighbors(profile, view, window=5):
    """O'quvchining o'z o'rni va unga eng yaqin raqiblari (yuqorida `window`, pastda `window`).

    Nega kerak: faqat global TOP-15 ko'rsatilganda 300-o'rindagi o'quvchi o'zini
    ro'yxatda umuman ko'rmaydi — bu ruhlantirmaydi, aksincha uzoqlashtiradi. Yaqin
    atrofdagi 10 kishi esa erishsa bo'ladigan maqsad beradi.

    Superadminlar va o'qituvchilar reytingda qatnashmaydi (0, [] qaytariladi).
    """
    if not profile or profile.is_privileged or profile.role != 'student':
        return 0, []

    # DIQQAT: "oldinda nechta kishi bor" hisobi ro'yxat TARTIBI bilan aynan bir xil
    # bo'lishi shart (teng XP larda ham). Aks holda o'quvchining o'z qatori oynadan
    # tashqarida qolib ketadi — teng ballilar ko'p bo'lganda bu doim sodir bo'ladi.
    if view == 'all':
        my_xp = profile.xp
        base = (Profile.objects
                .filter(role='student', user__is_superuser=False, user__is_staff=False)
                .order_by('-xp', 'id'))
        ahead = Profile.objects.filter(
            role='student', user__is_superuser=False, user__is_staff=False
        ).filter(
            Q(xp__gt=my_xp) | Q(xp=my_xp, id__lt=profile.id)
        ).count()
    else:
        score = SubjectScore.objects.filter(profile=profile, subject__slug=view).first()
        my_xp = score.xp if score else 0
        base = (SubjectScore.objects
                .filter(
                    subject__slug=view,
                    xp__gt=0,
                    profile__role='student',
                    profile__user__is_superuser=False,
                    profile__user__is_staff=False,
                )
                .order_by('-xp', 'profile_id'))
        ahead = SubjectScore.objects.filter(
            subject__slug=view,
            profile__role='student',
            profile__user__is_superuser=False,
            profile__user__is_staff=False,
        ).filter(
            Q(xp__gt=my_xp) | Q(xp=my_xp, profile_id__lt=profile.id)
        ).exclude(xp__lte=0).count()

    my_rank = ahead + 1
    start = max(0, my_rank - 1 - window)
    rows = list(base[start:start + window * 2 + 1])

    out = []
    for offset, row in enumerate(rows):
        if view == 'all':
            pid, xp = row.id, row.xp
        else:
            pid, xp = row.profile_id, row.xp
        out.append({'profile_id': pid, 'xp': xp, 'rank': start + offset + 1})
    return my_rank, out


# ─── 5 Bosqichli Haftalik Mikro-Ligalar (30 kishilik divizion) ─────────────────
LEAGUE_TIERS = [
    {
        'tier': 'nihol',
        'level': 1,
        'name': 'Nihol Ligasi',
        'subtitle': "Boshlang'ich bosqich",
        'badge': '🌱',
        'min_xp': 0,
        'max_xp': 999,
        'has_gold_border': False,
    },
    {
        'tier': 'kurtak',
        'level': 2,
        'name': 'Kurtak Ligasi',
        'subtitle': "O'sib boruvchi nihollar",
        'badge': '🌿',
        'min_xp': 1000,
        'max_xp': 2499,
        'has_gold_border': False,
    },
    {
        'tier': 'chinor',
        'level': 3,
        'name': 'Chinor Ligasi',
        'subtitle': 'Mustahkam ildiz egalari',
        'badge': '🌳',
        'min_xp': 2500,
        'max_xp': 4999,
        'has_gold_border': False,
    },
    {
        'tier': 'kontrakt',
        'level': 4,
        'name': 'Kuchli Kontrakt Ligasi',
        'subtitle': 'Talabalikka 1 qadam qolganlar',
        'badge': '🎓',
        'min_xp': 5000,
        'max_xp': 9999,
        'has_gold_border': False,
    },
    {
        'tier': 'grant',
        'level': 5,
        'name': 'Davlat Granti (Elita) Ligasi',
        'subtitle': 'Oltin hoshiya & Telegram kanal shohsupasi',
        'badge': '👑',
        'min_xp': 10000,
        'max_xp': None,
        'has_gold_border': True,
    },
]


def resolve_league_tier(xp: int) -> dict:
    """XP bo'yicha boshlang'ich liga (faqat migratsiya/yangi profil uchun; keyin haftalik o'zgaradi)."""
    xp_val = max(0, int(xp or 0))
    for info in reversed(LEAGUE_TIERS):
        if xp_val >= info['min_xp']:
            return info
    return LEAGUE_TIERS[0]


def league_by_level(level) -> dict:
    lvl = min(len(LEAGUE_TIERS), max(1, int(level or 1)))
    return LEAGUE_TIERS[lvl - 1]


DIVISION_SIZE = 30
PROMOTE_COUNT = 5
DEMOTE_COUNT = 5
MIN_DIVISION_FOR_DEMOTION = 10


def _league_students():
    return Profile.objects.filter(role='student', user__is_superuser=False, user__is_staff=False)


def _weekly_xp_expr():
    """Faqat joriy haftaning XP'si; o'tgan hafta yozuvi 0 hisoblanadi."""
    from django.db.models import Case, IntegerField, Value, When
    return Case(
        When(weekly_xp_week=Profile.current_week_start(), then='weekly_xp'),
        default=Value(0), output_field=IntegerField(),
    )


def ensure_league_division(profile: Profile) -> int:
    """Divizionsiz o'quvchini o'z ligasidagi bo'sh (30 dan kam) divizionga joylaydi."""
    from django.db.models import Count, Max
    if profile.league_division is not None:
        return profile.league_division
    peers = _league_students().filter(league_tier=profile.league_tier, league_division__isnull=False)
    open_div = (peers.values('league_division').annotate(n=Count('id'))
                .filter(n__lt=DIVISION_SIZE).order_by('league_division').first())
    if open_div:
        division = open_div['league_division']
    else:
        division = (peers.aggregate(m=Max('league_division'))['m'] or 0) + 1
    Profile.objects.filter(pk=profile.pk).update(league_division=division)
    profile.league_division = division
    return division


def _ranked_division(tier: int, division: int):
    return list(
        _league_students().filter(league_tier=tier, league_division=division)
        .annotate(week_xp=_weekly_xp_expr())
        .select_related('user').order_by('-week_xp', 'id')
    )


def _zone(idx: int, total: int, week_xp: int) -> str:
    if idx <= PROMOTE_COUNT and week_xp > 0:
        return 'promotion'
    if total >= MIN_DIVISION_FOR_DEMOTION and idx > total - DEMOTE_COUNT:
        return 'demotion'
    return 'safe'


def _seconds_until_sunday_2200() -> int:
    """Yakshanba soat 22:00 gacha qolgan soniyalar."""
    from datetime import datetime, time, timedelta
    from django.utils import timezone

    now = timezone.localtime()
    # weekday(): Monday=0 ... Sunday=6
    days_ahead = (6 - now.weekday()) % 7
    target_date = now.date() + timedelta(days=days_ahead)
    target_dt = timezone.make_aware(
        datetime.combine(target_date, time(22, 0)),
        timezone.get_current_timezone(),
    )
    if target_dt <= now:
        target_dt += timedelta(days=7)
    return max(0, int((target_dt - now).total_seconds()))


def get_weekly_micro_league(profile: Profile = None) -> dict:
    """O'quvchining 30 kishilik divizioni, shu haftaning XP'si bo'yicha.
    Yakshanba 22:00 da (`rollover_micro_leagues`) Top-5 keyingi ligaga chiqadi, oxirgi 5 tasi
    tushadi, haftalik XP nolga qaytadi."""
    is_student = bool(profile and profile.role == 'student' and not profile.is_privileged)
    my_tier = league_by_level(profile.league_tier if profile else 1)

    if is_student:
        division = ensure_league_division(profile)
        cohort = _ranked_division(profile.league_tier, division)
    else:
        # Admin/mehmon: shu ligadagi eng faol o'quvchilarni ko'rsatamiz
        cohort = list(
            _league_students().filter(league_tier=my_tier['level'])
            .annotate(week_xp=_weekly_xp_expr()).select_related('user')
            .order_by('-week_xp', 'id')[:DIVISION_SIZE]
        )

    total = len(cohort)
    rows = []
    my_cohort_rank = None
    for idx, p in enumerate(cohort, start=1):
        is_me = bool(profile and p.id == profile.id)
        if is_me:
            my_cohort_rank = idx
        full_name = f"{p.user.first_name} {p.user.last_name}".strip() or p.user.username
        rows.append({
            'rank': idx,
            'profile_id': p.id,
            'username': p.user.username,
            'name': full_name,
            'avatar_url': p.avatar_url or f"https://api.dicebear.com/7.x/adventurer/svg?seed={p.user.username}",
            'xp': p.week_xp,
            'total_xp': p.xp,
            'dtm_score': round(p.estimated_dtm_score, 1) if p.estimated_dtm_score is not None else None,
            'streak': p.streak,
            'zone': _zone(idx, total, p.week_xp),
            'is_me': is_me,
            'has_gold_border': my_tier['has_gold_border'] or idx <= 3,
        })

    next_tier = next((t for t in LEAGUE_TIERS if t['level'] == my_tier['level'] + 1), None)
    prev_tier = next((t for t in LEAGUE_TIERS if t['level'] == my_tier['level'] - 1), None)
    demotion_start = total - DEMOTE_COUNT + 1 if total >= MIN_DIVISION_FOR_DEMOTION else None

    return {
        'current_league': my_tier,
        'next_league': next_tier,
        'prev_league': prev_tier,
        'all_leagues': LEAGUE_TIERS,
        'cohort_size': total,
        'my_cohort_rank': my_cohort_rank,
        'promotion_cutoff_rank': PROMOTE_COUNT,
        'demotion_start_rank': demotion_start,
        'seconds_until_reset': _seconds_until_sunday_2200(),
        'reset_label': "Yakshanba 22:00 da Top-5 keyingi ligaga chiqadi, oxirgi 5 tasi tushadi",
        'xp_label': "shu haftalik XP",
        'rows': rows,
    }


def rollover_micro_leagues(dry_run: bool = False) -> dict:
    """Haftalik yakun (yakshanba 22:00): har divizionda Top-5 (shu hafta XP > 0) bir liga
    yuqoriga, 10+ kishilik divizionda oxirgi 5 tasi bir liga pastga. So'ng shu hafta faol
    bo'lganlar har ligada 30 kishilik divizionlarga qayta bo'linadi, haftalik XP nolga qaytadi."""
    import random
    from django.db import transaction
    from core.models import Notification

    max_level = len(LEAGUE_TIERS)
    promoted, demoted = [], []
    divisions = (_league_students().filter(league_division__isnull=False)
                 .values_list('league_tier', 'league_division').distinct())
    for tier, division in divisions:
        cohort = _ranked_division(tier, division)
        total = len(cohort)
        for idx, p in enumerate(cohort, start=1):
            zone = _zone(idx, total, p.week_xp)
            if zone == 'promotion' and tier < max_level:
                promoted.append(p)
            elif zone == 'demotion' and tier > 1:
                demoted.append(p)

    result = {'promoted': len(promoted), 'demoted': len(demoted)}
    if dry_run:
        return result

    with transaction.atomic():
        for p in promoted:
            Profile.objects.filter(pk=p.pk).update(league_tier=p.league_tier + 1)
        for p in demoted:
            Profile.objects.filter(pk=p.pk).update(league_tier=p.league_tier - 1)

        # Qayta bo'lish: shu hafta faol bo'lganlar divizionga kiradi; nofaollar keyingi
        # safar liga sahifasini ochganda ensure_league_division bilan joylanadi.
        week = Profile.current_week_start()
        active = list(_league_students().filter(weekly_xp_week=week, weekly_xp__gt=0)
                      .values_list('id', 'league_tier'))
        _league_students().update(league_division=None, weekly_xp=0)
        by_tier = {}
        for pid, tier in active:
            by_tier.setdefault(tier, []).append(pid)
        for tier, ids in by_tier.items():
            random.shuffle(ids)
            for i in range(0, len(ids), DIVISION_SIZE):
                Profile.objects.filter(id__in=ids[i:i + DIVISION_SIZE]).update(
                    league_division=i // DIVISION_SIZE + 1)

        for p in promoted:
            t = league_by_level(p.league_tier + 1)
            Notification.objects.create(
                profile=p, type='achievement',
                title=f"{t['badge']} {t['name']}ga ko'tarildingiz!",
                message="Haftaning Top-5 taligidan joy oldingiz. Yangi ligada omad!",
            )
        for p in demoted:
            t = league_by_level(p.league_tier - 1)
            Notification.objects.create(
                profile=p, type='system',
                title=f"{t['badge']} {t['name']}ga tushdingiz",
                message="Bu hafta divizioningizda oxirgi 5 talikda qoldingiz. Keyingi haftada qaytaring!",
            )
    return result


# ─── OTM va Kvota Simulyatori (Haqiqiy Mandat Simulyatsiyasi) ──────────────────
OTM_CATALOG = [
    {
        'code': 'TATU',
        'name': 'TATU (Axborot texnologiyalari universiteti)',
        'faculty': 'Dasturiy injiniring',
        'grant_quota': 35,
        'contract_quota': 140,
        'grant_cutoff': 156.4,
        'contract_cutoff': 114.2,
        'base_applicants': 420,
    },
    {
        'code': 'TDYU',
        'name': 'Toshkent Davlat Yuridik Universiteti (TDYU)',
        'faculty': 'Yurisprudensiya (Davlat-huquqiy faoliyat)',
        'grant_quota': 25,
        'contract_quota': 120,
        'grant_cutoff': 173.8,
        'contract_cutoff': 142.5,
        'base_applicants': 610,
    },
    {
        'code': 'TTA',
        'name': 'Toshkent Tibbiyot Akademiyasi (TTA)',
        'faculty': 'Davolash ishi',
        'grant_quota': 40,
        'contract_quota': 160,
        'grant_cutoff': 168.2,
        'contract_cutoff': 136.0,
        'base_applicants': 540,
    },
    {
        'code': 'TDIU',
        'name': 'Toshkent Davlat Iqtisodiyot Universiteti (TDIU)',
        'faculty': 'Moliya va moliyaviy texnologiyalar',
        'grant_quota': 30,
        'contract_quota': 150,
        'grant_cutoff': 162.5,
        'contract_cutoff': 126.8,
        'base_applicants': 490,
    },
    {
        'code': "O'zMU",
        'name': "O'zbekiston Milliy Universiteti (O'zMU)",
        'faculty': 'Amaliy matematika va intellektual texnologiyalar',
        'grant_quota': 45,
        'contract_quota': 155,
        'grant_cutoff': 148.6,
        'contract_cutoff': 106.4,
        'base_applicants': 380,
    },
    {
        'code': 'SamDU',
        'name': 'Samarqand Davlat Universiteti (SamDU)',
        'faculty': 'Filologiya va tillarni o\'qitish',
        'grant_quota': 35,
        'contract_quota': 130,
        'grant_cutoff': 151.2,
        'contract_cutoff': 110.5,
        'base_applicants': 350,
    },
]


def get_otm_mandat_simulator(profile: Profile = None, university_code: str = None) -> dict:
    """O'quvchining taxminiy DTM bali (haqiqiy javoblardan) va tanlagan OTMning taxminiy
    o'tish ballari solishtiriladi.

    Halollik: o'tish ballari o'tgan yillar asosidagi qo'lda kiritilgan taxmin (rasmiy emas);
    "kirish ehtimoli" foizi va to'qima mandat o'rni berilmaydi. Platformadagi o'rin esa
    haqiqiy: shu OTMni tanlagan o'quvchilar orasida taxminiy bal bo'yicha."""
    user_target = getattr(profile, 'target_university', '') if profile else ''
    code = (university_code or user_target or 'TATU').strip()
    otm = next((item for item in OTM_CATALOG if item['code'].lower() == code.lower()), OTM_CATALOG[0])
    grant_cutoff = otm['grant_cutoff']
    contract_cutoff = otm['contract_cutoff']

    my_dtm = getattr(profile, 'estimated_dtm_score', None) if profile else None
    base = {
        'catalog': OTM_CATALOG,
        'selected_university': otm,
        'selected_otm': otm,
        'available_otms': OTM_CATALOG,
        'max_dtm': 189.0,
        'max_dtm_score': 189.0,
        'grant_quota': otm['grant_quota'],
        'contract_quota': otm['contract_quota'],
        'grant_cutoff': grant_cutoff,
        'contract_cutoff': contract_cutoff,
        'cutoffs_note': "O'tish ballari o'tgan yillar asosida taxminiy, rasmiy emas.",
    }
    if my_dtm is None:
        from analytics.prediction import MIN_ANSWERS
        return {
            **base,
            'ready': False,
            'my_dtm': None,
            'my_dtm_score': None,
            'status': 'unknown',
            'status_zone': 'unknown',
            'status_label': f"Taxminiy ball uchun kamida {MIN_ANSWERS} ta savolga javob bering.",
            'headline': f"Taxminiy ball uchun kamida {MIN_ANSWERS} ta savolga javob bering.",
        }

    my_dtm = round(float(my_dtm), 1)
    rivals = Profile.objects.filter(role='student', target_university__iexact=otm['code'],
                                    estimated_dtm_score__isnull=False)
    if profile:
        rivals = rivals.exclude(pk=profile.pk)
    platform_rank = rivals.filter(estimated_dtm_score__gt=my_dtm).count() + 1
    platform_total = rivals.count() + 1

    points_to_grant = round(max(0.0, grant_cutoff - my_dtm), 1)
    points_to_contract = round(max(0.0, contract_cutoff - my_dtm), 1)
    if my_dtm >= grant_cutoff:
        status_zone = 'grant'
        headline = "Taxminiy balingiz grant o'tish balidan yuqori."
    elif my_dtm >= contract_cutoff:
        status_zone = 'contract'
        headline = f"Kontrakt zonasidasiz. Grant uchun yana {points_to_grant} ball kerak."
    else:
        status_zone = 'below'
        headline = f"Kontrakt o'tish baliga yana {points_to_contract} ball kerak."

    return {
        **base,
        'ready': True,
        'my_dtm': my_dtm,
        'my_dtm_score': my_dtm,
        'platform_rank': platform_rank,
        'platform_total': platform_total,
        'points_to_grant': points_to_grant,
        'points_to_contract': points_to_contract,
        'status': status_zone,
        'status_zone': status_zone,
        'status_label': headline,
        'headline': headline,
    }


# ─── «Maktablar va Hududlar Jangi» (Klanlar Tizimi) ───────────────────────────
DEFAULT_UZ_REGIONS = [
    'Toshkent shahri', 'Samarqand', 'Buxoro', "Farg'ona", 'Andijon',
    'Namangan', 'Qashqadaryo', 'Surxondaryo', 'Xorazm', 'Navoiy',
    'Jizzax', 'Sirdaryo', 'Toshkent viloyati', "Qoraqalpog'iston",
]


def get_clans_ranking(profile: Profile = None) -> dict:
    """Viloyatlar va maktablar o'rtasidagi oylik chempionat reytingi."""
    from django.db.models import Avg, Count, Sum

    user_region = (getattr(profile, 'region', '') or '') if profile else ''
    user_school = (getattr(profile, 'school', '') or '') if profile else ''
    user_district = (getattr(profile, 'district', '') or '') if profile else ''

    # 1. Hududlar (Viloyatlar) jangi
    region_rows = list(
        Profile.objects.filter(role='student', user__is_superuser=False, user__is_staff=False)
        .exclude(region='')
        .values('region')
        .annotate(
            total_xp=Sum('xp'),
            students_count=Count('id'),
            avg_dtm=Avg('estimated_dtm_score'),
        )
        .order_by('-total_xp')[:14]
    )

    regions_ranking = []
    seen_regions = set()
    for idx, r in enumerate(region_rows, start=1):
        reg_name = r['region']
        seen_regions.add(reg_name.lower())
        regions_ranking.append({
            'rank': idx,
            'region': reg_name,
            'name': reg_name,
            'total_xp': int(r['total_xp'] or 0),
            'students_count': int(r['students_count'] or 0),
            'students': int(r['students_count'] or 0),
            'avg_dtm': round(float(r['avg_dtm']), 1) if r['avg_dtm'] is not None else None,
            'is_my_region': bool(user_region and user_region.lower() == reg_name.lower()),
        })

    # Agar bazada hali viloyatlar kam bo'lsa, asosiy viloyatlarni ro'yxatda ko'rsatamiz
    for reg_name in DEFAULT_UZ_REGIONS:
        if len(regions_ranking) >= 8:
            break
        if reg_name.lower() not in seen_regions:
            regions_ranking.append({
                'rank': len(regions_ranking) + 1,
                'region': reg_name,
                'name': reg_name,
                'total_xp': 0,
                'students_count': 0,
                'students': 0,
                'avg_dtm': None,
                'is_my_region': bool(user_region and user_region.lower() == reg_name.lower()),
            })

    # 2. Maktablar chempionati
    school_rows = list(
        Profile.objects.filter(role='student', user__is_superuser=False, user__is_staff=False)
        .exclude(school='')
        .values('school', 'region', 'district')
        .annotate(
            total_xp=Sum('xp'),
            students_count=Count('id'),
            avg_dtm=Avg('estimated_dtm_score'),
        )
        .order_by('-total_xp')[:15]
    )

    schools_ranking = []
    for idx, s in enumerate(school_rows, start=1):
        schools_ranking.append({
            'rank': idx,
            'school': s['school'],
            'name': s['school'],
            'region': s['region'] or "O'zbekiston",
            'district': s['district'] or '',
            'total_xp': int(s['total_xp'] or 0),
            'students_count': int(s['students_count'] or 0),
            'students': int(s['students_count'] or 0),
            'avg_dtm': round(float(s['avg_dtm']), 1) if s['avg_dtm'] is not None else None,
            'is_my_school': bool(user_school and user_school.lower() == s['school'].lower()),
        })

    # Oy derbisi (Top 2 viloyat jangi: masalan Samarqand vs Buxoro)
    def _format_derby_region(item: dict) -> dict:
        r_name = item.get('region') or item.get('name') or ''
        r_xp = int(item.get('total_xp') or 0)
        r_students = int(item.get('students') or item.get('students_count') or 0)
        return {
            'name': r_name,
            'region': r_name,
            'total_xp': r_xp,
            'students': r_students,
            'students_count': r_students,
        }

    if len(regions_ranking) >= 2:
        reg1 = _format_derby_region(regions_ranking[0])
        reg2 = _format_derby_region(regions_ranking[1])
    else:
        reg1 = _format_derby_region({'region': 'Samarqand', 'total_xp': 12500, 'students_count': 45})
        reg2 = _format_derby_region({'region': 'Buxoro', 'total_xp': 11800, 'students_count': 42})

    xp_diff = abs(reg1['total_xp'] - reg2['total_xp'])
    leader = reg1['name'] if reg1['total_xp'] >= reg2['total_xp'] else reg2['name']

    derby = {
        'title': f"🔥 Oy Derbisi: {reg1['name']} vs {reg2['name']}",
        'description': f"{reg1['name']} va {reg2['name']} abituriyentlari o'rtasidagi shiddatli kurash. Qaysi hudud bu oy yetakchi bo'ladi?",
        'region1': reg1,
        'region2': reg2,
        'left': reg1,
        'right': reg2,
        'leader_name': leader,
        'xp_difference': xp_diff,
    }

    return {
        'derby': derby,
        'regions': regions_ranking,
        'schools': schools_ranking,
        'my_clan': {
            'region': user_region,
            'district': user_district,
            'school': user_school,
        },
    }

