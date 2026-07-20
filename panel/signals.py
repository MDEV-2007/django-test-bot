from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver

from .middleware import get_current_user
from .models import AuditLog

# The content models whose lifecycle is logged. Keeping this list explicit (rather than
# auditing every model) avoids noise from Attempt/AttemptAnswer rows that students generate
# in bulk while taking tests — the audit trail is about admin/teacher content actions.
TRACKED = {}


def _register_tracked():
    from tests_app.models import TestSet, Subject, Question
    from learning.models import Lesson
    from games.models import Game
    return {
        TestSet: 'Test',
        Subject: 'Fan',
        Question: 'Savol',
        Lesson: 'Dars',
        Game: "O'yin",
    }


def _authed_user():
    user = get_current_user()
    if user is not None and getattr(user, 'is_authenticated', False):
        return user
    return None


def _field_snapshot(instance):
    data = {}
    for field in instance._meta.concrete_fields:
        if field.many_to_one:
            data[field.name] = field.value_from_object(instance)
        elif field.get_internal_type() in ('FileField', 'ImageField'):
            data[field.name] = str(field.value_from_object(instance))
        else:
            val = field.value_from_object(instance)
            # Keep the snapshot JSON-serialisable; fall back to str() for dates/decimals.
            try:
                import json
                json.dumps(val)
                data[field.name] = val
            except (TypeError, ValueError):
                data[field.name] = str(val)
    return data


@receiver(pre_save)
def _capture_pre_save(sender, instance, **kwargs):
    if sender not in _register_tracked():
        return
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    instance._audit_old = _field_snapshot(old)


@receiver(post_save)
def _log_save(sender, instance, created, **kwargs):
    tracked = _register_tracked()
    if sender not in tracked:
        return
    user = _authed_user()
    changes = {}
    if not created:
        old = getattr(instance, '_audit_old', None)
        if old is not None:
            new = _field_snapshot(instance)
            for key, new_val in new.items():
                if old.get(key) != new_val:
                    changes[key] = {'old': old.get(key), 'new': new_val}
            # Nothing actually changed (e.g. a re-save with identical data) — skip the noise.
            if not changes:
                return
    AuditLog.objects.create(
        user=user,
        action='create' if created else 'update',
        model_name=tracked[sender],
        object_id=str(instance.pk),
        object_repr=str(instance)[:300],
        changes=changes,
    )


@receiver(post_delete)
def _log_delete(sender, instance, **kwargs):
    tracked = _register_tracked()
    if sender not in tracked:
        return
    AuditLog.objects.create(
        user=_authed_user(),
        action='delete',
        model_name=tracked[sender],
        object_id=str(instance.pk),
        object_repr=str(instance)[:300],
        changes={},
    )
