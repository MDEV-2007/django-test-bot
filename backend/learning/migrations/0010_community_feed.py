# Generated for CommunityPost, CommunityPostReaction, CommunityPostComment
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0009_reelcomment'),
        ('tests_app', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CommunityPost',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('post_type', models.CharField(choices=[('test_result', 'Test Natijasi'), ('certificate', 'Milliy Sertifikat'), ('achievement', 'Yutuq')], default='test_result', max_length=20)),
                ('title', models.CharField(max_length=255)),
                ('subject_name', models.CharField(default='Asosiy', max_length=100)),
                ('subject_slug', models.CharField(default='tarix', max_length=50)),
                ('score', models.FloatField(blank=True, null=True)),
                ('grade', models.CharField(blank=True, max_length=30)),
                ('correct_count', models.IntegerField(default=0)),
                ('total_questions', models.IntegerField(default=0)),
                ('caption', models.TextField(blank=True, max_length=1000)),
                ('image_url', models.CharField(blank=True, max_length=500)),
                ('likes_count', models.PositiveIntegerField(default=0)),
                ('comments_count', models.PositiveIntegerField(default=0)),
                ('is_pinned', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('attempt', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='community_posts', to='tests_app.attempt')),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='community_posts', to=settings.AUTH_USER_MODEL)),
                ('test', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='community_posts', to='tests_app.testset')),
            ],
            options={
                'verbose_name': 'Hamjamiyat Posti',
                'verbose_name_plural': 'Hamjamiyat Postlari',
                'ordering': ['-is_pinned', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='CommunityPostComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField(max_length=1000)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='learning.communitypost')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='community_comments', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Post Izohi',
                'verbose_name_plural': 'Post Izohlari',
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='CommunityPostReaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reaction_type', models.CharField(choices=[('fire', 'Olov'), ('clap', 'Qarsak'), ('trophy', 'Kubok'), ('heart', 'Yurak')], default='fire', max_length=15)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('post', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reactions', to='learning.communitypost')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='post_reactions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Post Reaksiyasi',
                'verbose_name_plural': 'Post Reaksiyalari',
                'unique_together': {('post', 'user')},
            },
        ),
    ]
