from django.db import migrations


def fix_mcq_to_single_choice(apps, schema_editor):
    Question = apps.get_model('tests_app', 'Question')
    Question.objects.filter(question_type='mcq').update(question_type='single_choice')


def reverse_fix(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('tests_app', '0032_examsurvey_featured_fields'),
    ]

    operations = [
        migrations.RunPython(fix_mcq_to_single_choice, reverse_fix),
    ]
