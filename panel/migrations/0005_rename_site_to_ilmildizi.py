from django.db import migrations


def rename_site(apps, schema_editor):
    """One-time rebrand: any existing SiteSettings row still carrying the old
    'Ilm Mevasi' name (from the field's old default) is updated to 'Ilm Ildizi'.
    Idempotent — a site_name already customized to something else is left alone,
    and re-running this migration a second time is a no-op either way."""
    SiteSettings = apps.get_model('panel', 'SiteSettings')
    SiteSettings.objects.filter(site_name='Ilm Mevasi').update(site_name='Ilm Ildizi')


def revert_rename(apps, schema_editor):
    SiteSettings = apps.get_model('panel', 'SiteSettings')
    SiteSettings.objects.filter(site_name='Ilm Ildizi').update(site_name='Ilm Mevasi')


class Migration(migrations.Migration):

    dependencies = [
        ('panel', '0004_alter_sitesettings_site_name_and_more'),
    ]

    operations = [
        migrations.RunPython(rename_site, revert_rename),
    ]
