from django.db import migrations


def backfill(apps, schema_editor):
    """Every TestSet that already existed before the panel feature must count as published,
    or it would silently disappear from the student catalog (which now also filters on
    is_published). Ownership is assigned to the first superuser so the Super Admin panel
    shows a sensible 'created_by' rather than blank."""
    TestSet = apps.get_model('tests_app', 'TestSet')
    User = apps.get_model('auth', 'User')
    owner = User.objects.filter(is_superuser=True).order_by('id').first()
    TestSet.objects.filter(is_published=False, is_archived=False).update(is_published=True)
    if owner is not None:
        TestSet.objects.filter(created_by__isnull=True).update(created_by=owner)


def reverse(apps, schema_editor):
    # Non-destructive: leave the backfilled values in place on reverse.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('tests_app', '0011_testset_created_by_testset_is_published_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, reverse),
    ]
