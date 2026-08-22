from django.db import migrations

PLAN_NAME = "12 oylik obuna — Video va Audio darslar"


def deactivate(apps, schema_editor):
    """Retires the 12-month lessons tier. Deactivated rather than deleted: Payment rows
    FK to SubscriptionPlan with on_delete=CASCADE, so deleting the plan would also wipe
    the payment history of anyone who already bought it."""
    SubscriptionPlan = apps.get_model('premium', 'SubscriptionPlan')
    SubscriptionPlan.objects.filter(name=PLAN_NAME).update(is_active=False)


def reactivate(apps, schema_editor):
    SubscriptionPlan = apps.get_model('premium', 'SubscriptionPlan')
    SubscriptionPlan.objects.filter(name=PLAN_NAME).update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ('premium', '0003_alter_payment_status'),
    ]

    operations = [
        migrations.RunPython(deactivate, reactivate),
    ]
