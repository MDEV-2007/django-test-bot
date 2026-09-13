from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tests_app', '0028_mockattemptresult'),
    ]

    operations = [
        migrations.AddField(
            model_name='testset',
            name='listening_audio',
            field=models.FileField(
                blank=True,
                help_text="Butun imtihon uchun umumiy to'liq Listening audio fayli (Super admin yuklashi mumkin).",
                null=True,
                upload_to='cefr/audio/%Y/%m/',
            ),
        ),
    ]
