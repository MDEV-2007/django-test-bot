from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tests_app', '0029_testset_listening_audio'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(fields=['profile', 'test', 'is_completed'], name='tests_app_a_prof_test_comp_idx'),
        ),
        migrations.AddIndex(
            model_name='attempt',
            index=models.Index(fields=['test', 'is_completed'], name='tests_app_a_test_comp_idx'),
        ),
    ]
