from django.db import migrations


def set_premium_unlock_one_time(apps, schema_editor):
    ShopItem = apps.get_model('shop', 'ShopItem')
    ShopItem.objects.filter(slug='premium_test_unlock').update(
        price_coins=100,
        is_consumable=False,
        name='Premium Test Unlock',
        description="Tangalar bilan barcha premium mock testlarga kirishni oching (bir martalik xarid)!"
    )


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0002_streakfreezelog'),
    ]

    operations = [
        migrations.RunPython(set_premium_unlock_one_time, reverse_func),
    ]
