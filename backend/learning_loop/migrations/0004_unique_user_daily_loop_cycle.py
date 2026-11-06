from django.db import migrations, models
from django.db.models import Count, Max


def deduplicate_daily_loops(apps, schema_editor):
    """Renumber any historical duplicate (user_id, date, cycle_number) rows without deleting data."""
    DailyLearningLoop = apps.get_model('learning_loop', 'DailyLearningLoop')
    dupes = (
        DailyLearningLoop.objects.values('user_id', 'date', 'cycle_number')
        .annotate(cnt=Count('id'))
        .filter(cnt__gt=1)
    )
    for group in dupes:
        user_id = group['user_id']
        day = group['date']
        cycle_num = group['cycle_number']
        rows = list(
            DailyLearningLoop.objects.filter(
                user_id=user_id, date=day, cycle_number=cycle_num,
            ).order_by('-is_chest_claimed', '-id')
        )
        # Keep the primary/newest row at cycle_num; shift any extras to unused cycle_numbers
        max_cycle = (
            DailyLearningLoop.objects.filter(user_id=user_id, date=day)
            .aggregate(m=Max('cycle_number'))['m']
            or cycle_num
        )
        for extra in rows[1:]:
            max_cycle += 1
            extra.cycle_number = max_cycle
            extra.save(update_fields=['cycle_number'])


class Migration(migrations.Migration):

    dependencies = [
        ('learning_loop', '0003_reset_inflight_sprints'),
    ]

    operations = [
        migrations.RunPython(deduplicate_daily_loops, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='dailylearningloop',
            constraint=models.UniqueConstraint(
                fields=('user', 'date', 'cycle_number'),
                name='unique_user_daily_loop_cycle',
            ),
        ),
    ]
