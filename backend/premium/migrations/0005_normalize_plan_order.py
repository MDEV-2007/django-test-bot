from django.db import migrations

# Existing rows kept the `order` they were first created with, so after the 6-month tier was
# added both it and the mock-test plan sat at order=2 and the tie fell to price — which split
# the two lessons tiers apart on the pricing page. Normalize so the lessons tiers are adjacent
# (cheapest first) and the one-off mock-test plan comes last.
ORDER_BY_NAME = {
    "Oylik obuna — Video va Audio darslar": 1,
    "6 oylik obuna — Video va Audio darslar": 2,
    "Mock Test Tizimi — Bir martalik": 3,
}


def normalize(apps, schema_editor):
    SubscriptionPlan = apps.get_model('premium', 'SubscriptionPlan')
    for name, order in ORDER_BY_NAME.items():
        SubscriptionPlan.objects.filter(name=name).update(order=order)


def noop(apps, schema_editor):
    """Previous ordering was an accident of creation time, so there is nothing meaningful
    to restore — reversing this migration simply leaves the normalized values in place."""


class Migration(migrations.Migration):

    dependencies = [
        ('premium', '0004_deactivate_12_month_plan'),
    ]

    operations = [
        migrations.RunPython(normalize, noop),
    ]
