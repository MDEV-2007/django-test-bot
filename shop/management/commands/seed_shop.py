"""Idempotent shop catalogue seeder.

    python manage.py seed_shop

Safe to re-run: every item is matched by its stable slug and updated in place, so
running it again after adding new rows here just fills in the gaps. The `streak_freeze`
consumable seeded here is the item Feature 6 (Streak Freeze) consumes.
"""
from django.core.management.base import BaseCommand

from shop.models import ShopItem

ITEMS = [
    # --- Consumables ---
    dict(slug='streak_freeze', category=ShopItem.CATEGORY_CONSUMABLE, name='Streak Muzlatish',
         description="Bir kun dars qilmasangiz, seriyangizni avtomatik saqlab qoladi.",
         icon_name='snowflake', price_coins=150, rarity='rare', is_consumable=True, order=1),

    # --- Titles ---
    dict(slug='title_bilimdon', category=ShopItem.CATEGORY_TITLE, name='Bilimdon',
         description="Profilingizda ko'rinadigan unvon.", icon_name='graduation-cap',
         price_coins=200, rarity='common', payload={'title': 'Bilimdon'}, order=10),
    dict(slug='title_tarix_ustasi', category=ShopItem.CATEGORY_TITLE, name='Tarix Ustasi',
         description="Tarix bo'yicha peshqadamlar unvoni.", icon_name='scroll',
         price_coins=500, rarity='epic', payload={'title': 'Tarix Ustasi'}, required_level=5, order=11),
    dict(slug='title_afsona', category=ShopItem.CATEGORY_TITLE, name='Afsona',
         description="Faqat eng kuchlilar uchun.", icon_name='crown',
         price_coins=1500, rarity='legendary', payload={'title': 'Afsona'}, required_level=10, order=12),

    # --- Frames (avatar ring) ---
    dict(slug='frame_silver', category=ShopItem.CATEGORY_FRAME, name='Kumush ramka',
         description="Avataringiz atrofida kumush halqa.", icon_name='circle',
         price_coins=300, rarity='rare', payload={'ring': '#c0c9d6'}, order=20),
    dict(slug='frame_gold', category=ShopItem.CATEGORY_FRAME, name='Oltin ramka',
         description="Avataringiz atrofida oltin halqa.", icon_name='circle',
         price_coins=800, rarity='epic', payload={'ring': '#f7c948'}, order=21),
    dict(slug='frame_diamond', category=ShopItem.CATEGORY_FRAME, name='Olmos ramka',
         description="Yaltiroq olmos halqa.", icon_name='gem',
         price_coins=2000, rarity='legendary', payload={'ring': '#37b7ff'}, required_level=10, order=22),

    # --- Themes (accent color) ---
    dict(slug='theme_emerald', category=ShopItem.CATEGORY_THEME, name='Zumrad mavzu',
         description="Ilova urg'u rangini zumradga o'zgartiradi.", icon_name='palette',
         price_coins=400, rarity='rare', payload={'accent': '#10b981'}, order=30),
    dict(slug='theme_sunset', category=ShopItem.CATEGORY_THEME, name='Shafaq mavzu',
         description="Iliq to'q sariq urg'u rangi.", icon_name='palette',
         price_coins=400, rarity='rare', payload={'accent': '#f97316'}, order=31),

    # --- Avatars ---
    dict(slug='avatar_scholar', category=ShopItem.CATEGORY_AVATAR, name='Olim avatari',
         description="Tayyor olim avatari.", icon_name='user-round',
         price_coins=250, rarity='common',
         payload={'avatar_url': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Scholar'}, order=40),
    dict(slug='avatar_explorer', category=ShopItem.CATEGORY_AVATAR, name='Sayyoh avatari',
         description="Tadqiqotchi avatari.", icon_name='compass',
         price_coins=250, rarity='common',
         payload={'avatar_url': 'https://api.dicebear.com/7.x/adventurer/svg?seed=Explorer'}, order=41),

    # --- Badges (cosmetic, shop-bought; distinct from earned core.Badge) ---
    dict(slug='badge_star', category=ShopItem.CATEGORY_BADGE, name='Yulduz nishoni',
         description="Profilingizga yulduz nishoni.", icon_name='star',
         price_coins=350, rarity='rare', payload={'color': '#f7c948'}, order=50),
]


class Command(BaseCommand):
    help = "Do'kon mahsulotlarini yaratadi/yangilaydi (idempotent)."

    def handle(self, *args, **options):
        created, updated = 0, 0
        for data in ITEMS:
            slug = data['slug']
            _, was_created = ShopItem.objects.update_or_create(slug=slug, defaults=data)
            if was_created:
                created += 1
            else:
                updated += 1
        self.stdout.write(self.style.SUCCESS(
            f"Do'kon tayyor: {created} ta yaratildi, {updated} ta yangilandi "
            f"(jami {ShopItem.objects.count()})."
        ))
