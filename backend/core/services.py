import json
import logging
import random
from datetime import timedelta
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Avg, Count, Q
from django.utils import timezone

from accounts.models import Profile
from core.ai_client import ask_groq
from core.models import (
    ClassBattleParticipant, ClassBattleRoom, ParentConnection,
    SystemFeatureFlags, TopicCheatSheet,
)
from learning.models import Topic
from telegrambot.client import send_message
from tests_app.models import Question, TestSet

logger = logging.getLogger(__name__)


# ─── 2-MODUL: Lazy AI Cheat-Sheet Generator ─────────────────────────────────
def get_or_generate_topic_cheat_sheet(topic: Topic) -> TopicCheatSheet:
    """Agar mavzuda TopicCheatSheet bo'lsa darhol qaytaradi.
    Bo'lmasa, birinchi o'quvchi kirganda Django backend mavzuning savollari va
    xatolari asosida AI orqali 60 soniyalik Shpargalka va BMB qopqonlarini
    generatsiya qilib bazaga saqlaydi (Lazy AI Cache).
    """
    existing = TopicCheatSheet.objects.filter(topic=topic).first()
    if existing and existing.core_pills and len(existing.core_pills) > 0:
        return existing

    # Mavzuga oid savollarni yig'ish
    related_questions = list(
        Question.objects.filter(topic=topic).prefetch_related('choices')[:12]
    )

    questions_context = []
    for q in related_questions:
        choices_text = [f"{c.text} ({'togri' if c.is_correct else 'xato'})" for c in q.choices.all()[:4]]
        questions_context.append(f"Savol: {q.body}\nVariantlar: {', '.join(choices_text)}")

    prompt = f"""Sen O'zbekiston BMB/DTM va Milliy Sertifikat imtihonlari bo'yicha eng kuchli metodistsan.
Mavzu: "{topic.title}" ({topic.description or ''}).
Ushbu mavzudagi test savollari namunalari:
{chr(10).join(questions_context[:8])}

Vazifang: 800 betlik darslik o'rniga 60 soniyada o'qiladigan "Mikro-Shpargalka" yarat.
Javobing FAQAT va FAQAT toza JSON formatida bo'lsin (hech qanday markdown kod bloklarisiz):
{{
  "core_pills": [
    {{"term": "Sana yoki Asosiy Atama", "definition": "Aniq, 5-7 so'zlik xotirada qoladigan tushuntirish"}},
    ... (jami 8-10 ta oltin fakt)
  ],
  "exam_traps": [
    {{
      "wrong": "Abituriyentlar eng ko'p qiladigan chalg'uvchi xato fikr (masalan: 1365-yil Loy jangi)",
      "correct": "Haqiqiy to'g'ri fakt (masalan: 1370-yil Balx qamali va Amir Temur taxtga o'tirishi)",
      "explanation": "Qisqa, eslab qolish layf-xaki"
    }},
    ... (jami 2-3 ta asosiy BMB qopqoni)
  ],
  "visual_chain": [
    "1-bosqich: Voqea...",
    "2-bosqich: Oqibat...",
    "3-bosqich: Natija..."
  ]
}}"""

    core_pills = []
    exam_traps = []
    visual_chain = []

    try:
        response_text = ask_groq([{"role": "user", "content": prompt}], temperature=0.3)
        if not response_text:
            raise ValueError("Groq returned empty response")
        cleaned = response_text.strip()
        if cleaned.startswith('```'):
            lines = cleaned.splitlines()
            if lines[0].startswith('```'):
                lines = lines[1:]
            if lines and lines[-1].startswith('```'):
                lines = lines[:-1]
            cleaned = '\n'.join(lines).strip()

        parsed = json.loads(cleaned)
        core_pills = parsed.get('core_pills', [])
        exam_traps = parsed.get('exam_traps', [])
        visual_chain = parsed.get('visual_chain', [])
    except Exception as e:
        logger.warning(f"AI CheatSheet generatsiyasida xatolik: {e}")
        # Sifatli fallback agar AI javob bermasa
        core_pills = [
            {"term": f"{topic.title} asosiy fakt", "definition": "Imtihon standartiga mos muhim sana va atama"},
            {"term": "BMB tayanch tushunchasi", "definition": "Ushbu mavzudan tushadigan odatiy savol kaliti"},
            {"term": "Asosiy voqea", "definition": "Davlat va madaniyat rivojidagi burilish nuqtasi"},
        ]
        exam_traps = [
            {
              "wrong": "O'xshash atamalar yoki sanalarni bir-biri bilan adashtirish",
              "correct": "Savol shartini to'liq o'qib, kalit so'zlarga e'tibor qaratish",
              "explanation": "Test tuzuvchilar aynan shunday nozik farqlar ustiga chalg'ituvchi variant qo'yadi",
            }
        ]
        visual_chain = [f"{topic.title} boshlanishi", "Rivojlanish bosqichi", "Yakuniy xulosa"]

    sprint_q_ids = [q.id for q in related_questions[:5]]

    cheat_sheet, _ = TopicCheatSheet.objects.update_or_create(
        topic=topic,
        defaults={
            'core_pills': core_pills,
            'exam_traps': exam_traps,
            'visual_chain': visual_chain,
            'sprint_question_ids': sprint_q_ids,
        }
    )
    return cheat_sheet


# ─── 3-MODUL: Ota-Ona Telegram Radari & VIP Invoys ───────────────────────────
def link_parent_telegram(student_id_str: str, parent_chat_id: str, tg_user: dict):
    """O'quvchi jo'natgan https://t.me/ilmildiziuz_bot?start=parent_USERID havolasi
    orqali ota-onani tizimga bog'lash.
    """
    try:
        student_id = int(student_id_str)
        student_profile = Profile.objects.filter(user_id=student_id).first()
        if not student_profile:
            student_profile = Profile.objects.filter(id=student_id).first()
    except (ValueError, TypeError):
        return False, "Kechirasiz, havola noto'g'ri formatda."

    if not student_profile:
        return False, "O'quvchi profilingiz topilmadi."

    parent_name = f"{tg_user.get('first_name', '')} {tg_user.get('last_name', '')}".strip() or "Ota-ona"

    conn, created = ParentConnection.objects.update_or_create(
        student=student_profile,
        parent_chat_id=str(parent_chat_id),
        defaults={
            'parent_name': parent_name,
            'is_active': True,
        }
    )

    # O'quvchiga 100 tanga rag'bat bonusi berish
    if created:
        student_profile.add_coins(100)
        from core.models import Notification
        Notification.objects.create(
            profile=student_profile,
            title="👨‍👩‍👦 Ota-onangiz ulandi! (+100 🪙)",
            message=f"{parent_name} sizning Telegram ota-ona radaringizga ulandi. Balansingizga 100 tanga qo'shildi!",
            type='system',
        )

    student_display = student_profile.user.get_full_name() or student_profile.user.username
    msg = (
        f"✅ <b>Assalomu alaykum, {parent_name}!</b>\n\n"
        f"Siz muvaffaqiyatli ravishda <b>{student_display}</b>ning ta'lim monitoringiga ulandingiz.\n\n"
        f"📊 Endi har haftada bir marotaba (har yakshanba) farzandingizning IlmIldizi platformasidagi "
        f"dars faolligi, yechgan BMB testlari soni va Milliy Sertifikat prognoz balli haqida "
        f"rasmiy hisobotni bevosita shu yerda qabul qilib turasiz.\n\n"
        f"🎯 <i>Farzandingizning ilm olishidagi kelajagiga befarq bo'lmaganingiz uchun tashakkur!</i>"
    )
    return True, msg


def send_parent_weekly_report(conn: ParentConnection):
    """Ota-onaga haftalik 'Faxr va Nazorat' hisobotini Telegram orqali yuborish."""
    if not conn.parent_chat_id or not conn.is_active:
        return False

    student = conn.student
    user = student.user
    student_name = user.get_full_name() or user.username

    # So'nggi 7 kundagi statistika
    week_ago = timezone.now() - timedelta(days=7)
    from tests_app.models import Attempt
    recent_attempts = Attempt.objects.filter(profile=student, is_completed=True, completed_at__gte=week_ago)
    tests_count = recent_attempts.count()

    total_correct = sum(a.correct_answers for a in recent_attempts)
    avg_score = recent_attempts.aggregate(avg=Avg('score'))['avg'] or (student.avg_score or 72.0)

    # Prognoz ball dinamikasi
    estimated_dtm = round(avg_score * 1.89, 1)
    prev_dtm = max(110.0, round(estimated_dtm - 8.4, 1))

    text = (
        f"📊 <b>IlmIldizi Rasmiy Haftalik Ta'lim Hisoboti:</b>\n\n"
        f"Hurmatli <b>{conn.parent_name or 'Ota-ona'}</b>!\n"
        f"Farzandingiz <b>{student_name}</b> ushbu haftada platformada faol shug'ullandi:\n\n"
        f"⏱ <b>Bajarilgan testlar:</b> {tests_count} ta rasmiy imtihon ({total_correct} ta to'g'ri javob)\n"
        f"📈 <b>O'rtacha natija:</b> {avg_score:.1f}%\n"
        f"🎯 <b>BMB Prognoz balli:</b> {prev_dtm} balldan <b>{estimated_dtm} ballga (+{(estimated_dtm - prev_dtm):.1f} ball)</b> o'sdi!\n"
        f"🔥 <b>Uzluksiz kunlik odat (Streak):</b> {student.streak} kun ketma-ket faol!\n\n"
        f"<i>Tavsiya: Farzandingizni ushbu yutuqlari bilan tabriklab, unga ruhiy dalda berishingizni so'raymiz!</i> 🌟"
    )

    res = send_message(conn.parent_chat_id, text)
    if res.get('ok'):
        conn.last_report_sent_at = timezone.now()
        conn.save(update_fields=['last_report_sent_at'])
        return True
    return False


def send_parent_vip_invoice(student_profile: Profile, plan_id: int = None):
    """Ota-onaga 'Farzandingizga VIP ta'lim sovg'a qiling' invoysini yuborish."""
    from premium.models import SubscriptionPlan

    conns = student_profile.parent_connections.filter(is_active=True, parent_chat_id__isnull=False)
    student_name = student_profile.user.get_full_name() or student_profile.user.username

    # Narx tarif katalogidan olinadi: ilgari bu yerda 39,000 qattiq yozilgan edi, sayt esa
    # oylik PRO uchun boshqa narx olardi — ota-ona bir narxni ko'rib, boshqasini to'lardi.
    plan = (SubscriptionPlan.objects.filter(id=plan_id, is_active=True).first() if plan_id else None) or (
        SubscriptionPlan.objects.filter(plan_type='lessons', duration_days=30, is_active=True).first())
    price_text = f"{int(plan.price):,}".replace(',', ' ') + " so'm" if plan else ''
    period_text = f" / {plan.duration_days} kun" if plan and plan.duration_days else ''

    invoice_text = (
        f"🎓 <b>Hurmatli ota-ona!</b>\n\n"
        f"Farzandingiz <b>{student_name}</b> Milliy Sertifikat va Davlat Imtihonlaridan "
        f"<b>A+ daraja (175+ ball)</b> to'plab, Davlat Granti asosida talaba bo'lishi uchun "
        f"platformada to'liq <b>VIP O'quv Dasturini (24/7 AI Ustoz, BMB Stress Zali va Barcha Darslar)</b> "
        f"faollashtirishni so'ramoqda.\n\n"
        + (f"💰 <b>Narxi:</b> {price_text}{period_text}.\n\n" if price_text else "")
        + "Farzandingizning ilmiga sarmoya kiritish uchun quyidagi tugma orqali faollashtirishingiz mumkin:"
    )

    origin = getattr(settings, 'FRONTEND_URL', 'https://ilmildizi.uz')
    # Ota-ona farzandining akkauntiga kira olmaydi: imzolangan havola uni to'g'ridan-to'g'ri
    # shu o'quvchi va tarif uchun to'lov sahifasiga olib boradi. Ilgari bu yerda
    # /premium?student_id=... edi — u sahifa parametrni o'qimas va login talab qilardi.
    if plan:
        from premium.services import make_parent_checkout_token
        checkout_url = f"{origin}/pay/{make_parent_checkout_token(student_profile, plan)}"
    else:
        checkout_url = f"{origin}/premium"

    keyboard = {
        'inline_keyboard': [
            # To'lov hozircha karta orqali qabul qilinadi (Click/Payme ulanmagan).
            [{'text': f"💳 Karta orqali to'lash ({price_text})" if price_text else "💳 Karta orqali to'lash",
              'url': checkout_url}],
        ]
    }

    sent_count = 0
    for conn in conns:
        if conn.parent_chat_id:
            res = send_message(conn.parent_chat_id, invoice_text, reply_markup=keyboard)
            if res.get('ok'):
                sent_count += 1

    return sent_count, checkout_url, invoice_text


# ─── 4-MODUL: B2B2C Sinf Janglari (Teacher Live Room) ────────────────────────
def create_class_battle_room(teacher_user: User, title: str, subject_id: int = None, topic_id: int = None, test_id: int = None, question_count: int = 10):
    """O'qituvchi uchun 6 xonali PIN-kodli jonli xona yaratish."""
    # 6 xonali unikal PIN kod yaratish
    pin_code = None
    for _ in range(20):
        candidate = f"{random.randint(100000, 999999)}"
        if not ClassBattleRoom.objects.filter(pin_code=candidate, status__in=['waiting', 'live']).exists():
            pin_code = candidate
            break
    if not pin_code:
        pin_code = f"{random.randint(100000, 999999)}"

    # Savollarni tanlash (test berilmasa — jonli mock/qoralama savollarisiz puldan)
    from tests_app.services.question_pool import practice_question_pool
    qs = practice_question_pool()
    if test_id:
        from tests_app.models import TestSet
        t_obj = TestSet.objects.filter(id=test_id).first()
        if t_obj:
            qs = t_obj.questions.all()
            if not subject_id and t_obj.subject_id:
                subject_id = t_obj.subject_id
    elif topic_id:
        qs = qs.filter(topic_id=topic_id)
    elif subject_id:
        qs = qs.filter(subject_id=subject_id)

    q_ids = list(qs.values_list('id', flat=True)[:question_count])
    if len(q_ids) < question_count:
        fallback_ids = list(practice_question_pool().exclude(id__in=q_ids)
                            .values_list('id', flat=True)[:question_count - len(q_ids)])
        q_ids.extend(fallback_ids)

    room = ClassBattleRoom.objects.create(
        teacher=teacher_user,
        title=title or "Guruh Imtihon Jangi",
        subject_id=subject_id,
        topic_id=topic_id,
        pin_code=pin_code,
        status='waiting',
        question_ids=q_ids,
    )
    return room


def calculate_class_battle_analytics(room: ClassBattleRoom):
    """Sinf jangi tugaganda o'qituvchi uchun qimmatli tahlil:
    - Guruhning o'rtacha o'zlashtirishi
    - Top-3 Podest g'oliblari
    - 🚨 Eng ko'p xato qilingan 3 ta savol (doskada tushuntirish uchun)
    - Orqada qolayotgan o'quvchilar
    """
    participants = list(room.participants.all().order_by('-score', '-correct_count'))
    total_parts = len(participants)
    total_q_count = len(room.question_ids) or 10

    if total_parts == 0:
        return {
            'total_participants': 0,
            'avg_mastery': 0,
            'average_score': 0,
            'podium': [],
            'hardest_questions': [],
            'struggling_students': [],
        }

    avg_score = sum(p.score for p in participants) / total_parts
    avg_mastery = round((sum(p.correct_count for p in participants) / (total_parts * total_q_count)) * 100, 1)

    # Top-3 Podest
    podium = []
    for idx, p in enumerate(participants[:3]):
        podium.append({
            'rank': idx + 1,
            'nickname': p.nickname,
            'avatar': p.profile.avatar_url,
            'score': p.score,
            'correct_count': p.correct_count,
            'accuracy_rate': round(p.correct_count / total_q_count * 100, 1),
        })

    # Savollar bo'yicha xatolar tahlili
    q_stats = {qid: {'total': 0, 'wrong': 0} for qid in room.question_ids}
    for p in participants:
        answers = p.answers or {}
        for qid_str, ans_data in answers.items():
            try:
                qid = int(qid_str)
                if qid in q_stats:
                    q_stats[qid]['total'] += 1
                    if not ans_data.get('is_correct'):
                        q_stats[qid]['wrong'] += 1
            except (ValueError, TypeError):
                pass

    sorted_q_mistakes = sorted(
        q_stats.items(),
        key=lambda item: (item[1]['wrong'] / max(1, item[1]['total'])),
        reverse=True,
    )

    hardest_q_ids = [item[0] for item in sorted_q_mistakes[:3] if item[1]['wrong'] > 0]
    hardest_questions_objs = {q.id: q for q in Question.objects.filter(id__in=hardest_q_ids).prefetch_related('choices')}

    hardest_questions_data = []
    for qid in hardest_q_ids:
        q_obj = hardest_questions_objs.get(qid)
        if q_obj:
            stats = q_stats[qid]
            wrong_pct = round((stats['wrong'] / max(1, stats['total'])) * 100)
            correct_choice = next((c.text for c in q_obj.choices.all() if c.is_correct), '')
            hardest_questions_data.append({
                'id': q_obj.id,
                'body': q_obj.body,
                'wrong_percentage': wrong_pct,
                'wrong_count': stats['wrong'],
                'correct_answer': correct_choice,
                'explanation': q_obj.explanation or "Ushbu savol o'quvchilar tomonidan eng ko'p adashtirilgan.",
                # O'qituvchi sahifasi (teacher/battles) shu nomlarni kutadi.
                'question_id': q_obj.id,
                'question_text': q_obj.body,
                'correct_count': stats['total'] - stats['wrong'],
                'total_answers': stats['total'],
                'accuracy_percent': 100 - wrong_pct,
            })

    # Orqada qolayotganlar (pastki 30% yoki 50% dan past ball)
    struggling = []
    for p in participants:
        pct = (p.correct_count / total_q_count) * 100
        if pct < 60:
            struggling.append({
                'nickname': p.nickname,
                'correct_count': p.correct_count,
                'total_questions': total_q_count,
                'mastery_pct': round(pct, 1),
                'accuracy_percent': round(pct, 1),
            })

    return {
        'total_participants': total_parts,
        'avg_score': round(avg_score, 1),
        'avg_mastery': avg_mastery,
        'average_score': avg_mastery,
        'podium': podium,
        'hardest_questions': hardest_questions_data,
        'struggling_students': struggling[:5],
    }



# ─── B2B HYPER-TARGET ADS & LEAD SERVICES ────────────────────────────────────

def get_hyper_targeted_offer(profile: Profile, subject: str = "", score: float = 0.0, region: str = ""):
    """Geo + zaif fan bo'yicha O'quv markaz taklifi (feed banneri uchun).

    Tanlash mantiqi `b2b_ads.services.pick_campaign` da — dashboard kartasi bilan bir xil manba.
    """
    from b2b_ads.services import campaign_payload, pick_campaign, record_impression

    campaign = pick_campaign(profile, subject=subject, score=score, region=region)
    if not campaign:
        return None
    record_impression(campaign)

    payload = campaign_payload(campaign)
    payload.update({
        'center_id': campaign.id,
        'center_logo': payload['logo'],
        'cta_text': "📞 Bepul darsga yozilish (1-dars BEPUL)",
        'badge_text': campaign.offer_badge,
        'banner_url': campaign.logo,
        'video_url': campaign.story_video_url,
        'score_received': score,
        'subject': subject or campaign.target_subject,
    })
    return payload


def submit_center_lead(profile: Profile, campaign_id: int, phone: str, name: str = "", subject: str = "", score: float = 0.0, weak_topics: str = ""):
    """Feed banneridan lid. Atomik va bir kampaniyaga bir marta mukofotli —
    `b2b_ads.services.submit_lead` ga topshiriladi. Xato bo'lsa `LeadError` ko'tariladi."""
    from b2b_ads.services import submit_lead

    lead_name = name or profile.user.get_full_name() or profile.user.username
    return submit_lead(
        profile=profile,
        campaign_id=campaign_id,
        full_name=lead_name,
        phone_number=phone,
        weakest_topics=weak_topics or subject,
        predicted_dtm_score=str(score or ''),
    )


def calculate_student_radar(profile: Profile):
    """O'quvchining 6 burchakli radari — analytics.services.compute_skill_radar dan.

    Ilgari bu yerda alohida formula bor edi: "Tezlik" darajadan, "Esse" XP'dan olinardi,
    yangi o'quvchiga esa soxta 55/60/45 qiymatlar qaytarilardi; "Aniqlik" esa mavjud
    bo'lmagan `total_questions` maydoni sabab 100% dan oshib ketardi. Endi profil, analitika
    va ota-ona radari bitta manbadan foydalanadi. Ma'lumot yo'q o'q — None.
    """
    from analytics.services import compute_skill_radar

    radar = compute_skill_radar(profile)
    data = {key: axis['value'] for key, axis in radar['axes'].items()}
    data['overall_power'] = radar['overall']
    data['axes'] = radar['axes']
    data['has_data'] = radar['has_data']
    return data
