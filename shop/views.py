from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from .models import InventoryItem, Purchase, ShopItem, StreakFreezeLog
from . import services


def _is_ajax(request):
    return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


def _safe_referer(request, fallback):
    """Only bounce back to the Referer when it points at this site — a raw
    redirect(HTTP_REFERER) is an open-redirect an attacker can aim off-site."""
    referer = request.META.get('HTTP_REFERER')
    if referer and url_has_allowed_host_and_scheme(
        referer, allowed_hosts={request.get_host()}, require_https=request.is_secure()
    ):
        return referer
    return fallback


def _respond(request, ok, message, status=200, redirect_to='shop:home', **extra):
    """Progressive enhancement: JS clients get JSON, plain form posts get a
    message + redirect back. One code path serves both."""
    if _is_ajax(request):
        return JsonResponse({'ok': ok, 'message': message, **extra}, status=status)
    (messages.success if ok else messages.error)(request, message)
    return redirect(_safe_referer(request, redirect_to))


@login_required
def shop_home(request):
    profile = request.user.profile
    items = list(ShopItem.objects.filter(is_active=True))

    # Single query for the whole inventory -> map by item id. Marking each item's
    # owned/equipped/affordable state in Python avoids a per-item query (no N+1).
    owned = {inv.item_id: inv for inv in InventoryItem.objects.filter(profile=profile)}
    categories = {}
    for item in items:
        inv = owned.get(item.id)
        item.owned = inv is not None
        item.owned_qty = inv.quantity if inv else 0
        item.equipped = bool(inv and inv.is_equipped)
        item.affordable = profile.coins >= item.price_coins
        categories.setdefault(item.get_category_display(), []).append(item)

    return render(request, 'shop/home.html', {
        'profile': profile,
        'categories': categories,
    })


@login_required
def inventory(request):
    profile = request.user.profile
    items = (InventoryItem.objects
             .filter(profile=profile)
             .select_related('item')
             .order_by('item__category', '-is_equipped', 'item__order'))
    history = Purchase.objects.filter(profile=profile)[:30]
    freeze_logs = StreakFreezeLog.objects.filter(profile=profile)[:15]
    return render(request, 'shop/inventory.html', {
        'profile': profile,
        'items': items,
        'history': history,
        'freeze_logs': freeze_logs,
        'freeze_count': services.available_freezes(profile),
    })


@login_required
@require_POST
def purchase(request, slug):
    item = get_object_or_404(ShopItem, slug=slug, is_active=True)
    try:
        profile, inv = services.purchase_item(request.user.profile, item)
    except services.ShopError as e:
        return _respond(request, ok=False, message=str(e), status=400)
    return _respond(
        request, ok=True, message=f"“{item.name}” sotib olindi!",
        coins=profile.coins, owned=True, quantity=inv.quantity,
        equippable=item.is_equippable,
    )


@login_required
@require_POST
def equip(request, slug):
    item = get_object_or_404(ShopItem, slug=slug)
    try:
        services.equip_item(request.user.profile, item)
    except services.ShopError as e:
        return _respond(request, ok=False, message=str(e), status=400)
    return _respond(request, ok=True, message=f"“{item.name}” faollashtirildi.",
                    category=item.category, equipped=True)


@login_required
@require_POST
def unequip(request, slug):
    item = get_object_or_404(ShopItem, slug=slug)
    services.unequip_item(request.user.profile, item)
    return _respond(request, ok=True, message=f"“{item.name}” yechildi.",
                    category=item.category, equipped=False)
