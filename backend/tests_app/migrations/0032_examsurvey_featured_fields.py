import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tests_app', '0031_rename_tests_app_a_prof_test_comp_idx_tests_app_a_profile_03774e_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='examsurvey',
            name='author_name',
            field=models.CharField(blank=True, default='', help_text='Sharh muallifi ismi', max_length=150),
        ),
        migrations.AddField(
            model_name='examsurvey',
            name='custom_role',
            field=models.CharField(blank=True, default='', help_text="Masalan: 'Toshkent Davlat Yuridik Universiteti talabasi'", max_length=150),
        ),
        migrations.AddField(
            model_name='examsurvey',
            name='featured_badge',
            field=models.CharField(blank=True, default='', help_text="Masalan: 'Ona tili A+ (92 ball)'", max_length=100),
        ),
        migrations.AddField(
            model_name='examsurvey',
            name='is_featured',
            field=models.BooleanField(db_index=True, default=False, help_text='Landing sahifasiga chiqarilgan sharh'),
        ),
        migrations.AlterField(
            model_name='examsurvey',
            name='test',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='surveys', to='tests_app.testset'),
        ),
        migrations.AlterField(
            model_name='examsurvey',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='exam_surveys', to=settings.AUTH_USER_MODEL),
        ),
    ]
