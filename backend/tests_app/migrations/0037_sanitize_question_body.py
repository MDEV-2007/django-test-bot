"""Mavjud savol matnlarini bir marta tozalash.

Question.save() endi har saqlashda HTML'ni tozalaydi (core/html_sanitize.py), lekin bu
o'zgarishdan oldin saqlangan qatorlar tegilmay qolardi — ular orasida skript bo'lsa,
superadmin paneli uni baribir bajarardi.
"""
from django.db import migrations

from core.html_sanitize import sanitize_rich_html


def sanitize_existing_bodies(apps, schema_editor):
    Question = apps.get_model('tests_app', 'Question')
    for pk, body in Question.objects.values_list('pk', 'body').iterator():
        clean = sanitize_rich_html(body)
        if clean != body:
            Question.objects.filter(pk=pk).update(body=clean)


class Migration(migrations.Migration):

    dependencies = [
        ('tests_app', '0036_attempt_attestation_category_and_more'),
    ]

    operations = [
        migrations.RunPython(sanitize_existing_bodies, migrations.RunPython.noop),
    ]
