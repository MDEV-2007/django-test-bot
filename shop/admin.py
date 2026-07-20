from django.contrib import admin

from .models import InventoryItem, Purchase, ShopItem


@admin.register(ShopItem)
class ShopItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price_coins', 'rarity', 'is_consumable', 'required_level', 'is_active', 'order')
    list_filter = ('category', 'rarity', 'is_active', 'is_consumable')
    list_editable = ('price_coins', 'is_active', 'order')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('profile', 'item', 'quantity', 'is_equipped', 'acquired_at')
    list_filter = ('is_equipped', 'item__category')
    search_fields = ('profile__user__username', 'item__name')
    autocomplete_fields = ('profile', 'item')


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('profile', 'item_name', 'coins_spent', 'quantity', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('profile__user__username', 'item_name')
    date_hierarchy = 'created_at'
