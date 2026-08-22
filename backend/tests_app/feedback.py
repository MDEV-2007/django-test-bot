import json
import logging
from django.core.cache import cache
from django.db import IntegrityError, transaction
from learning.models import Topic, Lesson
from core import background
from core.models import Notification
from core.ai_client import ask_groq
from .services.prompts import SYSTEM_PROMPT, build_user_prompt
from .models import Question, AnswerOption, TestSet, Attempt, AIFeedback

logger = logging.getLogger(__name__)




def _grade_band(score):
    if score >= 90:
        return "A'lo"
    elif score >= 75:
        return "Yaxshi"
    elif score >= 60:
        return "Qoniqarli"
    elif score >= 40:
        return "O'rtacha"
    return "Qoniqarsiz"


def _build_ai_feedback_data(score, correct, skipped, total, weak_topics, strong_topics):
    """Builds a real, score/topic-driven analysis instead of a fixed canned template."""
    if score >= 90:
        overall_analysis = (
            f"Siz {total} savoldan {correct} tasiga to'g'ri javob berib, {score:.0f}% natija ko'rsatdingiz — "
            f"bu ajoyib daraja va milliy sertifikat talablariga to'liq mos keladi."
        )
        ai_motivation = "Zo'r natija! Shu tezlikda davom eting, siz sertifikatga tayyor bo'lib qolyapsiz."
    elif score >= 75:
        overall_analysis = (
            f"Siz {total} savoldan {correct} tasiga to'g'ri javob berib, {score:.0f}% natija ko'rsatdingiz — "
            f"bu yaxshi daraja, ammo sertifikat uchun bir nechta mavzuni yana mustahkamlash kerak."
        )
        ai_motivation = "Yaxshi natija! Kuchsiz mavzularni tugatsangiz, natijangiz yanada oshadi."
    elif score >= 60:
        overall_analysis = (
            f"Siz {total} savoldan {correct} tasiga to'g'ri javob berdingiz ({score:.0f}%). Bu qoniqarli natija, "
            f"ammo barqaror muvaffaqiyat uchun kuchsiz mavzularga alohida vaqt ajratishingiz kerak."
        )
        ai_motivation = "Yomon emas, lekin hali ishlash kerak. Har kuni bitta mavzuni mustahkamlab boring."
    elif score >= 40:
        overall_analysis = (
            f"Siz {total} savoldan atigi {correct} tasiga to'g'ri javob berdingiz ({score:.0f}%). Bu o'rtacha "
            f"natija — asosiy mavzularni qaytadan o'rganish tavsiya etiladi."
        )
        ai_motivation = "Hafsalangizni pir qilmang — bu faqat boshlanish. Har bir xato sizni bilimga yaqinlashtiradi."
    else:
        overall_analysis = (
            f"Siz {total} savoldan faqat {correct} tasiga to'g'ri javob berdingiz ({score:.0f}%). Bu past natija "
            f"bo'lib, materiallarni boshidan sinchiklab o'rganishingiz zarur."
        )
        ai_motivation = "Hozir qiyin bo'lishi mumkin, ammo tizimli mashq bilan albatta natija chiqadi. Davom eting!"

    if skipped:
        overall_analysis += f" Shuningdek, {skipped} ta savolni javobsiz qoldirdingiz — vaqtni to'g'ri taqsimlashga e'tibor bering."

    if strong_topics:
        overall_analysis += f" Kuchli tomonlaringiz: {', '.join(strong_topics)}."

    predicted_score = _grade_band(score)

    recommendation_lines = []
    roadmap = []
    step = 1
    for topic_title in weak_topics[:3]:
        lesson = Lesson.objects.filter(topic__title=topic_title).first()
        if lesson:
            recommendation_lines.append(f"{step}. O'qish bo'limida '{lesson.title}' ({topic_title}) darsini ko'ring.")
            roadmap.append({"step": step, "title": f"'{lesson.title}' darsini o'qish", "duration": "15 daqiqa", "done": False})
        else:
            recommendation_lines.append(f"{step}. '{topic_title}' mavzusi bo'yicha o'qish materiallarini qayta ko'rib chiqing.")
            roadmap.append({"step": step, "title": f"'{topic_title}' mavzusini takrorlash", "duration": "15 daqiqa", "done": False})
        step += 1

    if weak_topics:
        recommendation_lines.append(f"{step}. AI Mentor bilan suhbatlashib, '{weak_topics[0]}' mavzusidagi tushunarsiz joylarni so'rab oling.")
        roadmap.append({"step": step, "title": "AI Mentordan yordam so'rash", "duration": "5 daqiqa", "done": False})
        step += 1
        recommendation_lines.append(f"{step}. Ushbu mavzular bo'yicha qayta test yeching va natijangizni solishtiring.")
        roadmap.append({"step": step, "title": "Qayta test yechish", "duration": "10 daqiqa", "done": False})
    else:
        recommendation_lines.append(f"{step}. Barcha mavzularni yaxshi o'zlashtirdingiz — bilimingizni saqlab qolish uchun murakkabroq testlarni sinab ko'ring.")
        roadmap.append({"step": step, "title": "Murakkabroq test bilan bilimni mustahkamlash", "duration": "15 daqiqa", "done": False})

    recommendations = "\n".join(recommendation_lines)

    return {
        'overall_analysis': overall_analysis,
        'recommendations': recommendations,
        'predicted_score': predicted_score,
        'roadmap': roadmap,
        'ai_motivation': ai_motivation,
    }

def _answer_display_texts(ans):
    """Returns (student_text, correct_text) for one AttemptAnswer, across every question
    type — used to build the AI feedback prompt without it needing to know per-type
    field layouts."""
    question = ans.question
    if question.question_type == 'open_written':
        return ans.text_answer, (question.reference_answer or "Noma'lum")

    if question.question_type == 'matching':
        pairs = list(question.matching_pairs.all())
        expected = {p.left_key: p.right_key for p in pairs if p.left_key}
        right_text_by_key = {p.right_key: p.right_text for p in pairs}
        submitted = ans.matching_data or {}
        student_text = ", ".join(f"{k}-{submitted.get(k, '?')}" for k in expected)
        correct_text = ", ".join(f"{k}-{v} ({right_text_by_key.get(v, '')})" for k, v in expected.items())
        return student_text, correct_text

    if question.question_type == 'grouped_item':
        student_text = ans.grouped_option.text if ans.grouped_option_id else ""
        correct_text = question.correct_group_option.text if question.correct_group_option_id else "Noma'lum"
        return student_text, correct_text

    # single_choice / image_based / table_based
    correct_choice = next((c for c in question.choices.all() if c.is_correct), None)
    correct_text = correct_choice.text if correct_choice else "Noma'lum"
    student_text = ans.selected_choice.text if ans.selected_choice_id else ""
    return student_text, correct_text


def _build_ai_feedback_via_groq(answers, score, correct, total, subject_name="Umumiy"):
    """Asks Groq for a personalized, per-question test analysis. `answers` must be an
    iterable of AttemptAnswer with question__topic and question choices/related data
    already prefetched. Returns None (caller falls back to _build_ai_feedback_data) if
    Groq is unconfigured, unreachable, or replies with something that doesn't match the
    expected shape."""
    wrong_answers = []
    skipped_answers = []
    for ans in answers:
        topic_title = ans.question.topic.title if ans.question.topic else f"Umumiy {subject_name}"
        student_text, correct_text = _answer_display_texts(ans)

        if ans.is_skipped:
            skipped_answers.append({
                'mavzu': topic_title,
                'savol': ans.question.body,
                'togri_javob': correct_text,
            })
        elif not ans.is_correct:
            wrong_answers.append({
                'mavzu': topic_title,
                'savol': ans.question.body,
                'bola_javobi': student_text,
                'togri_javob': correct_text,
            })

    user_prompt = build_user_prompt(
        subject=subject_name,
        total=total,
        correct=correct,
        wrong_answers=wrong_answers,
        skipped_answers=skipped_answers,
    )
    raw = ask_groq(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.5,
        response_format={"type": "json_object"},
    )
    if not raw:
        return None

    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Groq feedback returned non-JSON content: %r", raw)
        return None

    required_keys = {'umumiy_xulosa', 'kuchli_tomonlar', 'aniq_xatolar', 'kuchsiz_mavzular', 'keyingi_qadamlar', 'motivatsiya'}
    if not required_keys.issubset(data.keys()) or not isinstance(data['aniq_xatolar'], list) or not isinstance(data['keyingi_qadamlar'], list):
        logger.warning("Groq feedback JSON missing expected keys: %r", data)
        return None

    return data


def seed_questions_if_needed():
    """Helper to seed initial high-fidelity questions and tests if database is empty."""
    if Question.objects.exists():
        return
        
    # Create default Topics first
    t1, _ = Topic.objects.get_or_create(title="O'rta asrlar tarixi", slug="orta-asrlar", category="history", order=1)
    t2, _ = Topic.objects.get_or_create(title="Milliy sertifikat tayyorlov", slug="milliy-sertifikat", category="certificate", order=2)
    t3, _ = Topic.objects.get_or_create(title="BBA Tarix imtihoni", slug="bba-tarix", category="bba", order=3)
    
    # Seed Question 1
    q1 = Question.objects.create(topic=t1, body="Amir Temur qaysi yilda tug'ilgan?", difficulty="easy", category="history")
    AnswerOption.objects.create(question=q1, text="1332-yil", is_correct=False)
    AnswerOption.objects.create(question=q1, text="1336-yil", is_correct=True)
    AnswerOption.objects.create(question=q1, text="1340-yil", is_correct=False)
    AnswerOption.objects.create(question=q1, text="1328-yil", is_correct=False)
    
    # Seed Question 2
    q2 = Question.objects.create(topic=t1, body="Amir Temur davlatining poytaxti qaysi shahar bo'lgan?", difficulty="easy", category="history")
    AnswerOption.objects.create(question=q2, text="Buxoro", is_correct=False)
    AnswerOption.objects.create(question=q2, text="Samarqand", is_correct=True)
    AnswerOption.objects.create(question=q2, text="Toshkent", is_correct=False)
    AnswerOption.objects.create(question=q2, text="Hirot", is_correct=False)
    
    # Seed Question 3
    q3 = Question.objects.create(topic=t1, body="Alisher Navoiy qaysi shaharda tug'ilgan?", difficulty="easy", category="history")
    AnswerOption.objects.create(question=q3, text="Hirot", is_correct=True)
    AnswerOption.objects.create(question=q3, text="Samarqand", is_correct=False)
    AnswerOption.objects.create(question=q3, text="Buxoro", is_correct=False)
    AnswerOption.objects.create(question=q3, text="Toshkent", is_correct=False)

    # Seed Question 4
    q4 = Question.objects.create(topic=t2, body="O'zbekistonda Milliy sertifikat tizimi qaysi yildan joriy etildi?", difficulty="medium", category="certificate")
    AnswerOption.objects.create(question=q4, text="2019-yil", is_correct=False)
    AnswerOption.objects.create(question=q4, text="2020-yil", is_correct=True)
    AnswerOption.objects.create(question=q4, text="2021-yil", is_correct=False)
    AnswerOption.objects.create(question=q4, text="2018-yil", is_correct=False)

    # Seed Question 5
    q5 = Question.objects.create(topic=t3, body="Jadidchilik harakatining asoschilaridan biri, ma'rifatparvar kim edi?", difficulty="medium", category="bba")
    AnswerOption.objects.create(question=q5, text="Mahmudxo'ja Behbudiy", is_correct=True)
    AnswerOption.objects.create(question=q5, text="Abdulla Qodiriy", is_correct=False)
    AnswerOption.objects.create(question=q5, text="Fitrat", is_correct=False)
    AnswerOption.objects.create(question=q5, text="Cho'lpon", is_correct=False)
    
    # Create Default Tests
    test1 = TestSet.objects.create(title="O'zbekiston tarixi (Amir Temur davri)", description="Temuriylar davlatining tashkil topishi va yuksalishi.", category="history", duration_minutes=15)
    test1.questions.add(q1, q2, q3)
    
    test2 = TestSet.objects.create(title="Milliy sertifikat diagnostik test", description="Milliy sertifikat formatidagi boshlang'ich sinov testi.", category="certificate", duration_minutes=20)
    test2.questions.add(q1, q4, q5)
    
    test3 = TestSet.objects.create(title="BBA Tarix kirish imtihoni", description="BBA imtihoni uchun namunaviy tarix savollari.", category="bba", duration_minutes=15)
    test3.questions.add(q2, q3, q5)














def generate_ai_feedback(attempt_id):
    """Build and store the post-test AI analysis for one attempt.

    Runs off the request path (see core.background). Idempotent: if the feedback already
    exists it returns immediately, so a lazy re-trigger or a retry can never duplicate it.
    """
    attempt = (Attempt.objects
               .select_related('test__subject', 'profile__user')
               .filter(id=attempt_id, is_completed=True)
               .first())
    if attempt is None or AIFeedback.objects.filter(attempt_id=attempt_id).exists():
        return

    answers = list(attempt.answers.select_related('question__topic').all())
    total = len(answers) or 1
    correct = attempt.correct_answers
    skipped = attempt.skipped_answers
    score = attempt.score or 0
    subject_name = attempt.test.subject.name if attempt.test and attempt.test.subject else "Umumiy"

    # Unique real topics covered, split by actual correctness.
    weak_topics, strong_topics = [], []
    for ans in answers:
        topic_title = ans.question.topic.title if ans.question.topic else f"Umumiy {subject_name}"
        target = strong_topics if ans.is_correct else weak_topics
        if topic_title not in target:
            target.append(topic_title)
    strong_topics = [t for t in strong_topics if t not in weak_topics]

    groq_data = _build_ai_feedback_via_groq(answers, score, correct, total, subject_name=subject_name)
    if groq_data:
        overall_analysis = groq_data['umumiy_xulosa']
        recommendations = "\n".join(f"{i}. {step}" for i, step in enumerate(groq_data['keyingi_qadamlar'], start=1))
        roadmap = [
            {"step": i, "title": step, "duration": "15 daqiqa", "done": False}
            for i, step in enumerate(groq_data['keyingi_qadamlar'], start=1)
        ]
        ai_motivation = groq_data['motivatsiya']
        detailed_mistakes = groq_data['aniq_xatolar']
        final_weak_topics = groq_data['kuchsiz_mavzular'] or weak_topics
        final_strong_topics = groq_data['kuchli_tomonlar'] or strong_topics
    else:
        fallback = _build_ai_feedback_data(score, correct, skipped, total, weak_topics, strong_topics)
        overall_analysis = fallback['overall_analysis']
        recommendations = fallback['recommendations']
        roadmap = fallback['roadmap']
        ai_motivation = fallback['ai_motivation']
        detailed_mistakes = []
        final_weak_topics = weak_topics
        final_strong_topics = strong_topics

    try:
        AIFeedback.objects.create(
            attempt=attempt,
            overall_analysis=overall_analysis,
            weak_topics=", ".join(final_weak_topics) if final_weak_topics else "Yo'q (barcha mavzular o'zlashtirildi)",
            strong_topics=", ".join(final_strong_topics) if final_strong_topics else "Hozircha yo'q",
            recommendations=recommendations,
            predicted_score=_grade_band(score),
            roadmap=roadmap,
            ai_motivation=ai_motivation,
            detailed_mistakes=detailed_mistakes,
        )
    except IntegrityError:
        return  # another worker won the race; its feedback is already stored

    test_title = attempt.test.title if attempt.test else "Test"
    Notification.objects.create(
        profile=attempt.profile,
        title="Imtihon yakunlandi",
        message=f"'{test_title}' testi yuzasidan AI tahlili tayyor bo'ldi. Natijangiz: {score:.0f}%",
        type='system',
    )


def _dispatch_ai_feedback(attempt_id):
    """Queue generation at most once per attempt at a time.

    The job is dispatched via transaction.on_commit: the background thread uses its own
    database connection, so starting it before the current transaction commits means it
    either blocks on the write lock (SQLite) or simply cannot see the attempt yet
    (PostgreSQL) and silently gives up. on_commit guarantees the row is durable and
    visible first — and keeps this correct if ATOMIC_REQUESTS is ever enabled.

    The cache lock stops the auto-refreshing feedback page from piling up duplicate jobs
    while one is already in flight.
    """
    if AIFeedback.objects.filter(attempt_id=attempt_id).exists():
        return
    lock_key = f'ai_feedback_lock:{attempt_id}'
    if cache.add(lock_key, '1', 180):  # only the first caller wins the lock
        transaction.on_commit(lambda: background.submit(generate_ai_feedback, attempt_id))




