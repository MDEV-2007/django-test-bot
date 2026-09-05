"""Mock tugagandan keyingi ish: reyting va natija xabari.

NEGA BITTA VAZIFA, HAR TOPSHIRIQDA EMAS
---------------------------------------
Reytingni har bir topshiriqda qayta hisoblash — 200 ta o'quvchi uchun 200 marta butun
ro'yxatni qayta tartiblash degani, ustiga har safar hamma o'rinlar siljib turadi.
Shuning uchun reyting mock TUGAGANDAN KEYIN bir marta hisoblanadi: shu paytda hamma
natija joyida turadi va o'rin bir marta beriladi.

Xabarlar ham shu yerdan ketadi. Telegram sekin va ishonchsiz, shuning uchun har bir
xabar `result_sent_at` bilan belgilanadi — buyruq qayta ishga tushsa, xabar ikkinchi
marta yuborilmaydi.
"""
import logging

from django.db import transaction
from django.utils import timezone

from core import background
from core.models import Notification
from telegrambot.client import send_message

from .grading import close_expired_attempts
from .models import MockAttempt, MockTest
from .services import computed_status, format_tashkent

logger = logging.getLogger(__name__)


def rank_attempts(mock):
    """Shu mock'ning barcha topshirilgan urinishlariga o'rin beradi.

    Tartib: ball bo'yicha kamayish tartibida, teng bo'lsa ERTAROQ topshirgan oldinda.
    Teng ballni vaqt bilan ajratish — imtihonlarda odatiy va tushunarli qoida.

    Bir xil ball bir xil o'rinni oladi (1, 2, 2, 4 — "standart raqobat" tartibi):
    ikkita o'quvchi bir xil natija bilan turli o'rin olsa, bu adolatsiz ko'rinadi.
    """
    attempts = list(
        MockAttempt.objects
        .filter(mock=mock, submitted_at__isnull=False)
        .order_by('-score', 'submitted_at', 'id')
    )

    previous_score, previous_rank = None, 0
    for index, attempt in enumerate(attempts, start=1):
        if attempt.score == previous_score:
            rank = previous_rank
        else:
            rank = index
            previous_score, previous_rank = attempt.score, index
        if attempt.rank != rank:
            attempt.rank = rank
            attempt.save(update_fields=['rank'])
    return attempts


def _result_text(mock_attempt, total_participants):
    """O'quvchiga boradigan xabar matni.

    Ball yaxlitlanadi: "66.66666%" imtihon natijasi sifatida o'qilmaydi.
    """
    breakdown = mock_attempt.breakdown or {}
    lines = [
        f"📊 {mock_attempt.mock.title} — natijangiz",
        '',
        f"Ball: {round(mock_attempt.score or 0)}%",
        f"To'g'ri: {breakdown.get('correct', 0)} · "
        f"Xato: {breakdown.get('wrong', 0)} · "
        f"Javobsiz: {breakdown.get('skipped', 0)}",
    ]
    if mock_attempt.rank:
        lines.append(f"O'rin: {mock_attempt.rank} / {total_participants}")

    pending = breakdown.get('pending_ai') or 0
    if pending:
        lines.append('')
        lines.append(f"⏳ {pending} ta yozma javob hali tekshirilmoqda — ball biroz o'zgarishi mumkin.")

    lines.append('')
    lines.append(f"O'qituvchi: {mock_attempt.mock.teacher.full_name}")
    return '\n'.join(lines)


def send_result(mock_attempt_id, total_participants):
    """Bitta o'quvchiga natijani yuboradi (fon vazifasi).

    Telegram ishlamasa ham ichki bildirishnoma qoladi — o'quvchi natijani saytda
    ko'radi. Shuning uchun bildirishnoma HAR DOIM yoziladi, Telegram esa "bo'lsa yaxshi".
    """
    mock_attempt = (MockAttempt.objects
                    .select_related('mock__teacher', 'student__user')
                    .filter(pk=mock_attempt_id).first())
    if mock_attempt is None or mock_attempt.result_sent_at is not None:
        return

    text = _result_text(mock_attempt, total_participants)

    Notification.objects.create(
        profile=mock_attempt.student,
        title="Mock natijasi tayyor",
        message=text,
        type='system',
    )

    telegram_id = mock_attempt.student.telegram_id
    if telegram_id:
        response = send_message(telegram_id, text)
        if not response.get('ok'):
            # Xabar ketmadi, lekin natija baribir tayyor va saytda ko'rinadi.
            logger.warning("Mock natijasi Telegram orqali yetmadi: urinish %s", mock_attempt_id)

    mock_attempt.result_sent_at = timezone.now()
    mock_attempt.save(update_fields=['result_sent_at'])


def publish_results(mock, moment=None, notify=True):
    """Mock yakunlangach: qolgan urinishlarni yopadi, reyting beradi, xabar yuboradi.

    IDEMPOTENT: `results_published_at` to'ldirilgan bo'lsa qayta ishlamaydi. Buyruq har
    5 daqiqada ishlasa ham reyting bir marta hisoblanadi va xabar bir marta ketadi.

    Mock hali tugamagan bo'lsa hech narsa qilmaydi — yarim yo'lda reyting berish
    o'quvchilarga noto'g'ri natija ko'rsatgan bo'lardi.
    """
    moment = moment or timezone.now()
    if computed_status(mock, moment) != 'finished':
        return None
    if mock.results_published_at is not None:
        return None

    # Topshirmay qolganlar ham reytingga kirishi kerak: ular nol emas, yozganicha ball
    # oladi.
    close_expired_attempts(moment)

    with transaction.atomic():
        mock = MockTest.objects.select_for_update().get(pk=mock.pk)
        if mock.results_published_at is not None:
            return None

        attempts = rank_attempts(mock)
        mock.status = 'finished'
        mock.results_published_at = moment
        mock.save(update_fields=['status', 'results_published_at', 'updated_at'])

    if notify:
        total = len(attempts)
        for attempt in attempts:
            if attempt.result_sent_at is None:
                background.submit(send_result, attempt.pk, total)

    return attempts


def publish_due_results(moment=None):
    """Tugagan, lekin natijasi hali e'lon qilinmagan mock'larni topib e'lon qiladi.

    Qaytaradi: e'lon qilingan mock'lar soni.
    """
    moment = moment or timezone.now()
    published = 0
    candidates = (MockTest.objects
                  .filter(results_published_at__isnull=True)
                  .exclude(status='draft')
                  .select_related('teacher'))
    for mock in candidates:
        if publish_results(mock, moment) is not None:
            published += 1
    return published


def leaderboard(mock, limit=50):
    """Mock reytingi — o'quvchiga ko'rsatish uchun.

    Faqat natijasi e'lon qilingan mock uchun ishlaydi: aks holda o'quvchi test
    davomida raqiblarining ballini ko'rib turgan bo'lardi.
    """
    if mock.results_published_at is None:
        return []
    rows = (MockAttempt.objects
            .filter(mock=mock, submitted_at__isnull=False)
            .select_related('student__user')
            .order_by('rank', 'submitted_at')[:limit])
    return [{
        'rank': row.rank,
        'student': row.student.user.get_full_name() or row.student.user.username,
        'score': round(row.score or 0, 1),
        'submitted_at': format_tashkent(row.submitted_at),
    } for row in rows]
