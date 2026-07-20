from django.db import migrations


def backfill(apps, schema_editor):
    """Give existing Django superusers the explicit 'superadmin' role so they show up
    correctly in the panel's user/role views (their panel access already works via the
    is_superuser fallback, but the role label should agree)."""
    Profile = apps.get_model('accounts', 'Profile')
    User = apps.get_model('auth', 'User')
    superuser_ids = User.objects.filter(is_superuser=True).values_list('id', flat=True)
    Profile.objects.filter(user_id__in=list(superuser_ids)).update(role='superadmin')


def reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_profile_role'),
    ]

    operations = [
        migrations.RunPython(backfill, reverse),
    ]
