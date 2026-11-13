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
    is_premium_unlock = item.slug == 'premium_test_unlock'
    is_owned = inv is not None or (is_premium_unlock and profile.premium_mock_test_unlocked)
    is_consumable = False if is_premium_unlock else item.is_consumable
    return {
        'id': item.id, 'slug': item.slug, 'name': item.name, 'category': item.category,
        'category_display': item.get_category_display(), 'price_coins': item.price_coins,
        'description': item.description,
        'rarity': item.rarity, 'is_consumable': is_consumable, 'is_equippable': item.is_equippable,
        'owned': is_owned, 'owned_qty': inv.quantity if inv else (1 if is_owned else 0),
        'equipped': bool(inv and inv.is_equipped),
        'affordable': profile.coins >= item.price_coins,
    }


def _ensure_default_ildiz_market_items():
    """«Ildiz Market» asosiy mahsulotlari bazada mavjudligini kafolatlaydi."""
    defaults = [
        {
            'slug': 'streak_freeze',
            'name': "Obi-hayot tomchisi (Streak Muzlatkich)",
            'category': ShopItem.CATEGORY_CONSUMABLE,
            'description': "To'y, kasallik yoki internet yo'qligida 1 kunlik dars qoldirilsa, Streak zanjirini nolga tushishdan saqlab qoladi.",
            'icon_name': 'droplets',
            'price_coins': 150,
            'rarity': 'rare',
            'is_consumable': True,
            'order': 1,
        },
        {
            'slug': 'premium_test_unlock',
            'name': "Yopiq DTM Simulyatsiyasiga Chipta",
            'category': ShopItem.CATEGORY_CONSUMABLE,
            'description': "Har yakshanba bo'ladigan, haqiqiy imtihonga 100% yaqinlashtirilgan Respublika sinov imtihoniga kirish huquqi.",
            'icon_name': 'ticket',
            'price_coins': 450,
            'rarity': 'epic',
            'is_consumable': False,
            'order': 2,
        },
        {
            'slug': 'expert_zoom_ticket',
            'name': "Ekspert (Ustoz) bilan 15 daqiqalik Zoom-tahlil",
            'category': ShopItem.CATEGORY_CONSUMABLE,
            'description': "Tajribali fan ustozi bilan 15 daqiqalik jonli Zoom orqali eng qiyin xatolaringizni shaxsiy tahlil qilish chiptasi.",
            'icon_name': 'video',
            'price_coins': 800,
            'rarity': 'legendary',
            'is_consumable': True,
            'order': 3,
        },
        {
            'slug': 'gold_grant_frame',
            'name': "Davlat Granti Oltin Hoshiyasi",
            'category': ShopItem.CATEGORY_FRAME,
            'description': "Elita abituriyentlar profiliga beriladigan maxsus oltin ramka.",
            'icon_name': 'crown',
            'price_coins': 600,
            'rarity': 'legendary',
            'is_consumable': False,
            'payload': {'class': 'ring-2 ring-amber-400 shadow-lg'},
            'order': 4,
        },
    ]
    for d in defaults:
        ShopItem.objects.get_or_create(slug=d['slug'], defaults=d)


@api_view(['GET'])
def shop_home_api(request):
    _ensure_default_ildiz_market_items()
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

    from accounts.serializers import ProfileSerializer
    return Response({
        'coins': profile.coins,
        'freeze_count': services.available_freezes(profile),
        'profile': ProfileSerializer(profile).data,
        'items': [{
            'id': inv.item.id, 'slug': inv.item.slug, 'name': inv.item.name,
            'category': inv.item.category, 'category_display': inv.item.get_category_display(),
            'quantity': inv.quantity, 'equipped': inv.is_equipped,
            'is_equippable': inv.item.is_equippable,
            'rarity': inv.item.rarity,
            'payload': inv.item.payload,
            'description': inv.item.description,
            'icon_name': inv.item.icon_name,
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
    from accounts.serializers import ProfileSerializer
    return Response({'ok': True, 'coins': profile.coins, 'owned': True, 'quantity': inv.quantity,
                      'equippable': item.is_equippable, 'equipped': inv.is_equipped,
                      'profile': ProfileSerializer(profile).data})


@api_view(['POST'])
def equip_api(request, slug):
    item = get_object_or_404(ShopItem, slug=slug)
    try:
        services.equip_item(request.user.profile, item)
    except services.ShopError as e:
        return Response({'ok': False, 'error': str(e)}, status=400)
    from accounts.serializers import ProfileSerializer
    return Response({'ok': True, 'category': item.category, 'equipped': True,
                      'profile': ProfileSerializer(request.user.profile).data})


@api_view(['POST'])
def unequip_api(request, slug):
    item = get_object_or_404(ShopItem, slug=slug)
    services.unequip_item(request.user.profile, item)
    from accounts.serializers import ProfileSerializer
    return Response({'ok': True, 'category': item.category, 'equipped': False,
                      'profile': ProfileSerializer(request.user.profile).data})
