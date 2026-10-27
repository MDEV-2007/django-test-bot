from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tests_app', '0033_fix_mcq_to_single_choice'),
    ]

    operations = [
        migrations.AddField(
            model_name='testset',
            name='price',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Test narxi (so'mda). Bo'sh bo'lsa, umumiy mock test obuna rejasi narxi ishlatiladi.",
                max_digits=10,
                null=True,
            ),
        ),
    ]
