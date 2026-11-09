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
TOP_N = 50


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
    ).annotate(
        completed_tests=Count('attempts', filter=Q(attempts__is_completed=True))
    ).filter(
        Q(completed_tests__gte=3) | Q(xp__gte=150)
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
    if profile.is_privileged or profile.role != 'student':
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
    xp_val = max(0, int(xp or 0))
    for info in reversed(LEAGUE_TIERS):
        if xp_val >= info['min_xp']:
            return info
    return LEAGUE_TIERS[0]


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


def get_weekly_micro_league(profile: Profile) -> dict:
    """Har dushanba 30 nafar darajasi bir xil o'quvchi bitta mikro-ligaga tushadi.
    Top-5 keyingi ligaga o'tadi ('promotion'), oxirgi 5 kishi pastga tushadi ('demotion').
    """
    my_tier = resolve_league_tier(profile.xp)
    min_xp = my_tier['min_xp']
    max_xp = my_tier['max_xp']

    qs = Profile.objects.filter(
        role='student',
        user__is_superuser=False,
        user__is_staff=False,
        xp__gte=min_xp,
    )
    if max_xp is not None:
        qs = qs.filter(xp__lte=max_xp)

    # Agar shu divizionda 30 ta odam chiqmasa, eng yaqin XP egalari bilan 30 tagacha to'ldiramiz
    cohort_profiles = list(qs.select_related('user').order_by('-xp', 'id')[:30])
    if profile.role == 'student' and not profile.is_privileged and all(p.id != profile.id for p in cohort_profiles):
        cohort_profiles.append(profile)
        cohort_profiles.sort(key=lambda p: (-p.xp, p.id))
        cohort_profiles = cohort_profiles[:30]

    if len(cohort_profiles) < 10:
        extra_ids = {p.id for p in cohort_profiles}
        extra = list(
            Profile.objects.filter(role='student', user__is_superuser=False, user__is_staff=False)
            .exclude(id__in=extra_ids)
            .select_related('user')
            .order_by('-xp', 'id')[: (30 - len(cohort_profiles))]
        )
        cohort_profiles.extend(extra)
        cohort_profiles.sort(key=lambda p: (-p.xp, p.id))

    total_in_cohort = len(cohort_profiles)
    demotion_start = max(6, total_in_cohort - 4)  # Oxirgi 5 o'rin (agar guruhda yetarli odam bo'lsa)

    rows = []
    my_cohort_rank = 1
    for idx, p in enumerate(cohort_profiles, start=1):
        if idx <= 5:
            zone = 'promotion'
        elif idx >= demotion_start and total_in_cohort >= 10:
            zone = 'demotion'
        else:
            zone = 'safe'

        if p.id == profile.id:
            my_cohort_rank = idx

        full_name = f"{p.user.first_name} {p.user.last_name}".strip() or p.user.username
        rows.append({
            'rank': idx,
            'profile_id': p.id,
            'username': p.user.username,
            'name': full_name,
            'avatar_url': p.avatar_url or f"https://api.dicebear.com/7.x/adventurer/svg?seed={p.user.username}",
            'xp': p.xp,
            'dtm_score': round(getattr(p, 'estimated_dtm_score', 94.5) or 94.5, 1),
            'streak': p.streak,
            'zone': zone,
            'is_me': p.id == profile.id,
            'has_gold_border': my_tier['has_gold_border'] or idx <= 3,
        })

    next_tier = next((t for t in LEAGUE_TIERS if t['level'] == my_tier['level'] + 1), None)
    prev_tier = next((t for t in LEAGUE_TIERS if t['level'] == my_tier['level'] - 1), None)

    return {
        'current_league': my_tier,
        'next_league': next_tier,
        'prev_league': prev_tier,
        'all_leagues': LEAGUE_TIERS,
        'cohort_size': total_in_cohort,
        'my_cohort_rank': my_cohort_rank,
        'promotion_cutoff_rank': 5,
        'demotion_start_rank': demotion_start if total_in_cohort >= 10 else None,
        'seconds_until_reset': _seconds_until_sunday_2200(),
        'reset_label': 'Yakshanba 22:00 da Top-5 keyingi ligaga chiqadi',
        'rows': rows,
    }


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


def get_otm_mandat_simulator(profile: Profile, university_code: str = None) -> dict:
    """O'quvchining tanlagan OTM va yo'nalishi bo'yicha haqiqiy mandat simulyatsiyasi."""
    code = (university_code or getattr(profile, 'target_university', '') or 'TATU').strip()
    otm = next((item for item in OTM_CATALOG if item['code'].lower() == code.lower()), OTM_CATALOG[0])

    my_dtm = round(float(getattr(profile, 'estimated_dtm_score', None) or 94.5), 1)
    # Agar o'quvchi XP to'plagan bo'lsa-yu, estimated_dtm_score hali boshlang'ich 94.5 da tursa,
    # XP va o'rtacha test natijasidan dinamik hisoblaymiz:
    if my_dtm <= 95.0 and (profile.xp or 0) > 100:
        my_dtm = round(min(189.0, 94.5 + min(75.0, (profile.xp / 180.0))), 1)

    grant_cutoff = otm['grant_cutoff']
    contract_cutoff = otm['contract_cutoff']
    grant_quota = otm['grant_quota']
    contract_quota = otm['contract_quota']

    # Real bazadagi shu OTMni tanlagan abituriyentlar
    real_ahead = Profile.objects.filter(
        role='student',
        target_university__iexact=otm['code'],
        estimated_dtm_score__gt=my_dtm,
    ).count()

    # Mandatdagi o'rin simulyatsiyasi (grant_cutoff ga nisbatan realistik pog'ona)
    if my_dtm >= grant_cutoff:
        simulated_offset = max(0, int((189.0 - my_dtm) * (grant_quota / max(1.0, 189.0 - grant_cutoff))))
        my_rank = max(1, min(grant_quota, simulated_offset + 1 + real_ahead))
    elif my_dtm >= contract_cutoff:
        gap_ratio = (grant_cutoff - my_dtm) / max(1.0, grant_cutoff - contract_cutoff)
        my_rank = grant_quota + max(1, int(gap_ratio * (contract_quota - grant_quota))) + real_ahead
    else:
        gap_below = contract_cutoff - my_dtm
        my_rank = contract_quota + max(1, int(gap_below * 3.2)) + real_ahead

    total_applicants = max(otm['base_applicants'], my_rank + 42)
    points_to_grant = round(max(0.0, grant_cutoff - my_dtm), 1)
    points_to_contract = round(max(0.0, contract_cutoff - my_dtm), 1)

    if my_dtm >= grant_cutoff:
        status_zone = 'grant'
        probability = min(98, 85 + int((my_dtm - grant_cutoff) * 0.7))
        headline = (
            f"🎉 Tabriklaymiz! Siz hozir #{my_rank}-o'rindasiz va Davlat Granti "
            f"(Top-{grant_quota}) kvotasi ichidasiz!"
        )
    elif my_dtm >= contract_cutoff:
        status_zone = 'contract'
        probability = min(84, max(45, int(45 + ((my_dtm - contract_cutoff) / max(1.0, grant_cutoff - contract_cutoff)) * 38)))
        headline = (
            f"Sen hozir #{my_rank}-o'rindasan. Davlat grantiga kirish (Top-{grant_quota}) "
            f"uchun yana {points_to_grant} ball yetishmayapti."
        )
    else:
        status_zone = 'danger'
        probability = max(18, int((my_dtm / max(1.0, contract_cutoff)) * 44))
        headline = (
            f"Sen hozir #{my_rank}-o'rindasan. Davlat grantiga kirish (Top-{grant_quota}) "
            f"uchun yana {points_to_grant} ball, kontrakt uchun esa {points_to_contract} ball yetishmayapti."
        )

    return {
        'selected_otm': otm,
        'available_otms': OTM_CATALOG,
        'my_dtm_score': my_dtm,
        'max_dtm_score': 189.0,
        'my_rank': my_rank,
        'total_applicants': total_applicants,
        'grant_quota': grant_quota,
        'contract_quota': contract_quota,
        'grant_cutoff': grant_cutoff,
        'contract_cutoff': contract_cutoff,
        'points_to_grant': points_to_grant,
        'points_to_contract': points_to_contract,
        'admission_probability': probability,
        'status_zone': status_zone,
        'headline': headline,
    }


# ─── «Maktablar va Hududlar Jangi» (Klanlar Tizimi) ───────────────────────────
DEFAULT_UZ_REGIONS = [
    'Toshkent shahri', 'Samarqand', 'Buxoro', "Farg'ona", 'Andijon',
    'Namangan', 'Qashqadaryo', 'Surxondaryo', 'Xorazm', 'Navoiy',
    'Jizzax', 'Sirdaryo', 'Toshkent viloyati', "Qoraqalpog'iston",
]


def get_clans_ranking(profile: Profile) -> dict:
    """Viloyatlar va maktablar o'rtasidagi oylik chempionat reytingi."""
    from django.db.models import Avg, Count, Sum

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
            'total_xp': int(r['total_xp'] or 0),
            'students_count': int(r['students_count'] or 0),
            'avg_dtm': round(float(r['avg_dtm'] or 108.5), 1),
            'is_my_region': bool(profile.region and profile.region.lower() == reg_name.lower()),
        })

    # Agar bazada hali viloyatlar kam bo'lsa, asosiy viloyatlarni ro'yxatda ko'rsatamiz
    for reg_name in DEFAULT_UZ_REGIONS:
        if len(regions_ranking) >= 8:
            break
        if reg_name.lower() not in seen_regions:
            regions_ranking.append({
                'rank': len(regions_ranking) + 1,
                'region': reg_name,
                'total_xp': 0,
                'students_count': 0,
                'avg_dtm': 94.5,
                'is_my_region': bool(profile.region and profile.region.lower() == reg_name.lower()),
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
            'region': s['region'] or "O'zbekiston",
            'district': s['district'] or '',
            'total_xp': int(s['total_xp'] or 0),
            'students_count': int(s['students_count'] or 0),
            'avg_dtm': round(float(s['avg_dtm'] or 112.0), 1),
            'is_my_school': bool(profile.school and profile.school.lower() == s['school'].lower()),
        })

    # Oy derbisi (Top 2 viloyat jangi: masalan Samarqand vs Buxoro)
    if len(regions_ranking) >= 2:
        derby = {
            'title': f"🔥 Oy Derbisi: {regions_ranking[0]['region']} vs {regions_ranking[1]['region']}",
            'left': regions_ranking[0],
            'right': regions_ranking[1],
        }
    else:
        derby = {
            'title': "🔥 Oy Derbisi: Samarqand vs Buxoro",
            'left': {'region': 'Samarqand', 'total_xp': 12500, 'students_count': 45},
            'right': {'region': 'Buxoro', 'total_xp': 11800, 'students_count': 42},
        }

    return {
        'derby': derby,
        'regions': regions_ranking,
        'schools': schools_ranking,
        'my_clan': {
            'region': profile.region or '',
            'district': getattr(profile, 'district', '') or '',
            'school': getattr(profile, 'school', '') or '',
        },
    }

