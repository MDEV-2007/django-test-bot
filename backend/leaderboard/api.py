from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject

from shop import services as shop_services

from . import services


@api_view(['GET'])
def rankings_api(request):
    subjects = list(Subject.objects.all())
    view = request.GET.get('subject', 'all')
    if view != 'all' and not any(s.slug == view for s in subjects):
        view = 'all'

    profile = ensure_profile_for_user(request.user)

    top = services.get_top_ranking(view)
    my_rank, neighbors = services.get_rank_and_neighbors(profile, view)

    # Ikkala ro'yxat uchun profillar bitta indekslangan so'rovda olinadi.
    ids = {r['profile_id'] for r in top} | {n['profile_id'] for n in neighbors}
    by_id = {p.id: p for p in Profile.objects.select_related('user').filter(id__in=ids)}
    # Do'kondagi bezaklar reytingda ham ko'rinadi — aks holda ular faqat egasining
    # o'z profilida ma'noga ega bo'lardi, holbuki kosmetikaning butun mazmuni
    # boshqalarga ko'rinishida.
    cosmetics_by_id = shop_services.get_equipped_bulk(ids)

    def row(r):
        p = by_id.get(r['profile_id'])
        if p is None:
            return None
        cosmetics = cosmetics_by_id.get(p.id) or {}
        return {
            'profile_id': p.id, 'username': p.user.username,
            'first_name': p.user.first_name, 'last_name': p.user.last_name,
            'avatar_url': shop_services.display_avatar_url(p.avatar_url, cosmetics),
            'xp': r['xp'] if view != 'all' else p.xp,
            'level': p.level,
            'cosmetics': cosmetics,
        }

    ranked = [row(r) for r in top]
    ranked = [r for r in ranked if r is not None]

    # "Sizning guruhingiz": o'quvchi qatnashadigan yaqin atrof. Global ro'yxatda
    # ko'rinmaydigan o'quvchi ham shu yerda o'zini va erishsa bo'ladigan maqsadni ko'radi.
    my_group = []
    for n in neighbors:
        data = row(n)
        if data is None:
            continue
        data['rank'] = n['rank']
        data['is_me'] = n['profile_id'] == profile.id
        my_group.append(data)

    return Response({
        'podium': ranked[:3],
        'rankings': ranked[3:15],
        'my_rank': my_rank,
        'my_group': my_group,
        'subjects': [{'id': s.id, 'name': s.name, 'slug': s.slug} for s in subjects],
        'selected_view': view,
    })
