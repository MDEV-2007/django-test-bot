"""Small object builders for the test suite.

Deliberately plain functions rather than a factory library — the suite has no external
test dependencies, so `manage.py test` works on a fresh checkout.
"""
from django.contrib.auth.models import User

from accounts.models import ensure_profile_for_user
from learning.models import Topic
from shop.models import ShopItem
from tests_app.models import AnswerOption, Attempt, AttemptAnswer, Question, Subject, TestSet


def make_user(username='student', **profile_kwargs):
    user = User.objects.create_user(username=username, password='pw-for-tests-1234')
    profile = ensure_profile_for_user(user)
    for key, value in profile_kwargs.items():
        setattr(profile, key, value)
    if profile_kwargs:
        profile.save()
    return user, profile


def make_subject(name='Tarix', slug='tarix'):
    """get_or_create, because some views (the test centre's seed-on-first-visit) create
    a default subject themselves — a plain create() would hit the unique slug constraint."""
    subject, _ = Subject.objects.get_or_create(slug=slug, defaults={'name': name})
    return subject


def make_topic(subject=None, title='O\'rta asrlar'):
    slug = title.lower().replace(' ', '-').replace("'", '')
    topic, _ = Topic.objects.get_or_create(slug=slug, defaults={'title': title, 'subject': subject})
    return topic


def make_question(subject=None, topic=None, body='2+2 nechchi?', correct='4', wrong='5'):
    """A single-choice question with one correct and one wrong option."""
    question = Question.objects.create(
        body=body, subject=subject, topic=topic, question_type='single_choice',
    )
    AnswerOption.objects.create(question=question, text=correct, is_correct=True)
    AnswerOption.objects.create(question=question, text=wrong, is_correct=False)
    return question


def make_test_set(subject=None, questions=(), title='Sinov testi'):
    test_set = TestSet.objects.create(
        title=title, subject=subject, duration_minutes=10,
        is_premium=False, is_published=True,
    )
    if questions:
        test_set.questions.set(questions)
    return test_set


def make_attempt(profile, test_set, questions):
    attempt = Attempt.objects.create(profile=profile, test=test_set)
    for question in questions:
        AttemptAnswer.objects.create(attempt=attempt, question=question)
    return attempt


def make_shop_item(slug='title_test', category=ShopItem.CATEGORY_TITLE, price=100, **kwargs):
    defaults = dict(
        name=slug.replace('_', ' ').title(), category=category, price_coins=price,
        payload={}, is_active=True,
    )
    defaults.update(kwargs)
    return ShopItem.objects.create(slug=slug, **defaults)


def make_freeze_item(price=150):
    return make_shop_item(
        slug='streak_freeze', category=ShopItem.CATEGORY_CONSUMABLE,
        price=price, is_consumable=True,
    )
