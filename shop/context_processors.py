from .services import get_equipped


def shop_equipped(request):
    """Expose the user's equipped cosmetics to every template as `equipped_cosmetics`
    (a cache hit, not a query). Lets the navbar/profile render an equipped title, frame,
    etc. without each view having to fetch it."""
    if not request.user.is_authenticated:
        return {}
    profile = getattr(request.user, 'profile', None)
    if profile is None:
        return {}
    return {'equipped_cosmetics': get_equipped(profile)}
