import logging
from django.db import transaction
from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver

from core import background
from tests_app.models import TestSet
from tests_app.notifications import send_new_test_notifications

logger = logging.getLogger(__name__)


@receiver(post_save, sender=TestSet)
def on_test_set_saved(sender, instance, created, **kwargs):
    """When a test is created or updated with is_published=True."""
    if (
        instance.is_published
        and not instance.is_random
        and not instance.is_archived
        and instance.notified_at is None
    ):
        test_id = instance.id
        # Fire once transaction commits so that any atomic block is completed
        transaction.on_commit(lambda: background.submit(send_new_test_notifications, test_id))


@receiver(m2m_changed, sender=TestSet.questions.through)
def on_test_set_questions_changed(sender, instance, action, **kwargs):
    """When questions are attached to a TestSet that is already published."""
    if (
        action == 'post_add'
        and instance.is_published
        and not instance.is_random
        and not instance.is_archived
        and instance.notified_at is None
    ):
        test_id = instance.id
        transaction.on_commit(lambda: background.submit(send_new_test_notifications, test_id))
