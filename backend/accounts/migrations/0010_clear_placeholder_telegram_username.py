"""`telegram_username` maydonidagi `tg_<id>` qiymatlarini tozalaydi.

Ilgari Mini App orqali kirishda Telegram @nom bermasa, uning o'rniga Django ichki nomi
(`tg_123456`) yozilar edi. Natijada panelda foydalanuvchining Telegram nomi o'rniga shu
raqam ko'rinardi. Endi bunday hollarda maydon bo'sh qoldiriladi, mavjud yozuvlarni ham
shu holatga keltiramiz.
"""
from django.db import migrations


def clear_placeholders(apps, schema_editor):
    Profile = apps.get_model('accounts', 'Profile')
    Profile.objects.filter(telegram_username__startswith='tg_').update(telegram_username='')


def noop(apps, schema_editor):
    """Orqaga qaytarish qiymatlarni tiklamaydi — ular allaqachon ma'lumot emas edi."""


class Migration(migrations.Migration):

    dependencies = [('accounts', '0009_profile_last_seen_at')]

    operations = [migrations.RunPython(clear_placeholders, noop)]
