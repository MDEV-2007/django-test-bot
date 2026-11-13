# Ma'lumotni to'ldirish 0017 dan alohida: Postgres bir tranzaksiyada ALTER/CREATE INDEX
# va shu jadvalga UPDATE ni birga bajarmaydi ("pending trigger events").
from django.db import migrations


LEAGUE_MIN_XP = [(5, 10000), (4, 5000), (3, 2500), (2, 1000)]


def backfill(apps, schema_editor):
    """Liga darajasi hozirgi XP'dan (hech kim tushib ketmasin), taxminiy DTM esa eng so'nggi
    haqiqiy bashoratdan; bashorati yo'qlarda None (eski +0.2 lik soxta bal o'chiriladi)."""
    Profile = apps.get_model('accounts', 'Profile')
    ScorePrediction = apps.get_model('analytics', 'ScorePrediction')
    Profile.objects.update(estimated_dtm_score=None)
    for level, min_xp in LEAGUE_MIN_XP:
        Profile.objects.filter(xp__gte=min_xp, league_tier=1).update(league_tier=level)
    latest = {}
    for pid, dtm in ScorePrediction.objects.order_by('profile_id', '-calculated_at').values_list('profile_id', 'predicted_dtm'):
        latest.setdefault(pid, dtm)
    for pid, dtm in latest.items():
        Profile.objects.filter(pk=pid).update(estimated_dtm_score=float(dtm))



class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0017_weekly_league_and_real_dtm'),
        ('analytics', '0003_signup_source'),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
