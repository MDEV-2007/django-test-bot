"""Kunlik vazifalar (missiyalar) progressi — bitta joyda.

Ilgari bu mantiq to'rt joyda (test, dars, arena API, arena WebSocket) qo'lda takrorlangan
edi va ular bir-biridan farq qilib ketgan: test va dars uchun vazifa bajarilganda
bildirishnoma yuborilardi, arena uchun yo'q; arena esa progressni FAQAT g'alaba
holatida oshirardi, holbuki vazifa matni "1 ta jangda qatnashish" deydi — ya'ni
yutqazgan o'quvchi jangda qatnashsa ham vazifasi bajarilmay qolardi.
"""
from django.db.models import F
from django.utils import timezone

from .models import Notification, ProfileMission


def advance_missions(profile, action_type, amount=1):
    """Bugungi `action_type` turidagi vazifalar progressini `amount` ga oshiradi.

    Vazifa maqsadga yetganda mukofot bir marta beriladi (`is_completed` qo'riqchisi) va
    o'quvchiga bildirishnoma yuboriladi. Bajarilgan vazifalar ro'yxati qaytariladi —
    chaqiruvchi kerak bo'lsa javobda nishonlash animatsiyasini ko'rsatishi mumkin.
    """
    completed = []
    today = timezone.localdate()

    for pm in (ProfileMission.objects
               .filter(profile=profile, date=today, mission__action_type=action_type)
               .select_related('mission')):
        ProfileMission.objects.filter(pk=pm.pk).update(current_count=F('current_count') + amount)
        pm.refresh_from_db(fields=['current_count', 'is_completed'])
        if pm.current_count < pm.mission.target_count or pm.is_completed:
            continue
        # Atomik "egallash": parallel so'rovlar (masalan ikki test bir vaqtda yakunlansa)
        # vazifa mukofotini ikki marta bermasin — faqat False -> True qilgan so'rov beradi.
        if ProfileMission.objects.filter(pk=pm.pk, is_completed=False).update(is_completed=True):
            pm.is_completed = True
            profile.add_xp(pm.mission.xp_reward)
            profile.add_coins(pm.mission.coin_reward)
            Notification.objects.create(
                profile=profile,
                title="Vazifa bajarildi!",
                message=(f"'{pm.mission.title}' vazifasi uchun +{pm.mission.xp_reward} XP "
                         f"va +{pm.mission.coin_reward} tanga oldingiz!"),
                type='mission',
            )
            completed.append(pm)

    return completed
