"""Fires the live Super Admin panel push (panel/realtime.py) for the two events an admin
should see immediately: a new payment awaiting review, and a new user registration.

Deliberately kept separate from signals.py (the AuditLog trail) — different purpose,
different models, and mixing them would make signals.py's already-generic post_save/
pre_save receivers harder to reason about.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from accounts.models import Profile
from premium.models import Payment

from .realtime import notify_admins


@receiver(post_save, sender=Profile)
def _notify_new_registration(sender, instance, created, **kwargs):
    if not created:
        return
    user = instance.user
    notify_admins(
        kind='new_user',
        title="Yangi foydalanuvchi",
        message=f"{user.get_full_name() or user.username} ro'yxatdan o'tdi.",
        url=f'/panel/users/{user.id}/',
    )


@receiver(pre_save, sender=Payment)
def _capture_old_payment_status(sender, instance, **kwargs):
    # Mirrors the AuditLog pre_save/post_save pair in panel/signals.py — a plain
    # post_save can't tell "just became pending" from "was already pending and got
    # re-saved" (e.g. an admin_note edit before the actual approve/reject decision).
    if not instance.pk:
        instance._old_status = None
        return
    try:
        instance._old_status = Payment.objects.get(pk=instance.pk).status
    except Payment.DoesNotExist:
        instance._old_status = None


@receiver(post_save, sender=Payment)
def _notify_pending_payment(sender, instance, created, **kwargs):
    if instance.status != 'pending':
        return
    old_status = getattr(instance, '_old_status', None)
    if not created and old_status == 'pending':
        return  # already notified when it first became pending; this is a later re-save
    user = instance.profile.user
    notify_admins(
        kind='payment',
        title="Yangi to'lov kutilmoqda",
        message=f"{user.get_full_name() or user.username} — {instance.plan.name} ({instance.amount:.0f} so'm)",
        url=f'/panel/payments/{instance.id}/',
    )
