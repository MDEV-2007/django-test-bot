"""Reset XP and levels to 0 and 1 for all superadmins and teachers, and clear SubjectScores."""
from django.db import migrations
from django.db.models import Q
from django.core.cache import cache


def reset_privileged_xp(apps, schema_editor):
    Profile = apps.get_model('accounts', 'Profile')
    User = apps.get_model('auth', 'User')
    try:
        SubjectScore = apps.get_model('tests_app', 'SubjectScore')
    except LookupError:
        SubjectScore = None

    privileged_users = User.objects.filter(Q(is_superuser=True) | Q(is_staff=True)).values_list('id', flat=True)
    privileged_profiles = Profile.objects.filter(
        Q(role__in=['superadmin', 'teacher']) | Q(user_id__in=list(privileged_users))
    )

    privileged_profile_ids = list(privileged_profiles.values_list('id', flat=True))
    privileged_profiles.update(xp=0, level=1)

    if SubjectScore and privileged_profile_ids:
        SubjectScore.objects.filter(profile_id__in=privileged_profile_ids).update(xp=0)

    try:
        cache.clear()
    except Exception:
        pass


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [('accounts', '0010_clear_placeholder_telegram_username')]

    operations = [migrations.RunPython(reset_privileged_xp, noop)]
