"""All existing built-in game content (timeline events, map challenges, characters) was
history, so attach it to the Tarix subject. New subjects start with no game content until
it's added."""
from django.db import migrations


def backfill(apps, schema_editor):
    Subject = apps.get_model('tests_app', 'Subject')
    tarix = Subject.objects.filter(name='Tarix').first()
    if not tarix:
        return
    for model_name in ('HistoricalEvent', 'MapChallenge', 'HistoricalCharacter'):
        Model = apps.get_model('games', model_name)
        Model.objects.filter(subject__isnull=True).update(subject=tarix)


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0004_historicalcharacter_subject_historicalevent_subject_and_more'),
        ('tests_app', '0016_seed_subjects_backfill'),
    ]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
