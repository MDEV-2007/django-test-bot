# Generated for Reels Video, Custom Image on CommunityPost, and Threaded Replies
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0010_community_feed'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='reel',
            name='media_type',
            field=models.CharField(
                choices=[('text', 'Interaktiv Matn & Savol'), ('video', 'Video Reel')],
                default='text',
                help_text="Reel formati: matnli interaktiv kvest yoki to'liq vertikal video",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='reel',
            name='video_url',
            field=models.URLField(
                blank=True,
                default='',
                help_text="MP4 video yoki streaming havolasi",
                max_length=500,
            ),
        ),
        migrations.AddField(
            model_name='reel',
            name='video_file',
            field=models.FileField(
                blank=True,
                help_text="Yuklangan video fayli",
                null=True,
                upload_to='reels_videos/',
            ),
        ),
        migrations.AddField(
            model_name='reelcomment',
            name='parent',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='replies',
                to='learning.reelcomment',
            ),
        ),
        migrations.AddField(
            model_name='communitypost',
            name='custom_image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='community_posts/',
            ),
        ),
        migrations.AddField(
            model_name='communitypostcomment',
            name='parent',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='replies',
                to='learning.communitypostcomment',
            ),
        ),
    ]
