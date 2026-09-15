# Generated for ReelComment
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0008_reel'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReelComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(max_length=1000)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reel', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='learning.reel')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reel_comments', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Reel Izohi',
                'verbose_name_plural': 'Reel Izohlari',
                'ordering': ['-created_at'],
            },
        ),
    ]
