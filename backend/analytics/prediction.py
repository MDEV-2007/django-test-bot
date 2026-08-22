"""DTM ball bashorati (Feature 2).

Falsafa: bu ML model EMAS va shunday ko'rsatilmaydi. MVP — o'quvchining haqiqiy
javoblaridan hisoblangan **og'irlikli o'rtacha**, ustiga ishonch darajasi (`confidence`)
qo'shilgan. Spec'da aytilganidek, regressiya/ML faqat 200+ real DTM natijasi
to'plangandan keyin ma'noga ega bo'ladi.

Hisob mantiqi:
  1. Har bir javob QIYINLIK darajasiga qarab og'irlik oladi (oson 0.7, o'rta 1.0,
     qiyin 1.4). Qiyin savolni to'g'ri yechish ko'proq, osonni yechish kamroq
     ma'lumot beradi.
  2. Mavzular bo'yicha natija alohida hisoblanadi, so'ng mavzular teng og'irlik bilan
     birlashtiriladi — bitta mavzudan 100 ta savol yechgan o'quvchi umumiy ballni
     sun'iy ko'tarib yubormasligi uchun.
  3. So'nggi javoblar ko'proq og'irlikka ega (o'sishni aks ettirish uchun): oxirgi 30
     kun ichidagi javoblar 1.0, undan eskilari 0.6 koeffitsient oladi.
  4. Ishonch darajasi javoblar soni va qamrab olingan mavzular soniga bog'liq.

Chegara: `MIN_ANSWERS` tadan kam javob bo'lsa, bashorat umuman berilmaydi —
"yetarli ma'lumot yo'q" holati qaytadi (noto'g'ri bashorat ishonchni yo'qotadi).
"""

from django.db.models import Count, Q
from django.utils import timezone

from tests_app.models import AttemptAnswer

# Bashorat uchun minimal javoblar soni (spec: 50–100).
MIN_ANSWERS = 50
# To'liq ishonch uchun kerak bo'lgan javoblar va mavzular soni.
FULL_CONFIDENCE_ANSWERS = 300
FULL_CONFIDENCE_TOPICS = 8

DIFFICULTY_WEIGHT = {'easy': 0.7, 'medium': 1.0, 'hard': 1.4}
RECENT_DAYS = 30
OLD_ANSWER_WEIGHT = 0.6

# Foizni DTM ballga o'tkazish. O'zbekistonda 1-blok maksimal balli 189.
# Bu CHIZIQLI taxmin — real natijalar bilan kalibrlanmagan, shuning uchun UI'da
# doim "taxminiy" deb ko'rsatiladi va ishonch darajasi yoniga qo'yiladi.
DTM_MAX_SCORE = 189


def _weight(answer, now):
    w = DIFFICULTY_WEIGHT.get(answer.question.difficulty, 1.0)
    if answer.answered_at and (now - answer.answered_at).days > RECENT_DAYS:
        w *= OLD_ANSWER_WEIGHT
    return w


def predict(profile):
    """O'quvchi uchun joriy bashoratni hisoblaydi (bazaga yozmaydi).

    Qaytadi: {'ready': bool, 'sample_size': int, 'topics_covered': int,
              'predicted_percent': float|None, 'predicted_dtm': int|None,
              'confidence': float|None, 'confidence_label': str,
              'topic_breakdown': [...]}
    """
    now = timezone.now()
    answers = list(
        AttemptAnswer.objects
        .filter(attempt__profile=profile, attempt__is_completed=True)
        .select_related('question', 'question__topic')
    )
    sample_size = len(answers)

    # Mavzular kesimi: har bir mavzu uchun og'irlikli to'g'ri javob ulushi.
    per_topic = {}
    for a in answers:
        topic = a.question.topic
        key = topic.id if topic else None
        bucket = per_topic.setdefault(key, {
            'title': topic.title if topic else 'Mavzusiz savollar',
            'weight_sum': 0.0, 'correct_sum': 0.0, 'answers': 0,
        })
        w = _weight(a, now)
        bucket['weight_sum'] += w
        bucket['correct_sum'] += w if a.is_correct else 0.0
        bucket['answers'] += 1

    topics = [
        {'topic_id': k, 'title': b['title'], 'answers': b['answers'],
         'score': round(b['correct_sum'] / b['weight_sum'] * 100, 1)}
        for k, b in per_topic.items() if b['weight_sum'] > 0
    ]
    topics.sort(key=lambda t: t['score'])
    topics_covered = len([t for t in topics if t['topic_id'] is not None])

    if sample_size < MIN_ANSWERS or not topics:
        return {
            'ready': False,
            'sample_size': sample_size,
            'needed': MIN_ANSWERS,
            'topics_covered': topics_covered,
            'predicted_percent': None,
            'predicted_dtm': None,
            'confidence': None,
            'confidence_label': 'insufficient',
            'topic_breakdown': topics,
        }

    # Mavzular teng og'irlik bilan birlashtiriladi (2-qoida).
    percent = sum(t['score'] for t in topics) / len(topics)

    # Ishonch: javoblar hajmi (70%) + mavzu qamrovi (30%).
    volume = min(1.0, sample_size / FULL_CONFIDENCE_ANSWERS)
    coverage = min(1.0, topics_covered / FULL_CONFIDENCE_TOPICS)
    confidence = round(0.7 * volume + 0.3 * coverage, 2)
    label = 'high' if confidence >= 0.75 else 'medium' if confidence >= 0.45 else 'low'

    return {
        'ready': True,
        'sample_size': sample_size,
        'needed': MIN_ANSWERS,
        'topics_covered': topics_covered,
        'predicted_percent': round(percent, 1),
        'predicted_dtm': round(percent / 100 * DTM_MAX_SCORE),
        'dtm_max': DTM_MAX_SCORE,
        'confidence': confidence,
        'confidence_label': label,
        'topic_breakdown': topics,
    }


def save_prediction(profile):
    """Bashoratni hisoblab, tarix uchun yangi qator yozadi.

    Har bashorat alohida qator sifatida saqlanadi (spec) — shundan progress grafigi
    quriladi. Kuniga bir martadan ko'p yozilmaydi: aks holda har test yakunida jadval
    shishib ketardi, grafik esa foydali ma'lumot bermas edi.
    """
    from .models import ScorePrediction

    data = predict(profile)
    if not data['ready']:
        return None

    today = timezone.localdate()
    existing = ScorePrediction.objects.filter(profile=profile, calculated_at__date=today).first()
    if existing:
        existing.predicted_percent = data['predicted_percent']
        existing.predicted_dtm = data['predicted_dtm']
        existing.confidence = data['confidence']
        existing.sample_size = data['sample_size']
        existing.calculated_at = timezone.now()
        existing.save()
        return existing

    return ScorePrediction.objects.create(
        profile=profile,
        predicted_percent=data['predicted_percent'],
        predicted_dtm=data['predicted_dtm'],
        confidence=data['confidence'],
        sample_size=data['sample_size'],
    )


def tagging_status():
    """Ichki ko'rsatkich: savollar bazasi qanchalik tag'langan (spec: admin endpoint).

    Bashoratning butun aniqligi shu ma'lumotga bog'liq — mavzusiz savol mavzular
    kesimiga tushmaydi.
    """
    from tests_app.models import Question

    rows = Question.objects.aggregate(
        total=Count('id'),
        with_topic=Count('id', filter=Q(topic__isnull=False)),
    )
    by_difficulty = list(
        Question.objects.values('difficulty').annotate(count=Count('id')).order_by('-count')
    )
    total = rows['total'] or 0
    return {
        'total': total,
        'with_topic': rows['with_topic'],
        'without_topic': total - rows['with_topic'],
        'topic_coverage_percent': round(rows['with_topic'] / total * 100) if total else 0,
        'by_difficulty': by_difficulty,
    }
