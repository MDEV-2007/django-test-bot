from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from accounts.models import Profile
from tests_app.models import Subject

from . import services


@login_required
def rankings(request):
    profile = request.user.profile
    subjects = list(Subject.objects.all())

    # 'all' ranks by overall Profile.xp; a subject slug ranks by that subject's SubjectScore.
    view = request.GET.get('subject', 'all')
    if view != 'all' and not any(s.slug == view for s in subjects):
        view = 'all'

    # Cached top-N (heavy ORDER BY is amortised); hydrate the ~15 rows cheaply by id.
    top = services.get_top_ranking(view)
    ids = [r['profile_id'] for r in top]
    by_id = {p.id: p for p in Profile.objects.select_related('user').filter(id__in=ids)}

    ranked = []
    for r in top:
        p = by_id.get(r['profile_id'])
        if p is None:
            continue
        if view != 'all':
            p.xp = r['xp']  # transient display override so the template shows subject XP
        ranked.append(p)

    podium = ranked[:3]
    rest_rankings = ranked[3:15]

    # Rank 2 on the left, Rank 1 in the middle, Rank 3 on the right.
    podium_ordered = [None, None, None]
    if len(podium) >= 1:
        podium_ordered[1] = podium[0]
    if len(podium) >= 2:
        podium_ordered[0] = podium[1]
    if len(podium) >= 3:
        podium_ordered[2] = podium[2]

    return render(request, 'leaderboard/rankings.html', {
        'podium': podium_ordered,
        'rankings': rest_rankings,
        'profile': profile,
        'subjects': subjects,
        'selected_view': view,
    })
