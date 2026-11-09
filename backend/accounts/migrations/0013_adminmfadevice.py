import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_profile_exam_track_profile_region_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AdminMFADevice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('secret', models.CharField(max_length=128)),
                ('is_confirmed', models.BooleanField(db_index=True, default=False)),
                ('recovery_code_hashes', models.JSONField(blank=True, default=list)),
                ('last_used_timestep', models.BigIntegerField(default=0)),
                ('failed_attempts', models.PositiveIntegerField(default=0)),
                ('locked_until', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='admin_mfa_device', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Admin MFA Device',
                'verbose_name_plural': 'Admin MFA Devices',
            },
        ),
    ]
