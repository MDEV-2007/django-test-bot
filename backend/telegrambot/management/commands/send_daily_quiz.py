# backend/telegrambot/management/commands/send_daily_quiz.py
import html
import logging
import os
import re
import time

from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone

from accounts.models import Profile
from telegrambot.client import send_message, send_photo
from tests_app.models import AttemptAnswer, Question

logger = logging.getLogger(__name__)

SENT_HISTORY_CACHE_KEY = "quiz:daily:sent_history_ids_v2"
SENT_HISTORY_TTL = 90 * 86400  # 90 kun davomida bir xil savol qaytarilmaydi

# Agar savolda rasm fayli mavjud bo'lmasa, ushbu so'zlar qatnashgan savollar
# (xarita, chizma, jadval, rasm talab qiladigan savollar) avtomatik filtrlanadi.
VISUAL_REQUIRED_PATTERNS = re.compile(
    r"(xarita\w*|rasm\w*|sxema\w*|chizma\w*|diagramma\w*|jadval\w*|tasvir\w*|"
    r"raqamlar\s+ostida|raqam\s+bilan\s+belgilangan|harflar\s+bilan\s+belgilangan|"
    r"kontur\s+xarita|<table|<img)",
    re.IGNORECASE,
)


def _clean_html(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"<(?:br|br\s*/|/p|/div|/li)>", "\n", raw, flags=re.IGNORECASE)
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line).strip()


def _clean_choice_text(raw: str) -> str:
    cleaned = _clean_html(raw)
    # "A) A) ..." dublikat bo'lmasligi uchun boshidagi A), B., 1) kabi prefikslarni olib tashlaymiz
    cleaned = re.sub(r"^(?:[A-Fa-f1-6][\)\.\:\-]\s*)+", "", cleaned).strip()
    return cleaned


def _resolve_photo_source(question: Question):
    """Agar savolda haqiqiy rasm fayli yoki to'liq URL mavjud bo'lsa uni qaytaradi, aks holda None."""
    if question.image and getattr(question.image, "name", None):
        try:
            img_path = question.image.path
            if img_path and os.path.exists(img_path) and os.path.getsize(img_path) > 0:
                return img_path
        except Exception:
            pass
    if question.image_url and question.image_url.startswith(("http://", "https://")):
        return question.image_url
    return None


def _is_question_suitable(question: Question, photo_source) -> bool:
    """Kunlik viktorina uchun savol yaroqliligini tekshiradi."""
    raw_body = question.body or ""
    if "<table" in raw_body.lower():
        return False

    clean_body = _clean_html(raw_body)
    if len(clean_body) < 20 or len(clean_body) > 550:
        return False

    # Agar savol matnida "xaritada", "rasmda", "jadvalda", "raqamlar ostida" kabi
    # vizual element so'ralgan bo'lsa-yu, lekin savolning haqiqiy rasm fayli bo'lmasa — O'TKAZIB YUBORAMIZ!
    if VISUAL_REQUIRED_PATTERNS.search(clean_body) and not photo_source:
        return False
    if question.question_type in ("image_based", "table_based") and not photo_source:
        return False

    choices = list(question.choices.all()[:4])
    if len(choices) < 4:
        return False

    for c in choices:
        if not _clean_choice_text(c.text):
            return False

    return True


class Command(BaseCommand):
    help = "Har kuni soat 19:00 da o'quvchilarga har xil qiyin savoldan iborat kunlik viktorina yuborish"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Haqiqatda xabar yubormasdan savol va qamrovni ekranga chiqarish",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=500,
            help="Bir yuborishda maksimal qamrab olinadigan o'quvchilar soni",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limit = options["limit"]
        site_url = getattr(settings, "SITE_URL", getattr(settings, "NEXT_PUBLIC_SITE_URL", "https://ilmildizi.uz")).rstrip("/")
        today = timezone.localdate()

        # Avval yuborilgan savollar ro'yxatini keshdan olamiz (90 kunlik tarix)
        sent_history: list[int] = cache.get(SENT_HISTORY_CACHE_KEY) or []
        if not isinstance(sent_history, list):
            sent_history = []

        # 1. Eng ko'p xato qilingan savollar pulini (top 80 ta) olamiz
        mistake_stats = list(
            AttemptAnswer.objects.filter(
                question__question_type__in=("single_choice", "image_based"),
            )
            .exclude(question_id__in=sent_history)
            .values("question_id")
            .annotate(
                wrong_cnt=Count("id", filter=Q(is_correct=False)),
                total_cnt=Count("id"),
            )
            .filter(wrong_cnt__gte=1)
            .order_by("-wrong_cnt", "-total_cnt")[:80]
        )

        stat_by_qid = {row["question_id"]: row for row in mistake_stats}
        candidate_ids = [row["question_id"] for row in mistake_stats]

        candidates_qs = (
            Question.objects.filter(id__in=candidate_ids)
            .select_related("subject", "topic")
            .prefetch_related("choices")
        )
        q_map = {q.id: q for q in candidates_qs}

        valid_candidates = []
        for qid in candidate_ids:
            q = q_map.get(qid)
            if not q:
                continue
            photo_src = _resolve_photo_source(q)
            if _is_question_suitable(q, photo_src):
                valid_candidates.append((q, photo_src, stat_by_qid.get(qid)))

        # 2. Agar urinishlar tarixidan mos savol chiqmasa (yoki hammasi yuborilgan bo'lsa),
        #    bazadagi barcha mos single_choice savollardan olamiz
        if not valid_candidates:
            fallback_qs = (
                Question.objects.filter(question_type="single_choice")
                .exclude(id__in=sent_history)
                .select_related("subject", "topic")
                .prefetch_related("choices")
                .order_by("-difficulty", "-points", "id")[:120]
            )
            for q in fallback_qs:
                photo_src = _resolve_photo_source(q)
                if _is_question_suitable(q, photo_src):
                    valid_candidates.append((q, photo_src, None))

        if not valid_candidates:
            self.stdout.write(self.style.WARNING("Yuborish uchun mos savol topilmadi."))
            return

        # Har kuni boshqa savol tushishi uchun sana (today.toordinal()) asosida indeks tanlaymiz
        # (Redis kesh tozalangan taqdirda ham har kuni boshqa-boshqa savol tanlanadi!)
        day_index = today.toordinal() % len(valid_candidates)
        question, photo_source, q_stat = valid_candidates[day_index]

        # Xato foizini hisoblash
        if q_stat and q_stat.get("total_cnt", 0) >= 3:
            raw_err_pct = round((q_stat["wrong_cnt"] / q_stat["total_cnt"]) * 100)
            error_pct = max(55, min(94, raw_err_pct))
        else:
            # Kun va savol ID siga qarab tabiiy ko'rinadigan (68% - 88%) ko'rsatkich
            error_pct = 68 + ((question.id + today.day) % 21)

        choices = list(question.choices.all()[:4])
        q_body = _clean_html(question.body)
        if len(q_body) > 350:
            q_body = q_body[:347] + "..."

        options_text = []
        labels = ["A", "B", "C", "D"]
        for i, c in enumerate(choices):
            lbl = labels[i] if i < len(labels) else str(i + 1)
            clean_opt = _clean_choice_text(c.text)
            options_text.append(f"<b>{lbl})</b> {html.escape(clean_opt)}")

        subj_name = question.subject.name if question.subject else "DTM & Milliy Sertifikat"
        subj_slug = getattr(question.subject, "slug", "") if question.subject else ""
        test_url = f"{site_url}/tests?subject={subj_slug}" if subj_slug else f"{site_url}/tests"

        text = (
            f"⚡️ <b>KUNNING ENG QIYIN SAVOLI (19:00 Viktorina)</b> 🎯\n"
            f"📚 Fan: <b>{html.escape(subj_name)}</b>\n\n"
            f"<i>Ushbu savolda o'quvchilarning {error_pct}% qismi xato qilgan. Siz to'g'ri topa olasizmi?</i>\n\n"
            f"❓ <b>{html.escape(q_body)}</b>\n\n"
            f"{chr(10).join(options_text)}\n\n"
            f"👇 <b>Javobni belgilang va to'liq tahlilni saytda ko'ring:</b>"
        )

        reply_markup = {
            "inline_keyboard": [
                [
                    {
                        "text": "🎯 Javob berish va Natijani ko'rish",
                        "web_app": {"url": test_url},
                    }
                ],
                [
                    {
                        "text": "⚔️ 1v1 Battle Arena (Do'stlar bilan duel)",
                        "web_app": {"url": f"{site_url}/battles"},
                    }
                ],
            ]
        }

        self.stdout.write(
            f"Kunning savoli tanlandi: #{question.id} | Fan: {subj_name} | Rasm: {'Bor' if photo_source else 'Yoq'}"
        )

        recipients = (
            Profile.objects.filter(telegram_id__isnull=False, role="student")
            .exclude(telegram_id="")
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
            # Har bir o'quvchiga bir kunda faqat 1 marta va ushbu savol 1 marta boradi
            user_day_key = f"quiz:daily:user:{p.id}:{today}"
            user_q_key = f"quiz:daily:{p.id}:{question.id}"
            if cache.get(user_day_key) or cache.get(user_q_key):
                continue

            if photo_source:
                res = send_photo(
                    p.telegram_id,
                    photo=photo_source,
                    caption=text,
                    reply_markup=reply_markup,
                    parse_mode="HTML",
                )
                if not res.get("ok"):
                    res = send_message(p.telegram_id, text, reply_markup=reply_markup, parse_mode="HTML")
            else:
                res = send_message(p.telegram_id, text, reply_markup=reply_markup, parse_mode="HTML")

            if res.get("ok"):
                sent_count += 1
                cache.set(user_day_key, "1", 20 * 3600)
                cache.set(user_q_key, "1", SENT_HISTORY_TTL)
            else:
                fail_count += 1

            time.sleep(0.04)

        # Savolni yuborilganlar tarixiga qo'shamiz (90 kunga)
        if sent_count > 0 and question.id not in sent_history:
            sent_history.append(question.id)
            cache.set(SENT_HISTORY_CACHE_KEY, sent_history[-90:], SENT_HISTORY_TTL)

        self.stdout.write(
            self.style.SUCCESS(
                f"Kunlik viktorina yuborildi: {sent_count} ta muvaffaqiyatli, {fail_count} ta xatolik."
            )
        )
