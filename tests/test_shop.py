"""Coin shop: purchases must be money-safe, and the redirect must not be hijackable."""
from django.test import TestCase

from shop import services
from shop.models import InventoryItem, Purchase, ShopItem

from .factories import make_shop_item, make_user


class PurchaseTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user(coins=500)
        self.item = make_shop_item(slug='title_bilimdon', price=200)

    def test_purchase_deducts_coins_and_grants_item(self):
        services.purchase_item(self.profile, self.item)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, 300)
        self.assertTrue(InventoryItem.objects.filter(profile=self.profile, item=self.item).exists())

    def test_purchase_is_recorded_in_the_ledger(self):
        services.purchase_item(self.profile, self.item)
        purchase = Purchase.objects.get(profile=self.profile)
        self.assertEqual(purchase.coins_spent, 200)
        self.assertEqual(purchase.item_name, self.item.name)

    def test_cannot_buy_the_same_cosmetic_twice(self):
        services.purchase_item(self.profile, self.item)
        with self.assertRaises(services.ShopError):
            services.purchase_item(self.profile, self.item)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, 300, "a blocked purchase must not charge again")

    def test_cannot_buy_without_enough_coins(self):
        expensive = make_shop_item(slug='frame_gold', price=10_000)
        with self.assertRaises(services.ShopError):
            services.purchase_item(self.profile, expensive)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, 500)

    def test_level_gate_blocks_purchase(self):
        locked = make_shop_item(slug='title_afsona', price=10, required_level=10)
        self.profile.level = 1
        self.profile.save()
        with self.assertRaises(services.ShopError):
            services.purchase_item(self.profile, locked)

    def test_consumables_stack_instead_of_being_blocked(self):
        freeze = make_shop_item(slug='streak_freeze', category=ShopItem.CATEGORY_CONSUMABLE,
                                price=100, is_consumable=True)
        services.purchase_item(self.profile, freeze)
        services.purchase_item(self.profile, freeze)
        inventory = InventoryItem.objects.get(profile=self.profile, item=freeze)
        self.assertEqual(inventory.quantity, 2)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, 300)


class EquipTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user(coins=1000)
        self.first = make_shop_item(slug='title_one', price=10)
        self.second = make_shop_item(slug='title_two', price=10)

    def test_equipping_one_cosmetic_unequips_the_other_in_that_category(self):
        services.purchase_item(self.profile, self.first)
        services.purchase_item(self.profile, self.second)
        services.equip_item(self.profile, self.first)
        services.equip_item(self.profile, self.second)

        equipped = InventoryItem.objects.filter(profile=self.profile, is_equipped=True)
        self.assertEqual(equipped.count(), 1)
        self.assertEqual(equipped.first().item, self.second)

    def test_cannot_equip_an_unowned_item(self):
        with self.assertRaises(services.ShopError):
            services.equip_item(self.profile, self.first)


class RedirectSafetyTests(TestCase):
    """A raw redirect(HTTP_REFERER) is an open redirect — an attacker could bounce users
    off-site after a real, authenticated action."""

    def setUp(self):
        self.user, self.profile = make_user(coins=500)
        make_shop_item(slug='title_bilimdon', price=200)
        self.client.force_login(self.user)

    def test_external_referer_is_not_followed(self):
        response = self.client.post('/shop/buy/title_bilimdon/',
                                    HTTP_REFERER='https://evil.example.com/phish')
        self.assertNotIn('evil.example.com', response['Location'])

    def test_internal_referer_is_followed(self):
        response = self.client.post('/shop/buy/title_bilimdon/',
                                    HTTP_REFERER='http://testserver/shop/')
        self.assertIn('/shop/', response['Location'])
