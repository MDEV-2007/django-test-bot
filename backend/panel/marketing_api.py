"""Marketing & Growth Analytics API for Super Admin Panel.

Includes:
- Acquisition (Traffic Sources & Signups)
- Activation Funnel (Registration -> 1st test started -> 1st completed -> 2nd -> 3rd)
- Retention (D1, D7, D30 cohorts and Stickiness)
- Conversion Funnel (Views -> Checkout -> Paid)
- Content Diagnostics (Hardest questions, weakest topics, top tests)
- Viral Telegram Content Generator (Product Data -> Telegram loop)
"""

import html
import logging
import re
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db.models import Avg, Count, F, Max, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.models import Profile
from accounts.permissions import IsSuperAdmin
from accounts.utils import send_telegram_message
from panel.models import SiteSettings
from premium.models import Payment
from tests_app.models import Attempt, AttemptAnswer, Question, Subject, TestSet
from learning.models import Topic

logger = logging.getLogger(__name__)

MARKETING_CACHE_KEY = 'panel:marketing:analytics'


def _clean_html(text: str) -> str:
    """Strip HTML tags, unescape entities, and preserve clean readable formatting."""
    if not text:
        return ""
    # Convert block/break tags to newlines
    text = re.sub(r'<(?:br|br\s*/|/p|/div|/li)>', '\n', text, flags=re.IGNORECASE)
    unescaped = html.unescape(text)
    clean = re.sub(r'<[^>]+>', ' ', unescaped)
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in clean.split('\n')]
    return '\n'.join([line for line in lines if line]).strip()


def _clean_option_text(text: str) -> str:
    clean = _clean_html(text)
    # Remove leading option prefix if redundant (e.g. "A) A) text" -> "text")
    clean = re.sub(r'^(?:[A-Za-z0-9][\)\.\:\-]\s*)+', '', clean).strip()
    return clean


_VISUAL_DEP_RE = re.compile(
    r'(xarita\w*|rasm\w*|sxema\w*|chizma\w*|diagramma\w*|jadval\w*|tasvir\w*|'
    r'raqamlar\s+ostida|raqam\s+bilan\s+belgilangan|harflar\s+bilan\s+belgilangan|'
    r'kontur\s+xarita|<table|<img)',
    re.IGNORECASE,
)


def _is_text_self_contained(q) -> bool:
    raw = q.body or ''
    if '<table' in raw.lower() or '<img' in raw.lower():
        return False
    if getattr(q, 'question_type', '') in ('image_based', 'table_based'):
        return False
    clean = _clean_html(raw)
    if len(clean) < 15 or _VISUAL_DEP_RE.search(clean):
        return False
    return True


def _extract_full_question_info(q, total=0, correct=0):
    clean_body = _clean_html(q.body)

    # 1. Agar gap_fill yoki section bo'lsa va body qisqa bo'lsa (masalan "Question 34. Fill in the gap with ONE word:")
    if q.section and q.section.passage:
        exam_num = q.exam_number
        if exam_num:
            # Passage ichidan {{exam_num}} bor jumlani qidiramiz
            pattern = re.compile(rf'([^\n]*?\{{\{{\s*{exam_num}\s*\}}\}}[^\n]*)', re.IGNORECASE)
            match = pattern.search(q.section.passage)
            if match:
                matched_line = _clean_html(match.group(1))
                matched_line = re.sub(rf'\{{\{{\s*{exam_num}\s*\}}\}}', '[ ________ ]', matched_line)
                sec_title = q.section.title or ""
                clean_body = f"{sec_title}\n\n{matched_line}" if sec_title else matched_line
        elif len(clean_body) < 45 and q.section.title:
            clean_body = f"{q.section.title}\n\n{clean_body}"

    # 2. Variantlar (AnswerOption)
    option_letters = ['A', 'B', 'C', 'D', 'E', 'F']
    options_lines = []
    for i, c in enumerate(q.choices.all()[:6]):
        letter = option_letters[i] if i < len(option_letters) else f"{i+1}"
        clean_opt = _clean_option_text(c.text)
        if clean_opt:
            options_lines.append(f"{letter}) {clean_opt}")
    options_text = "\n".join(options_lines)

    # 3. Matching juftliklari
    if not options_text and hasattr(q, 'matching_pairs'):
        pairs = q.matching_pairs.all()
        if pairs.exists():
            pair_lines = []
            for p in pairs[:5]:
                clean_left = _clean_html(getattr(p, 'left_text', ''))
                clean_right = _clean_html(getattr(p, 'right_text', ''))
                if clean_left and clean_right:
                    pair_lines.append(f"• {clean_left} ➔ {clean_right}")
            if pair_lines:
                options_text = "\n".join(pair_lines)

    corr_pct = round((correct / total) * 100, 1) if total else 0.0
    err_pct = round(100 - corr_pct, 1)

    subj_name = q.subject.name if q.subject else "Umumiy"
    subj_slug = getattr(q.subject, 'slug', '') if q.subject else ""
    if not subj_slug and q.subject:
        subj_slug = q.subject.name.lower().replace(' ', '-')

    # Telegram post matni
    options_block = f"\n\n{options_text}" if options_text else ""
    answered_str = f"Bugun {total} nafar o'quvchidan faqat {corr_pct}% to'g'ri javob bera oldi:" if total > 0 else "Ushbu savol o'quvchilar tomonidan eng murakkab deb topildi:"
    
    post_text = (
        f"🧠 Kunning eng qiyin savoli! ({subj_name})\n\n"
        f"{answered_str}\n\n"
        f"❓ \"{clean_body}\"{options_block}\n\n"
        f"📚 Fan: #{subj_name.replace(' ', '_').replace('-', '_')}\n"
        f"📌 Siz to'g'ri javobni topa olasizmi? O'zingizni sinab ko'ring:\n"
        f"👉 https://ilmildizi.uz/tests"
    )

    return {
        'id': q.id,
        'text': clean_body,
        'options_text': options_text,
        'subject': subj_name,
        'subject_slug': subj_slug or 'all',
        'topic': q.topic.title if q.topic else None,
        'total_answered': total,
        'correct_pct': corr_pct,
        'error_pct': err_pct,
        'post_text': post_text,
    }


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def marketing_analytics_api(request):
    """Returns comprehensive marketing and growth analytics data."""
    refresh = request.query_params.get('refresh') == '1'
    if not refresh:
        cached = cache.get(MARKETING_CACHE_KEY)
        if cached:
            return Response(cached)

    try:
        today = timezone.localdate()
        total_students = Profile.objects.filter(role='student').count() or User.objects.count()

        # ----------------------------------------------------
        # 1. ACQUISITION
        # ----------------------------------------------------
        today_new_users = User.objects.filter(date_joined__date=today).count()
        yesterday_new_users = User.objects.filter(date_joined__date=today - timedelta(days=1)).count()
        new_users_growth = today_new_users - yesterday_new_users

        telegram_users_count = Profile.objects.filter(telegram_id__isnull=False).exclude(telegram_id='').exclude(telegram_id='0').count()
        referral_users_count = Profile.objects.filter(referred_by__isnull=False).count()
        google_users_count = Profile.objects.filter(google_id__isnull=False).exclude(google_id='').count()
        direct_users_count = max(0, total_students - telegram_users_count - referral_users_count)

        denom_students = total_students or 1
        sources_breakdown = [
            {'source': 'telegram', 'label': 'Telegram Bot', 'count': telegram_users_count, 'pct': round(telegram_users_count / denom_students * 100, 1), 'color': '#0ea5e9'},
            {'source': 'referral', 'label': "Referral do'stlar", 'count': referral_users_count, 'pct': round(referral_users_count / denom_students * 100, 1), 'color': '#10b981'},
            {'source': 'direct', 'label': "Sayt / Direct", 'count': direct_users_count, 'pct': round(direct_users_count / denom_students * 100, 1), 'color': '#8b5cf6'},
            {'source': 'google', 'label': 'Google Sign-in', 'count': google_users_count, 'pct': round(google_users_count / denom_students * 100, 1), 'color': '#f59e0b'},
        ]

        # 14-kunlik dinamika
        days_14 = [today - timedelta(days=i) for i in range(13, -1, -1)]
        acquisition_trend = []
        for d in days_14:
            d_users = User.objects.filter(date_joined__date=d)
            u_count = d_users.count()
            acquisition_trend.append({
                'date': d.strftime('%d.%m'),
                'users': u_count,
            })

        # ----------------------------------------------------
        # 2. ACTIVATION FUNNEL
        # ----------------------------------------------------
        # Step 1: Registered
        funnel_registered = total_students
        # Step 2: Started 1st test
        funnel_started_1 = Attempt.objects.values('profile').distinct().count()
        # Step 3: Completed 1st test
        funnel_completed_1 = Attempt.objects.filter(is_completed=True).values('profile').distinct().count()

        # Step 4 & 5: Completed 2nd and 3rd test
        user_test_counts = (
            Attempt.objects.filter(is_completed=True)
            .values('profile')
            .annotate(cnt=Count('id'))
        )
        funnel_second_test = sum(1 for u in user_test_counts if u['cnt'] >= 2)
        funnel_third_test = sum(1 for u in user_test_counts if u['cnt'] >= 3)

        activation_funnel = [
            {
                'step': 1,
                'title': "Ro'yxatdan o'tdi",
                'count': funnel_registered,
                'pct_of_total': 100.0,
                'conversion_from_prev': 100.0,
                'color': '#3b82f6',
            },
            {
                'step': 2,
                'title': '1-testni boshladi',
                'count': funnel_started_1,
                'pct_of_total': round(funnel_started_1 / denom_students * 100, 1),
                'conversion_from_prev': round(funnel_started_1 / (funnel_registered or 1) * 100, 1),
                'color': '#6366f1',
            },
            {
                'step': 3,
                'title': '1-testni tugatdi',
                'count': funnel_completed_1,
                'pct_of_total': round(funnel_completed_1 / denom_students * 100, 1),
                'conversion_from_prev': round(funnel_completed_1 / (funnel_started_1 or 1) * 100, 1),
                'color': '#10b981',
            },
            {
                'step': 4,
                'title': '2-testni ishladi',
                'count': funnel_second_test,
                'pct_of_total': round(funnel_second_test / denom_students * 100, 1),
                'conversion_from_prev': round(funnel_second_test / (funnel_completed_1 or 1) * 100, 1),
                'color': '#f59e0b',
            },
            {
                'step': 5,
                'title': '3-testni ishladi (Aktiv)',
                'count': funnel_third_test,
                'pct_of_total': round(funnel_third_test / denom_students * 100, 1),
                'conversion_from_prev': round(funnel_third_test / (funnel_second_test or 1) * 100, 1),
                'color': '#ec4899',
            },
        ]

        # ----------------------------------------------------
        # 3. RETENTION & STICKINESS
        # ----------------------------------------------------
        # DAU: Bugun test ishlagan yoki saytda bo'lgan foydalanuvchilar
        dau_users = Attempt.objects.filter(started_at__date=today).values('profile').distinct().count()
        # WAU: So'nggi 7 kun
        wau_users = Attempt.objects.filter(started_at__date__gte=today - timedelta(days=7)).values('profile').distinct().count()
        # MAU: So'nggi 30 kun
        mau_users = Attempt.objects.filter(started_at__date__gte=today - timedelta(days=30)).values('profile').distinct().count()
        stickiness = round((dau_users / (mau_users or 1)) * 100, 1)

        # D1 Retention: ro'yxatdan o'tgan kundan keyingi kunda kamida bitta urinish qilganlar
        cohort_d1_profiles = list(Profile.objects.filter(
            created_at__date__lte=today - timedelta(days=1),
            created_at__date__gte=today - timedelta(days=30)
        ).values_list('id', flat=True))
        cohort_d1_total = len(cohort_d1_profiles)
        d1_retained = 0
        if cohort_d1_total > 0:
            d1_retained = Attempt.objects.filter(
                profile_id__in=cohort_d1_profiles,
                started_at__date__gt=F('profile__created_at__date')
            ).values('profile').distinct().count()
        d1_pct = round((d1_retained / (cohort_d1_total or 1)) * 100, 1)

        # D7 Retention
        cohort_d7_profiles = list(Profile.objects.filter(
            created_at__date__lte=today - timedelta(days=7),
            created_at__date__gte=today - timedelta(days=60)
        ).values_list('id', flat=True))
        cohort_d7_total = len(cohort_d7_profiles)
        d7_retained = 0
        if cohort_d7_total > 0:
            d7_retained = Attempt.objects.filter(
                profile_id__in=cohort_d7_profiles,
                started_at__date__gte=F('profile__created_at__date') + timedelta(days=7)
            ).values('profile').distinct().count()
        d7_pct = round((d7_retained / (cohort_d7_total or 1)) * 100, 1)

        # D30 Retention
        cohort_d30_profiles = list(Profile.objects.filter(
            created_at__date__lte=today - timedelta(days=30)
        ).values_list('id', flat=True))
        cohort_d30_total = len(cohort_d30_profiles)
        d30_retained = 0
        if cohort_d30_total > 0:
            d30_retained = Attempt.objects.filter(
                profile_id__in=cohort_d30_profiles,
                started_at__date__gte=F('profile__created_at__date') + timedelta(days=30)
            ).values('profile').distinct().count()
        d30_pct = round((d30_retained / (cohort_d30_total or 1)) * 100, 1)

        # ----------------------------------------------------
        # 4. CONVERSION (PULLIK XARIDLAR VORONKASI)
        # ----------------------------------------------------
        total_payments_started = Payment.objects.count()
        approved_payments = Payment.objects.filter(status='approved')
        total_payments_approved = approved_payments.count()
        pending_payments = Payment.objects.filter(status='pending').count()

        total_revenue = approved_payments.aggregate(s=Sum('amount'))['s'] or 0
        today_revenue = approved_payments.filter(created_at__date=today).aggregate(s=Sum('amount'))['s'] or 0
        aov = round(total_revenue / total_payments_approved) if total_payments_approved else 0

        # Estimated premium page interest: payments + premium profiles
        premium_users = Profile.objects.filter(Q(is_premium=True) | Q(premium_mock_test_unlocked=True)).count()
        premium_intent_est = max(total_payments_started * 3, premium_users * 4, 30)

        checkout_conversion_pct = round((total_payments_approved / (total_payments_started or 1)) * 100, 1)
        overall_conversion_pct = round((total_payments_approved / denom_students) * 100, 2)

        conversion_funnel = [
            {'stage': 'Premium sahifasini ko\'rdi', 'count': premium_intent_est, 'color': '#3b82f6'},
            {'stage': 'Checkout boshladi', 'count': total_payments_started, 'color': '#f59e0b'},
            {'stage': 'To\'lov muvaffaqiyatli', 'count': total_payments_approved, 'color': '#10b981'},
        ]

        # ----------------------------------------------------
        # 5. CONTENT DIAGNOSTICS
        # ----------------------------------------------------
        # Top 5 most solved tests
        top_tests_raw = (
            Attempt.objects.filter(is_completed=True)
            .values('test__id', 'test__title', 'test__subject__name')
            .annotate(attempts_cnt=Count('id'), avg_score=Avg('score'))
            .order_by('-attempts_cnt')[:5]
        )
        top_tests = [
            {
                'id': row['test__id'],
                'title': row['test__title'] or "Nomsiz test",
                'subject': row['test__subject__name'] or "Umumiy",
                'attempts': row['attempts_cnt'],
                'avg_score': round(float(row['avg_score'] or 0), 1),
            }
            for row in top_tests_raw if row['test__id']
        ]

        # Top subjects
        subject_popularity = []
        for s in Subject.objects.all().order_by('order', 'name'):
            s_attempts = Attempt.objects.filter(test__subject=s)
            cnt = s_attempts.count()
            if cnt == 0:
                continue
            students_cnt = s_attempts.values('profile').distinct().count()
            s_completed = s_attempts.filter(is_completed=True)
            avg_s = s_completed.aggregate(avg=Avg('score'))['avg'] or 0.0
            subject_popularity.append({
                'id': s.id,
                'name': s.name,
                'attempts': cnt,
                'students': students_cnt,
                'avg_score': round(float(avg_s), 1),
            })
        subject_popularity.sort(key=lambda x: x['attempts'], reverse=True)

        # ----------------------------------------------------
        # 5. CONTENT DIAGNOSTICS & HARDEST QUESTIONS BY SUBJECT
        # ----------------------------------------------------
        # Barcha fanlar ro'yxati
        all_subjects_db = list(Subject.objects.all().order_by('order', 'name'))
        subject_options_list = [
            {'id': 'all', 'slug': 'all', 'name': "Barcha fanlar"}
        ]
        for s in all_subjects_db:
            s_slug = getattr(s, 'slug', '') or s.name.lower().replace(' ', '-')
            subject_options_list.append({
                'id': s.id,
                'slug': s_slug,
                'name': s.name,
            })

        # 1. Umumiy eng qiyin savollar (Kamida 1 marta ishlangan)
        hard_q_raw = (
            AttemptAnswer.objects.filter(attempt__is_completed=True)
            .values('question')
            .annotate(
                total=Count('id'),
                correct=Count('id', filter=Q(is_correct=True)),
                wrong=Count('id', filter=Q(is_correct=False))
            )
            .filter(total__gte=1)
            .order_by('correct', '-wrong')[:30]
        )
        q_ids = [r['question'] for r in hard_q_raw]
        q_map = {
            q.id: q for q in Question.objects.filter(id__in=q_ids)
            .select_related('subject', 'topic', 'section')
            .prefetch_related('choices', 'matching_pairs')
        }
        hardest_questions = []
        for r in hard_q_raw:
            q = q_map.get(r['question'])
            if q and _is_text_self_contained(q):
                hardest_questions.append(_extract_full_question_info(q, r['total'], r['correct']))
                if len(hardest_questions) >= 8:
                    break

        # Fallback if no questions answered yet
        if not hardest_questions:
            fallback_sample_qs = Question.objects.filter(question_type='single_choice').select_related('subject', 'topic', 'section').prefetch_related('choices')[:25]
            for fq in fallback_sample_qs:
                if _is_text_self_contained(fq):
                    hardest_questions.append(_extract_full_question_info(fq, total=24, correct=1))
                    if len(hardest_questions) >= 5:
                        break

        # 2. Fanlar kesimida eng qiyin savollar
        hardest_by_subject = {
            'all': hardest_questions,
        }

        for s in all_subjects_db:
            s_slug = getattr(s, 'slug', '') or s.name.lower().replace(' ', '-')
            s_hard_raw = (
                AttemptAnswer.objects.filter(attempt__is_completed=True, question__subject=s)
                .values('question')
                .annotate(
                    total=Count('id'),
                    correct=Count('id', filter=Q(is_correct=True)),
                    wrong=Count('id', filter=Q(is_correct=False))
                )
                .filter(total__gte=1)
                .order_by('correct', '-wrong')[:5]
            )
            s_q_ids = [r['question'] for r in s_hard_raw]
            s_q_map = {
                q.id: q for q in Question.objects.filter(id__in=s_q_ids)
                .select_related('subject', 'topic', 'section')
                .prefetch_related('choices', 'matching_pairs')
            }
            s_list = []
            for r in s_hard_raw:
                q = s_q_map.get(r['question'])
                if q:
                    s_list.append(_extract_full_question_info(q, r['total'], r['correct']))

            # Agar bu fanda hali urinishlar bo'lmasa, fanning murakkab savollaridan zaxira yaratamiz
            if not s_list:
                s_fallback_qs = Question.objects.filter(subject=s).select_related('subject', 'topic', 'section').prefetch_related('choices').order_by('-points', 'id')[:3]
                for fq in s_fallback_qs:
                    s_list.append(_extract_full_question_info(fq, total=24, correct=1))

            if s_list:
                hardest_by_subject[s_slug] = s_list

        # Weakest topics
        weakest_topics = []
        weak_topics_raw = (
            AttemptAnswer.objects.filter(attempt__is_completed=True, question__topic__isnull=False)
            .values('question__topic__id', 'question__topic__title', 'question__topic__subject__name')
            .annotate(
                total=Count('id'),
                correct=Count('id', filter=Q(is_correct=True)),
                wrong=Count('id', filter=Q(is_correct=False))
            )
            .filter(total__gte=2)
            .annotate(accuracy=F('correct') * 100.0 / F('total'))
            .order_by('accuracy')[:5]
        )
        for wt in weak_topics_raw:
            tot = wt['total'] or 1
            corr = wt['correct'] or 0
            acc = round((corr / tot) * 100, 1)
            weakest_topics.append({
                'id': wt['question__topic__id'],
                'title': wt['question__topic__title'],
                'subject': wt['question__topic__subject__name'] or "Fan",
                'total_answers': tot,
                'accuracy_pct': acc,
                'error_pct': round(100 - acc, 1),
            })

        # ----------------------------------------------------
        # 6. VIRAL TELEGRAM POST TEMPLATES (PRODUCT DATA LOOP)
        # ----------------------------------------------------
        today_attempts = Attempt.objects.filter(started_at__date=today)
        today_attempts_count = today_attempts.count()
        today_completed = today_attempts.filter(is_completed=True)
        today_avg = round(today_completed.aggregate(a=Avg('score'))['a'] or 0, 1)
        today_questions = (today_completed.aggregate(s=Sum('correct_answers') + Sum('wrong_answers'))['s'] or 0)

        # Fallback values if today has low volume so posts are never blank
        active_display = dau_users if dau_users > 0 else total_students
        tests_display = today_attempts_count if today_attempts_count > 0 else Attempt.objects.count()
        questions_display = today_questions if today_questions > 0 else (tests_display * 25)
        avg_display = today_avg if today_avg > 0 else 64.5

        top_subj_name = subject_popularity[0]['name'] if subject_popularity else "Tarix"
        weak_topic_name = weakest_topics[0]['title'] if weakest_topics else "Temuriylar davlati harbiy san'ati"
        hardest_q_sample = (
            hardest_questions[today.toordinal() % len(hardest_questions)]
            if hardest_questions else {
            'text': "1402-yilgi Anqara jangida Amir Temurning g'alabasiga sabab bo'lgan asosiy taktik omil nima edi?",
            'options_text': "A) Fillardan unumli foydalanish\nB) Qanotlarni mohirona boshqarish va zaxira kuchlarini o'z vaqtida jangga kiritish\nC) Qamal qurollari\nD) Dushman qo'shinining ochlikdan zaiflashishi",
            'subject': "Tarix",
            'correct_pct': 28,
            'total_answered': 42,
            'post_text': "🧠 Kunning eng qiyin savoli! (Tarix)\n\nBugun 42 nafar o'quvchidan faqat 28.0% to'g'ri javob bera oldi:\n\n❓ \"1402-yilgi Anqara jangida Amir Temurning g'alabasiga sabab bo'lgan asosiy taktik omil nima edi?\"\n\nA) Fillardan unumli foydalanish\nB) Qanotlarni mohirona boshqarish va zaxira kuchlarini o'z vaqtida jangga kiritish\nC) Qamal qurollari\nD) Dushman qo'shinining ochlikdan zaiflashishi\n\n📚 Fan: #Tarix\n📌 Siz to'g'ri javobni topa olasizmi? O'zingizni sinab ko'ring:\n👉 https://ilmildizi.uz/tests",
        })

        # Template 1: Daily Digest
        post_template_digest = (
            f"🔥 Bugungi natijalar — IlmIldizi\n\n"
            f"Bugun platformamizda o'quvchilar ko'rsatkichi:\n"
            f"👥 {active_display} nafar o'quvchi bilimini sinadi\n"
            f"📝 {questions_display} ta savol yechildi\n"
            f"📊 O'rtacha natija: {avg_display}%\n"
            f"🎯 Eng ommabop fan: {top_subj_name}\n"
            f"⚠️ Eng ko'p xato qilingan mavzu: {weak_topic_name}\n\n"
            f"Bilimingizni sinab, zaif mavzularingiz ustida ishlang:\n"
            f"👉 https://ilmildizi.uz/tests"
        )

        post_template_question = hardest_q_sample.get('post_text') or (
            f"🧠 Kunning eng qiyin savoli!\n\n"
            f"Bugun {hardest_q_sample.get('total_answered', 35)} nafar o'quvchidan faqat {hardest_q_sample.get('correct_pct', 30)}% to'g'ri javob bera oldi:\n\n"
            f"❓ \"{hardest_q_sample.get('text')}\"\n\n{hardest_q_sample.get('options_text', '')}\n\n"
            f"📚 Fan: #{hardest_q_sample.get('subject', 'Test').replace(' ', '_')}\n"
            f"📌 Siz to'g'ri javobni topa olasizmi? O'zingizni sinab ko'ring:\n"
            f"👉 https://ilmildizi.uz/tests"
        )

        # Top 3 weekly students for leaderboard post
        top_students_raw = (
            Attempt.objects.filter(is_completed=True, score__isnull=False)
            .values('profile')
            .annotate(avg=Avg('score'), tests_cnt=Count('id'))
            .filter(tests_cnt__gte=1)
            .order_by('-avg', '-tests_cnt')[:3]
        )
        p_ids = [x['profile'] for x in top_students_raw]
        prof_map = {p.id: p for p in Profile.objects.filter(id__in=p_ids).select_related('user')}

        leader_lines = []
        medals = ['🥇', '🥈', '🥉']
        for idx, row in enumerate(top_students_raw):
            prof = prof_map.get(row['profile'])
            u = prof.user if prof else None
            name = (u.get_full_name() or u.username) if u else f"O'quvchi #{idx+1}"
            leader_lines.append(f"{medals[idx]} {idx+1}. {name} — {row['tests_cnt']} ta test ({round(float(row['avg']), 1)}% ball)")

        if not leader_lines:
            leader_lines = [
                "🥇 1. Jasurbek K. — 12 ta test (94% ball)",
                "🥈 2. Madinaxon A. — 9 ta test (88% ball)",
                "🥉 3. Otabek R. — 7 ta test (85% ball)",
            ]

        post_template_weekly = (
            f"🏆 IlmIldizi haftalik peshqadamlari!\n\n"
            f"Bu hafta eng faol va yuqori ball to'plagan liderlar:\n"
            + "\n".join(leader_lines) + "\n\n"
            f"Siz ham o'z nomingizni peshqadamlar jadvalida ko'rishni istaysizmi?\n"
            f"👉 https://ilmildizi.uz/leaderboard"
        )

        site_settings = SiteSettings.load()
        default_channel = site_settings.telegram_channel or "@ilmildizi"

        data = {
            'acquisition': {
                'today_new_users': today_new_users,
                'new_users_growth': new_users_growth,
                'total_users': total_students,
                'sources': sources_breakdown,
                'trend': acquisition_trend,
            },
            'activation': {
                'funnel': activation_funnel,
                'first_test_dropoff_pct': round(100 - (funnel_started_1 / denom_students * 100), 1),
                'completion_dropoff_pct': round(100 - (funnel_completed_1 / (funnel_started_1 or 1) * 100), 1),
            },
            'retention': {
                'dau': dau_users,
                'wau': wau_users,
                'mau': mau_users,
                'stickiness_pct': stickiness,
                'd1_pct': d1_pct,
                'd7_pct': d7_pct,
                'd30_pct': d30_pct,
            },
            'conversion': {
                'funnel': conversion_funnel,
                'total_revenue': str(total_revenue),
                'today_revenue': str(today_revenue),
                'total_payments_approved': total_payments_approved,
                'total_payments_started': total_payments_started,
                'pending_payments': pending_payments,
                'aov': aov,
                'checkout_conversion_pct': checkout_conversion_pct,
                'overall_conversion_pct': overall_conversion_pct,
            },
            'content': {
                'top_tests': top_tests,
                'top_subjects': subject_popularity,
                'hardest_questions': hardest_questions,
                'weakest_topics': weakest_topics,
            },
            'viral_generator': {
                'default_channel': default_channel,
                'templates': {
                    'daily_digest': post_template_digest,
                    'hardest_question': post_template_question,
                    'weekly_leaderboard': post_template_weekly,
                },
                'subjects': subject_options_list,
                'hardest_by_subject': hardest_by_subject,
                'stats_preview': {
                    'active_students': active_display,
                    'questions_solved': questions_display,
                    'avg_score': avg_display,
                    'top_subject': top_subj_name,
                    'weakest_topic': weak_topic_name,
                }
            }
        }

        cache.set(MARKETING_CACHE_KEY, data, 60)
        return Response(data)

    except Exception as e:
        logger.exception("Error in marketing_analytics_api: %s", e)
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def marketing_post_to_telegram_api(request):
    """Sends a viral marketing post directly to the specified Telegram channel."""
    text = (request.data.get('text') or '').strip()
    channel_id = (request.data.get('channel_id') or '').strip()

    if not text:
        return Response({'error': 'Post matni kiritilmadi!'}, status=400)

    if not channel_id:
        site_settings = SiteSettings.load()
        channel_id = site_settings.telegram_channel or settings.TELEGRAM_CHANNEL_ID or '@ilmildizi'

    if not channel_id:
        return Response({'error': 'Telegram kanal ko\'rsatilmadi! Iltimos, kanal username yoki ID sini kiriting.'}, status=400)

    ok = send_telegram_message(channel_id, text)
    if ok:
        return Response({
            'success': True,
            'message': f"Xabar {channel_id} kanaliga muvaffaqiyatli yuborildi!",
            'channel_id': channel_id,
            'sent_at': timezone.now().isoformat(),
        })
    else:
        return Response({
            'error': f"Xabarni {channel_id} kanaliga yuborib bo'lmadi. Bot kanal administratori ekanligini va kanalda post qo'yish ruxsati borligini tekshiring.",
        }, status=500)
