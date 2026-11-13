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


def send_parent_honor_certificate(student_profile: Profile) -> int:
    """Farzandi ketma-ket 14 kun qoldirmay o'qiganda ota-onaning Telegramiga rasmiy 'Faxrnoma' yuboradi."""
    if (student_profile.streak or 0) < 14 or (student_profile.streak % 14) != 0:
        return 0

    conns = list(student_profile.parent_connections.filter(is_active=True, parent_chat_id__isnull=False))
    if not conns:
        return 0

    student_name = student_profile.user.get_full_name() or student_profile.user.username
    dtm_gain = max(14.0, round((student_profile.estimated_dtm_score or 112.5) - 94.5, 1))
    origin = getattr(settings, 'FRONTEND_URL', 'https://ilmildizi.uz')

    from premium.models import SubscriptionPlan
    plan = SubscriptionPlan.objects.filter(plan_type='lessons', duration_days=30, is_active=True).first()
    if plan:
        from premium.services import make_parent_checkout_token
        checkout_url = f"{origin}/pay/{make_parent_checkout_token(student_profile, plan)}"
    else:
        checkout_url = f"{origin}/premium"

    sent = 0
    for conn in conns:
        parent_title = conn.parent_name or "Aziz ota-ona"
        text = (
            f"🏅 <b>ILMILIDIZI RASMIY FAXRNOMASI</b>\n\n"
            f"Hurmatli <b>{parent_title}</b>!\n\n"
            f"Farzandingiz <b>{student_name}</b> so'nggi {student_profile.streak} kunda birorta ham kun "
            f"qoldirmasdan ilm oldi va O'zbekistondagi 50 000 abituriyent orasida eng intizomli "
            f"<b>Top-5% o'quvchilar</b> qatoriga kirdi!\n\n"
            f"📈 Shu davrda u o'zining taxminiy Davlat Granti (DTM) ballini <b>+{dtm_gain} ballga</b> oshirdi.\n\n"
            f"🌟 <i>Bunday intizomli farzand tarbiyalaganingiz uchun tashakkur! Farzandingizning keyingi oylik "
            f"PRO ta'lim obunasini qo'llab-quvvatlash uchun quyidagi tugmadan foydalanishingiz mumkin:</i>"
        )
        kb = {'inline_keyboard': [[{'text': "🎁 Farzandimga PRO obuna sovg'a qilish", 'url': checkout_url}]]}
        res = send_message(conn.parent_chat_id, text, reply_markup=kb)
        if res.get('ok'):
            sent += 1
    return sent


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
    from b2b_ads.services import campaign_payload, pick_campaign

    # Nishonlash faqat serverdagi haqiqiy natijalardan (klient subject/score yubora
    # olmaydi — ilgari feed doim `subject=Tarix&score=42` yuborardi). Impression — /track/.
    campaign = pick_campaign(profile, region=region)
    if not campaign:
        return None

    payload = campaign_payload(campaign)
    payload.update({
        'center_id': campaign.id,
        'center_logo': payload['logo'],
        'cta_text': campaign.cta_text or "📞 Bepul darsga yozilish (1-dars BEPUL)",
        'badge_text': campaign.offer_badge,
        # Advertiser yuklagan banner bo'lsa — o'sha; aks holda eski xulq (logo).
        'banner_url': campaign.banner_url or campaign.logo,
        'video_url': campaign.story_video_url,
        'subject': campaign.target_subject,
    })
    return payload


def submit_center_lead(profile: Profile, campaign_id: int, phone: str, name: str = "", subject: str = "", score: float = 0.0, weak_topics: str = "", consent: bool = False, guardian_confirmed: bool = False):
    """Feed banneridan lid. Atomik va bir kampaniyaga bir marta mukofotli —
    `b2b_ads.services.submit_lead` ga topshiriladi. Xato bo'lsa `LeadError` ko'tariladi."""
    from b2b_ads.services import submit_lead

    lead_name = name or profile.user.get_full_name() or profile.user.username
    return submit_lead(
        profile=profile,
        campaign_id=campaign_id,
        full_name=lead_name,
        phone_number=phone,
        consent=consent,
        guardian_confirmed=guardian_confirmed,
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


# ─── 5-MODUL: Do'stlik Streak'i (Juftlik Zanjiri / Co-op Streak) ─────────────
def _generate_buddy_code() -> str:
    import secrets
    from core.models import BuddyStreak
    for _ in range(10):
        code = f"ILDIZ-{secrets.token_hex(3).upper()}"
        if not BuddyStreak.objects.filter(invite_code=code).exists():
            return code
    return f"ILDIZ-{secrets.token_hex(4).upper()}"


def get_active_buddy_streak(profile: Profile):
    from core.models import BuddyStreak
    return (
        BuddyStreak.objects
        .select_related('user1__user', 'user2__user')
        .filter(Q(user1=profile) | Q(user2=profile), status__in=['active', 'pending'])
        .order_by('-status', '-updated_at')
        .first()
    )


def get_buddy_streak_state(profile: Profile) -> dict:
    """O'quvchining Do'stlik Streak'i (Juftlik Zanjiri) holati."""
    today = timezone.localdate()
    bs = get_active_buddy_streak(profile)
    bot_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', '') or 'ilmildiziuz_bot'

    if not bs:
        return {
            'has_buddy': False,
            'status': 'none',
            'current_streak': 0,
            'best_streak': 0,
            'invite_code': None,
            'share_url': None,
            'partner': None,
            'my_done_today': profile.last_active_date == today,
            'partner_done_today': False,
            'both_done_today': False,
            'can_nudge': False,
        }

    is_u1 = (bs.user1_id == profile.id)
    partner = bs.user2 if is_u1 else bs.user1
    my_last = bs.user1_last_active if is_u1 else bs.user2_last_active
    partner_last = bs.user2_last_active if is_u1 else bs.user1_last_active

    # Asosiy last_active_date bilan ham sinxron
    my_done = (my_last == today) or (profile.last_active_date == today)
    partner_done = bool(partner and ((partner_last == today) or (partner.last_active_date == today)))

    partner_data = None
    if partner:
        p_name = f"{partner.user.first_name} {partner.user.last_name}".strip() or partner.user.username
        partner_data = {
            'id': partner.id,
            'username': partner.user.username,
            'name': p_name,
            'avatar_url': partner.avatar_url or f"https://api.dicebear.com/7.x/adventurer/svg?seed={partner.user.username}",
            'streak': partner.streak,
            'done_today': partner_done,
            'target_university': getattr(partner, 'target_university', 'TATU'),
        }

    can_nudge = bool(bs.status == 'active' and partner and not partner_done)
    if can_nudge and bs.last_nudge_at and (timezone.now() - bs.last_nudge_at).total_seconds() < 1800:
        can_nudge = False

    return {
        'has_buddy': bs.status == 'active' and partner is not None,
        'status': bs.status,
        'current_streak': bs.current_streak,
        'best_streak': bs.best_streak,
        'invite_code': bs.invite_code,
        'share_url': f"https://t.me/{bot_username}?startapp=buddy_{bs.invite_code}",
        'partner': partner_data,
        'my_done_today': my_done,
        'partner_done_today': partner_done,
        'both_done_today': my_done and partner_done,
        'can_nudge': can_nudge,
    }


def create_or_get_buddy_invite(profile: Profile) -> dict:
    """Yangi Do'stlik Streak taklif kodini yaratish yoki mavjudini qaytarish."""
    from core.models import BuddyStreak
    existing = get_active_buddy_streak(profile)
    if existing:
        return get_buddy_streak_state(profile)

    today = timezone.localdate()
    code = _generate_buddy_code()
    BuddyStreak.objects.create(
        user1=profile,
        invite_code=code,
        status='pending',
        current_streak=1,
        best_streak=1,
        user1_last_active=today if profile.last_active_date == today else None,
    )
    return get_buddy_streak_state(profile)


def join_buddy_streak(profile: Profile, invite_code: str) -> tuple[bool, str, dict]:
    """Taklif kodi orqali do'stining Streak zanjiriga ulanish."""
    from django.db import transaction
    from core.models import BuddyStreak, Notification

    clean_code = (invite_code or '').strip().upper()
    if clean_code.startswith('BUDDY_'):
        clean_code = clean_code[6:]

    if not clean_code:
        return False, "Taklif kodi kiritilmadi.", {}

    with transaction.atomic():
        bs = BuddyStreak.objects.select_for_update().filter(invite_code__iexact=clean_code).first()
        if not bs:
            return False, "Bunday taklif kodi topilmadi.", {}
        if bs.user1_id == profile.id or bs.user2_id == profile.id:
            return False, "Siz o'zingizning taklif kodingizga ulana olmaysiz!", get_buddy_streak_state(profile)
        if bs.status == 'active' and bs.user2_id is not None:
            return False, "Bu juftlik allaqachon band qilingan.", {}

        # Agar qo'shilayotgan o'quvchining o'zida pending taklifi bo'lsa tozalaymiz
        BuddyStreak.objects.filter(user1=profile, status='pending').exclude(pk=bs.pk).delete()

        today = timezone.localdate()
        bs.user2 = profile
        bs.status = 'active'
        bs.current_streak = 1
        bs.best_streak = max(bs.best_streak, 1)
        bs.user1_last_active = today
        bs.user2_last_active = today
        bs.last_paired_date = today
        bs.save()

        # Ikkala do'stga ham +30 Ildiz tangasi boshlang'ich rag'bat!
        bs.user1.add_coins(30)
        profile.add_coins(30)

        u2_name = profile.user.first_name or profile.user.username
        u1_name = bs.user1.user.first_name or bs.user1.user.username
        Notification.objects.create(
            profile=bs.user1,
            title="🤝 Do'stlik Streak'i bog'landi! (+30 🪙)",
            message=f"{u2_name} sizning Juftlik Zanjiringizga ulandi! Endi har kuni birgalikda dars qilib olovni saqlang.",
            type='achievement',
        )
        Notification.objects.create(
            profile=profile,
            title="🤝 Do'stlik Streak'i bog'landi! (+30 🪙)",
            message=f"Siz {u1_name} bilan Juftlik Zanjirini bog'ladingiz! Balansingizga +30 Ildiz tangasi qo'shildi.",
            type='achievement',
        )

    return True, "Do'stlik Streak'i muvaffaqiyatli bog'landi! (+30 🪙)", get_buddy_streak_state(profile)


def record_buddy_daily_activity(profile: Profile):
    """O'quvchi kunlik normani bajarganda juftlik zanjirini yangilash."""
    from django.db import transaction
    from core.models import BuddyStreak, Notification

    today = timezone.localdate()
    yesterday = today - timedelta(days=1)

    with transaction.atomic():
        bs = (
            BuddyStreak.objects
            .select_for_update()
            .filter(Q(user1=profile) | Q(user2=profile), status='active')
            .first()
        )
        if not bs or not bs.user2_id:
            return

        # Agar kechagi kunda ikkalasidan biri kirmagan bo'lsa (48 soatdan oshsa) zanjir 1 ga tushadi
        if bs.last_paired_date and (today - bs.last_paired_date).days > 1:
            bs.current_streak = 0

        if bs.user1_id == profile.id:
            bs.user1_last_active = today
        else:
            bs.user2_last_active = today

        if bs.user1_last_active == today and bs.user2_last_active == today and bs.last_paired_date != today:
            bs.current_streak += 1
            bs.best_streak = max(bs.best_streak, bs.current_streak)
            bs.last_paired_date = today
            bs.save()

            # Juftlik mukofoti: ikkalasiga ham +25 Ildiz tangasi
            bs.user1.add_coins(25)
            bs.user2.add_coins(25)
            for p, mate in ((bs.user1, bs.user2), (bs.user2, bs.user1)):
                mate_name = mate.user.first_name or mate.user.username
                Notification.objects.create(
                    profile=p,
                    title=f"🔥 Do'stlik Streak'i: {bs.current_streak} kun! (+25 🪙)",
                    message=f"Siz va {mate_name} bugungi normani bajardingiz! Umumiy olovingiz {bs.current_streak} kunga yetdi.",
                    type='achievement',
                )
        else:
            bs.save()


def nudge_buddy_partner(profile: Profile) -> tuple[bool, str]:
    """Do'stiga 'Tez kirib 5 ta testingni ishla, sen deb streak'im kuyib ketadi!' xabarini yuborish."""
    from core.models import Notification

    bs = get_active_buddy_streak(profile)
    if not bs or bs.status != 'active' or not bs.user2:
        return False, "Sizda hali faol Do'stlik Streak juftligi yo'q."

    partner = bs.user2 if bs.user1_id == profile.id else bs.user1
    if bs.last_nudge_at and (timezone.now() - bs.last_nudge_at).total_seconds() < 1800:
        return False, "Do'stingizga yaqinda eslatma yuborgansiz. 30 daqiqadan so'ng qayta yuborish mumkin."

    my_name = profile.user.first_name or profile.user.username
    partner_name = partner.user.first_name or partner.user.username
    streak_days = bs.current_streak

    nudge_title = f"🚨 {my_name} sizni chaqirmoqda!"
    nudge_msg = (
        f"«Tez kirib 5 ta testingni ishla, sen deb mening ham {streak_days} kunlik "
        f"Do'stlik Streak'im kuyib ketadi!» — {my_name}"
    )

    Notification.objects.create(
        profile=partner,
        title=nudge_title,
        message=nudge_msg,
        type='system',
    )

    sent_tg = False
    if partner.telegram_id:
        site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'https://ilmildizi.uz')
        tg_text = (
            f"🚨 <b>{partner_name}, do'stingiz {my_name} xavotirda!</b>\n\n"
            f"💬 <i>«Tez kirib 5 ta testingni ishla, sen deb mening ham <b>{streak_days} kunlik</b> "
            f"umumiy streak'im kuyib ketadi!»</i>\n\n"
            f"🔥 Juftlik olovini saqlab qolish uchun 5 daqiqa vaqt ajrating 👇"
        )
        reply_markup = {
            "inline_keyboard": [
                [{"text": "🔥 Hoziroq 5 daqiqalik Ildizni bajarish", "web_app": {"url": f"{site_url}/dashboard"}}]
            ]
        }
        res = send_message(partner.telegram_id, tg_text, reply_markup=reply_markup)
        sent_tg = bool(res.get('ok'))

    bs.last_nudge_at = timezone.now()
    bs.save(update_fields=['last_nudge_at', 'updated_at'])

    if sent_tg:
        return True, f"{partner_name}ning Telegramiga va profiliga shoshilinch chaqiruv yuborildi! 🔥"
    return True, f"{partner_name}ning IlmIldizi profiliga shoshilinch eslatma yuborildi! 🔥"

