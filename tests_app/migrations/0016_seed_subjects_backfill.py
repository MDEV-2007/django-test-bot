"""Seed the Milliy Sertifikat subjects and attach all existing (history) content to Tarix.

Everything created before multi-subject support was history, so every existing Topic,
Question and TestSet without a subject is backfilled to 'Tarix'. The three new subjects
(Ona tili, Matematika, Biologiya) start empty — teachers/admins add their content.
"""
from django.db import migrations
from django.utils.text import slugify


SUBJECTS = [
    ("Tarix", "book-open", "#f59e0b", 1),
    ("Ona tili", "pen-line", "#10b981", 2),
    ("Matematika", "calculator", "#2d6cff", 3),
    ("Biologiya", "leaf", "#22c55e", 4),
]


def seed(apps, schema_editor):
    Subject = apps.get_model('tests_app', 'Subject')
    Topic = apps.get_model('learning', 'Topic')
    Question = apps.get_model('tests_app', 'Question')
    TestSet = apps.get_model('tests_app', 'TestSet')

    by_name = {}
    for name, icon, color, order in SUBJECTS:
        obj, _ = Subject.objects.get_or_create(
            name=name,
            defaults={'slug': slugify(name), 'icon_name': icon, 'color': color, 'order': order},
        )
        # Ensure the new metadata is set even if the row already existed (e.g. Tarix).
        obj.icon_name = obj.icon_name or icon
        obj.color = color
        obj.order = order
        if not obj.slug:
            obj.slug = slugify(name)
        obj.save()
        by_name[name] = obj

    tarix = by_name["Tarix"]
    Topic.objects.filter(subject__isnull=True).update(subject=tarix)
    Question.objects.filter(subject__isnull=True).update(subject=tarix)
    TestSet.objects.filter(subject__isnull=True).update(subject=tarix)


def unseed(apps, schema_editor):
    # Only remove the newly added subjects; keep Tarix and any content links.
    Subject = apps.get_model('tests_app', 'Subject')
    Subject.objects.filter(name__in=["Ona tili", "Matematika", "Biologiya"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('tests_app', '0015_alter_subject_options_question_subject_subject_color_and_more'),
        ('learning', '0005_topic_subject'),
    ]
    operations = [migrations.RunPython(seed, unseed)]
