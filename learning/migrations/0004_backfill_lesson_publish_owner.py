from django.db import migrations


def backfill(apps, schema_editor):
    """Existing lessons must stay visible to students, so mark them published; assign the
    first superuser as owner for a sensible Super Admin 'created_by' column."""
    Lesson = apps.get_model('learning', 'Lesson')
    User = apps.get_model('auth', 'User')
    owner = User.objects.filter(is_superuser=True).order_by('id').first()
    Lesson.objects.filter(is_published=False).update(is_published=True)
    if owner is not None:
        Lesson.objects.filter(created_by__isnull=True).update(created_by=owner)


def reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0003_lesson_created_by_lesson_is_published_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, reverse),
    ]
