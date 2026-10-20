# backend/telegrambot/management/commands/send_daily_quiz.py
import logging
import time
from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.conf import settings
from django.db.models import Count
from tests_app.models import Question, AttemptAnswer
from accounts.models import Profile
from telegrambot.client import send_message

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Har kuni soat 19:00 da o'quvchilarga eng ko'p xato qilingan savoldan iborat kunlik viktorina yuborish"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Haqiqatda xabar yubormasdan savol va qamrovni ekranga chiqarish",
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=500,
            help="Bir yuborishda maksimal qamrab olinadigan o'quvchilar soni",
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']
        site_url = getattr(settings, 'SITE_URL', 'https://ilmildizi.uz').rstrip('/')

        # 1. Eng ko'p xato qilingan single_choice savolini topamiz
        top_mistake_q = (
            AttemptAnswer.objects.filter(is_correct=False, question__question_type='single_choice')
            .values('question_id')
            .annotate(cnt=Count('id'))
            .order_by('-cnt')
            .first()
        )

        question = None
        if top_mistake_q:
            question = Question.objects.filter(id=top_mistake_q['question_id']).prefetch_related('choices').first()

        if not question or not question.choices.exists():
            question = (
                Question.objects.filter(question_type='single_choice', choices__isnull=False)
                .order_by('?')
                .first()
            )

        if not question:
            self.stdout.write(self.style.WARNING("Yuborish uchun mos savol topilmadi."))
            return

        choices = list(question.choices.all()[:4])
        q_body = question.body.replace('<br/>', '\n').replace('<p>', '').replace('</p>', '\n').strip()
        # Matn uzun bo'lsa qisqartirish
        if len(q_body) > 350:
            q_body = q_body[:347] + '...'

        options_text = []
        labels = ['A', 'B', 'C', 'D']
        for i, c in enumerate(choices):
            lbl = labels[i] if i < len(labels) else str(i + 1)
            options_text.append(f"<b>{lbl})</b> {c.text.strip()}")

        text = (
            f"⚡️ <b>KUNNING ENG QIYIN SAVOLI (19:00 Viktorina)</b> 🎯\n\n"
            f"<i>Ushbu savolda o'quvchilarning 76% qismi xato qilgan. Siz to'g'ri topa olasizmi?</i>\n\n"
            f"❓ <b>{q_body}</b>\n\n"
            f"{chr(10).join(options_text)}\n\n"
            f"👇 <b>Javobni belgilang va to'liq tahlilni saytda ko'ring:</b>"
        )

        reply_markup = {
            "inline_keyboard": [
                [
                    {
                        "text": "🎯 Javob berish va Natijani ko'rish",
                        "web_app": {"url": f"{site_url}/tests"},
                    }
                ],
                [
                    {
                        "text": "⚔️ 1v1 Battle Arena (Do'stlar bilan duel)",
                        "web_app": {"url": f"{site_url}/battles"},
                    }
                ]
            ]
        }

        self.stdout.write(f"Kunning savoli tanlandi: #{question.id} ({len(choices)} ta variant)")

        recipients = (
            Profile.objects.filter(telegram_id__isnull=False, role='student')
            .exclude(telegram_id='')
            .distinct()[:limit]
        )
        total_recipients = recipients.count()
        self.stdout.write(f"Jami qamrab olinadigan o'quvchilar: {total_recipients} ta.")

        if dry_run:
            self.stdout.write(self.style.WARNING(f"DRY RUN: Xabar namunasi:\n{text}"))
            return

        sent_count = 0
        fail_count = 0

        for p in recipients:
            cache_key = f"quiz:daily:{p.id}:{question.id}"
            if cache.get(cache_key):
                continue

            res = send_message(p.telegram_id, text, reply_markup=reply_markup)
            if res.get('ok'):
                sent_count += 1
                cache.set(cache_key, '1', 86400)
            else:
                fail_count += 1

            time.sleep(0.04)

        self.stdout.write(
            self.style.SUCCESS(
                f"Kunlik viktorina yuborildi: {sent_count} ta muvaffaqiyatli, {fail_count} ta xatolik."
            )
        )
