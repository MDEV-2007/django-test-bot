"""Domain logic for the daily channel "qiyin savol" post — kept out of the management
command so it's unit-testable without hitting the Telegram API.
"""
from tests_app.models import Question

from .models import DailyChannelPost


def pick_daily_question():
    """Pick one not-yet-posted hard question, random among ties. Returns None if every
    hard question has already been posted (caller must handle — this must never crash
    the daily job)."""
    already_posted_ids = DailyChannelPost.objects.exclude(question=None).values_list('question_id', flat=True)
    candidates = (Question.objects
                  .filter(difficulty='hard')
                  .exclude(id__in=already_posted_ids)
                  .select_related('subject'))
    return candidates.order_by('?').first()
