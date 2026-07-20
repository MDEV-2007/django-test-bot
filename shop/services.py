"""Shop domain logic — kept out of views so it can be reused by the bot, management
commands and future APIs, and unit-tested without HTTP.

Money-safety: every coin mutation happens inside a single `transaction.atomic()` with
`select_for_update()` on the buyer's Profile row, so two concurrent purchases can never
both read the old balance and double-spend. This is the piece that must stay correct at
10k users, where concurrent requests from the same account are a real race.
"""
from django.core.cache import cache
from django.db import transaction

from accounts.models import Profile

from .models import InventoryItem, Purchase, ShopItem, StreakFreezeLog

STREAK_FREEZE_SLUG = 'streak_freeze'

EQUIPPED_CACHE_KEY = 'shop:equipped:{pid}'
EQUIPPED_CACHE_TTL = 60 * 30  # 30 min; also busted explicitly on equip/unequip.


class ShopError(Exception):
    """Expected, user-facing purchase/equip failure carrying a safe message."""


@transaction.atomic
def purchase_item(profile, item):
    """Buy one unit of `item` for `profile`. Returns (locked_profile, inventory_item).
    Raises ShopError on any business-rule failure (already handled by callers)."""
    locked = Profile.objects.select_for_update().get(pk=profile.pk)

    if not item.is_active:
        raise ShopError("Bu mahsulot hozir mavjud emas.")
    if item.required_level and locked.level < item.required_level:
        raise ShopError(f"Bu mahsulot {item.required_level}-darajadan ochiladi.")

    inv = InventoryItem.objects.select_for_update().filter(profile=locked, item=item).first()
    if inv and not item.is_consumable:
        raise ShopError("Bu mahsulot sizda allaqachon bor.")
    if locked.coins < item.price_coins:
        raise ShopError("Tangangiz yetarli emas.")

    # Row is locked, so a plain decrement is race-safe.
    locked.coins -= item.price_coins
    locked.save(update_fields=['coins'])

    if inv:  # consumable restock
        inv.quantity += 1
        inv.save(update_fields=['quantity', 'updated_at'])
    else:
        inv = InventoryItem.objects.create(profile=locked, item=item, quantity=1)

    Purchase.objects.create(
        profile=locked, item=item, item_name=item.name,
        coins_spent=item.price_coins, quantity=1,
    )
    return locked, inv


@transaction.atomic
def equip_item(profile, item):
    """Equip a cosmetic, unequipping whatever else is active in the same category."""
    inv = InventoryItem.objects.select_for_update().filter(profile=profile, item=item).first()
    if not inv:
        raise ShopError("Bu mahsulot sizda yo'q.")
    if not item.is_equippable:
        raise ShopError("Bu mahsulotni faollashtirib bo'lmaydi.")

    (InventoryItem.objects
     .filter(profile=profile, item__category=item.category, is_equipped=True)
     .exclude(pk=inv.pk)
     .update(is_equipped=False))
    inv.is_equipped = True
    inv.save(update_fields=['is_equipped', 'updated_at'])
    _bust_equipped_cache(profile.pk)
    return inv


@transaction.atomic
def unequip_item(profile, item):
    InventoryItem.objects.filter(profile=profile, item=item, is_equipped=True).update(is_equipped=False)
    _bust_equipped_cache(profile.pk)


def get_equipped(profile):
    """Return {category: {slug, name, icon_name, rarity, payload}} for the profile's
    currently-equipped cosmetics. Cached per profile so the context processor that runs
    on every page render is a single cache hit, not a DB query."""
    key = EQUIPPED_CACHE_KEY.format(pid=profile.pk)
    data = cache.get(key)
    if data is None:
        data = {}
        qs = (InventoryItem.objects
              .filter(profile=profile, is_equipped=True,
                      item__category__in=ShopItem.EQUIPPABLE_CATEGORIES)
              .select_related('item'))
        for inv in qs:
            data[inv.item.category] = {
                'slug': inv.item.slug,
                'name': inv.item.name,
                'icon_name': inv.item.icon_name,
                'rarity': inv.item.rarity,
                'payload': inv.item.payload,
            }
        cache.set(key, data, EQUIPPED_CACHE_TTL)
    return data


def _bust_equipped_cache(profile_pk):
    cache.delete(EQUIPPED_CACHE_KEY.format(pid=profile_pk))


# --- Streak Freeze (Feature 6) -------------------------------------------------

def available_freezes(profile):
    """How many Streak-Freeze units this profile currently holds (0 if none/unowned)."""
    item = ShopItem.objects.filter(slug=STREAK_FREEZE_SLUG).first()
    if not item:
        return 0
    inv = InventoryItem.objects.filter(profile=profile, item=item).first()
    return inv.quantity if inv else 0


@transaction.atomic
def consume_freezes(profile, needed, streak_before=0):
    """Spend exactly `needed` Streak-Freeze units to bridge a `needed`-day activity gap —
    but only if the profile owns at least that many (a freeze that can't fully save the
    streak is never wasted). Returns the number consumed (0 or `needed`). Row-locked so
    two concurrent streak updates can't double-spend."""
    if needed <= 0:
        return 0
    item = ShopItem.objects.filter(slug=STREAK_FREEZE_SLUG).first()
    if not item:
        return 0
    inv = InventoryItem.objects.select_for_update().filter(profile=profile, item=item).first()
    if not inv or inv.quantity < needed:
        return 0
    inv.quantity -= needed
    if inv.quantity == 0:
        inv.delete()
    else:
        inv.save(update_fields=['quantity', 'updated_at'])
    StreakFreezeLog.objects.create(
        profile=profile, days_covered=needed, streak_before=streak_before,
        note=f"{needed} kunlik uzilish avtomatik qoplandi",
    )
    return needed
