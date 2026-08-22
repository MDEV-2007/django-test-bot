"""JSON API mirroring shop/views.py for the Next.js frontend — see accounts/api.py for the
overall JWT-API pattern. Always JSON (the Django views' dual JSON/messages+redirect
response only existed for progressive enhancement of the server-rendered pages)."""
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import services
from .models import InventoryItem, Purchase, ShopItem, StreakFreezeLog


def _item_payload(item, profile):
    inv = getattr(item, '_inv', None)
    return {
        'id': item.id, 'slug': item.slug, 'name': item.name, 'category': item.category,
        'category_display': item.get_category_display(), 'price_coins': item.price_coins,
        'rarity': item.rarity, 'is_consumable': item.is_consumable, 'is_equippable': item.is_equippable,
        'owned': inv is not None, 'owned_qty': inv.quantity if inv else 0,
        'equipped': bool(inv and inv.is_equipped),
        'affordable': profile.coins >= item.price_coins,
    }


@api_view(['GET'])
def shop_home_api(request):
    profile = request.user.profile
    items = list(ShopItem.objects.filter(is_active=True))
    owned = {inv.item_id: inv for inv in InventoryItem.objects.filter(profile=profile)}

    categories = {}
    for item in items:
        item._inv = owned.get(item.id)
        categories.setdefault(item.get_category_display(), []).append(_item_payload(item, profile))

    return Response({'coins': profile.coins, 'categories': categories})


@api_view(['GET'])
def inventory_api(request):
    profile = request.user.profile
    items = (InventoryItem.objects.filter(profile=profile).select_related('item')
             .order_by('item__category', '-is_equipped', 'item__order'))
    history = Purchase.objects.filter(profile=profile)[:30]
    freeze_logs = StreakFreezeLog.objects.filter(profile=profile)[:15]

    return Response({
        'coins': profile.coins,
        'freeze_count': services.available_freezes(profile),
        'items': [{
            'id': inv.item.id, 'slug': inv.item.slug, 'name': inv.item.name,
            'category': inv.item.category, 'quantity': inv.quantity, 'equipped': inv.is_equipped,
            'is_equippable': inv.item.is_equippable,
        } for inv in items],
        'history': [{
            'item_name': p.item_name, 'coins_spent': p.coins_spent, 'quantity': p.quantity, 'created_at': p.created_at,
        } for p in history],
        'freeze_logs': [{'created_at': f.created_at, 'streak_saved': f.streak_before} for f in freeze_logs],
    })


@api_view(['POST'])
def purchase_api(request, slug):
    item = get_object_or_404(ShopItem, slug=slug, is_active=True)
    try:
        profile, inv = services.purchase_item(request.user.profile, item)
    except services.ShopError as e:
        return Response({'ok': False, 'error': str(e)}, status=400)
    return Response({'ok': True, 'coins': profile.coins, 'owned': True, 'quantity': inv.quantity,
                      'equippable': item.is_equippable})


@api_view(['POST'])
def equip_api(request, slug):
    item = get_object_or_404(ShopItem, slug=slug)
    try:
        services.equip_item(request.user.profile, item)
    except services.ShopError as e:
        return Response({'ok': False, 'error': str(e)}, status=400)
    return Response({'ok': True, 'category': item.category, 'equipped': True})


@api_view(['POST'])
def unequip_api(request, slug):
    item = get_object_or_404(ShopItem, slug=slug)
    services.unequip_item(request.user.profile, item)
    return Response({'ok': True, 'category': item.category, 'equipped': False})
