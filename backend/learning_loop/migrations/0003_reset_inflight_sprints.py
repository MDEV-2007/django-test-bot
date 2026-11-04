from django.db import migrations


def reset_inflight_sprints(apps, schema_editor):
    """Deploy paytida sprint bosqichida turgan (server sessiyasisiz) sikllarni 1-bosqichga
    qaytaradi. Yangi qoida bo'yicha sprint natijasi faqat serverda tekshirilgan javoblardan
    hisoblanadi; eski klientda javob bergan o'quvchi aks holda "hammasi xato" bilan 3-bosqichga
    tushib qolardi. Mukofot berilmagan, faqat sprint qaytadan boshlanadi."""
    Loop = apps.get_model('learning_loop', 'DailyLearningLoop')
    Loop.objects.filter(current_stage='STAGE_2_SPRINT', sprint_session__isnull=True).update(
        current_stage='STAGE_1_WARMUP')


class Migration(migrations.Migration):

    dependencies = [
        ('learning_loop', '0002_loop_quiz_sessions'),
    ]

    operations = [
        migrations.RunPython(reset_inflight_sprints, migrations.RunPython.noop),
    ]
