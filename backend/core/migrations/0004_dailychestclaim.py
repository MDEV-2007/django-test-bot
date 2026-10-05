# Generated for DailyChestClaim
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_profile_profile_xp_desc_idx'),
        ('core', '0003_streakreminderlog'),
    ]

    operations = [
        migrations.CreateModel(
            name='DailyChestClaim',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True, default=django.utils.timezone.localdate)),
                ('reward_type', models.CharField(max_length=50)),
                ('reward_amount', models.PositiveIntegerField(default=0)),
                ('reward_title', models.CharField(blank=True, max_length=150)),
                ('rarity', models.CharField(choices=[('common', 'Oddiy'), ('rare', 'Noyob'), ('epic', 'Epik'), ('legendary', 'Afsonaviy')], default='common', max_length=20)),
                ('streak_at_claim', models.PositiveIntegerField(default=0)),
                ('streak_bonus_pct', models.PositiveIntegerField(default=0)),
                ('claimed_at', models.DateTimeField(auto_now_add=True)),
                ('profile', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='daily_chest_claims', to='accounts.profile')),
            ],
            options={
                'ordering': ['-claimed_at'],
                'unique_together': {('profile', 'date')},
            },
        ),
    ]
