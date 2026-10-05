"""Variable Reward & Gamification Engine:
1. Daily Mystery Chest (Kundalik sirli sandiq) — tasodifiy mukofotlar, streak multiplikatori.
2. Lucky Test Bonus (Omadli test bonusi) — test yakunida kutilmagan dopamin bonusi.
"""
import random
from datetime import datetime, time, timedelta
from django.db import transaction
from django.utils import timezone

from accounts.models import Profile
from core.models import DailyChestClaim, Notification


def calculate_streak_bonus_pct(streak: int) -> int:
    """O'quvchining joriy streak (uzluksiz olov) kunlariga qarab foizli bonus."""
    if streak >= 30:
        return 60  # 30+ kun: +60%
    if streak >= 14:
        return 40  # 2 hafta+: +40%
    if streak >= 7:
        return 25  # 1 hafta+: +25%
    if streak >= 3:
        return 15  # 3 kun+: +15%
    return 0


def get_daily_chest_status(profile: Profile) -> dict:
    """Foydalanuvchining bugungi sirli sandiq holatini hisoblaydi."""
    today = timezone.localdate()
    claim = DailyChestClaim.objects.filter(profile=profile, date=today).first()
    
    # Keyingi tungi 00:00 gacha qolgan soniya
    now = timezone.localtime()
    tomorrow_start = timezone.make_aware(
        datetime.combine(today + timedelta(days=1), time.min),
        timezone.get_current_timezone()
    )
    seconds_remaining = max(0, int((tomorrow_start - now).total_seconds()))

    streak = profile.streak or 0
    bonus_pct = calculate_streak_bonus_pct(streak)

    return {
        'can_claim': claim is None,
        'seconds_remaining': seconds_remaining,
        'streak': streak,
        'streak_bonus_pct': bonus_pct,
        'today_claim': {
            'reward_type': claim.reward_type,
            'reward_amount': claim.reward_amount,
            'reward_title': claim.reward_title,
            'rarity': claim.rarity,
            'streak_bonus_pct': claim.streak_bonus_pct,
            'claimed_at': claim.claimed_at.isoformat(),
        } if claim else None,
    }


@transaction.atomic
def open_daily_chest(profile_id: int) -> dict:
    """Foydalanuvchi uchun kunlik sirli sandiqni ochadi va o'zgaruvchan mukofot (Variable Reward) beradi."""
    profile = Profile.objects.select_for_update().get(pk=profile_id)
    today = timezone.localdate()

    existing = DailyChestClaim.objects.filter(profile=profile, date=today).first()
    if existing:
        return {
            'success': False,
            'already_claimed': True,
            'message': "Bugungi sirli sandiqni allaqachon ochgansiz! Yangi sandiq ertaga ochiladi.",
            'claim': {
                'reward_type': existing.reward_type,
                'reward_amount': existing.reward_amount,
                'reward_title': existing.reward_title,
                'rarity': existing.rarity,
                'streak_bonus_pct': existing.streak_bonus_pct,
            }
        }

    streak = profile.streak or 0
    bonus_pct = calculate_streak_bonus_pct(streak)

    # 1. Kamyoblik (Rarity) bo'yicha tasodifiy tushish (Variable Reward ehtimolliklari)
    # Common (60%), Rare (25%), Epic (12%), Legendary (3%)
    roll = random.random()
    if roll < 0.60:
        rarity = 'common'
    elif roll < 0.85:
        rarity = 'rare'
    elif roll < 0.97:
        rarity = 'epic'
    else:
        rarity = 'legendary'

    # 2. Mukofot turini tanlash
    reward_type = 'coins'
    base_amount = 0
    reward_title = ""
    extra_note = ""

    if rarity == 'common':
        if random.random() < 0.5:
            reward_type = 'coins'
            base_amount = random.choice([25, 30, 40, 50])
        else:
            reward_type = 'xp'
            base_amount = random.choice([50, 60, 75, 100])

    elif rarity == 'rare':
        if random.random() < 0.5:
            reward_type = 'coins'
            base_amount = random.choice([80, 100, 120, 150])
        else:
            reward_type = 'xp'
            base_amount = random.choice([150, 180, 200, 250])

    elif rarity == 'epic':
        # Epic mukofotda Streak Freeze chiqish imkoniyati bor!
        if random.random() < 0.4:
            reward_type = 'streak_freeze'
            base_amount = 1
        else:
            reward_type = 'xp'
            base_amount = random.choice([300, 350, 400])

    else:  # legendary (3% - Jack-pot)
        reward_type = 'legendary_bundle'
        base_amount = 500  # 500 XP + 200 Coins

    # 3. Streak bonusini hisoblash
    final_amount = base_amount
    if reward_type in ('coins', 'xp'):
        bonus_val = int(base_amount * (bonus_pct / 100.0))
        final_amount = base_amount + bonus_val

    # 4. Foydalanuvchi balansiga qo'shish
    if reward_type == 'coins':
        profile.add_coins(final_amount)
        reward_title = f"+{final_amount} Tanga"
    elif reward_type == 'xp':
        profile.add_xp(final_amount)
        reward_title = f"+{final_amount} XP"
    elif reward_type == 'streak_freeze':
        reward_title = "1x Muzlatgich (Streak Freeze)"
        extra_note = "Olovingizni saqlab qolish uchun inventaringizga 1 ta Muzlatgich qo'shildi!"
        try:
            from shop.models import InventoryItem, ShopItem
            freeze_item = ShopItem.objects.filter(slug='streak_freeze').first()
            if freeze_item:
                inv, _ = InventoryItem.objects.get_or_create(profile=profile, item=freeze_item)
                inv.quantity += 1
                inv.save(update_fields=['quantity', 'updated_at'])
            else:
                # Agar shopda yo'q bo'lsa, zaxira sifatida 300 tanga beriladi
                reward_type = 'coins'
                final_amount = 300
                profile.add_coins(final_amount)
                reward_title = f"+{final_amount} Tanga"
        except Exception:
            reward_type = 'coins'
            final_amount = 250
            profile.add_coins(final_amount)
            reward_title = f"+{final_amount} Tanga"

    elif reward_type == 'legendary_bundle':
        bonus_val = int(base_amount * (bonus_pct / 100.0))
        final_xp = base_amount + bonus_val
        final_coins = 200 + int(200 * (bonus_pct / 100.0))
        profile.add_xp(final_xp)
        profile.add_coins(final_coins)
        reward_title = f"Afsonaviy To'plam: +{final_xp} XP & +{final_coins} Tanga!"
        final_amount = final_xp

    # 5. Tarixga yozish
    claim = DailyChestClaim.objects.create(
        profile=profile,
        date=today,
        reward_type=reward_type,
        reward_amount=final_amount,
        reward_title=reward_title,
        rarity=rarity,
        streak_at_claim=streak,
        streak_bonus_pct=bonus_pct,
    )

    # 6. Bildirishnoma yaratish
    rarity_labels = {
        'common': 'Oddiy',
        'rare': 'Noyob',
        'epic': 'Epik',
        'legendary': 'Afsonaviy'
    }
    Notification.objects.create(
        profile=profile,
        title=f"🎁 Sirli sandiq ochildi ({rarity_labels.get(rarity, '')})!",
        message=f"Siz kunlik sirli sandiqdan {reward_title} yutib oldingiz! {extra_note}",
        type='achievement',
    )

    return {
        'success': True,
        'claim': {
            'reward_type': claim.reward_type,
            'reward_amount': claim.reward_amount,
            'reward_title': claim.reward_title,
            'rarity': claim.rarity,
            'streak_at_claim': streak,
            'streak_bonus_pct': bonus_pct,
            'extra_note': extra_note,
        },
        'user_stats': {
            'coins': profile.coins,
            'xp': profile.xp,
            'level': profile.level,
            'streak': profile.streak,
        }
    }


def roll_test_lucky_bonus(profile: Profile, correct_answers: int, base_xp: int, base_coins: int) -> dict | None:
    """Test yakunida 25% ehtimollik bilan 'Lucky Critical Hit' kutilmagan mukofot beradi.
    Bu foydalanuvchida test topshirishdan keyingi dopamin darajasini keskin oshiradi.
    """
    if correct_answers <= 0:
        return None

    # 25% ehtimollik
    if random.random() > 0.25:
        return None

    bonus_types = [
        ('xp_crit', '⚡️ Kritik XP Bonusi', 0.5),      # +50% XP
        ('coin_rain', '🪙 Tanga Yomg\'iri', 1.0),      # +100% Coins
        ('super_lucky', '🌟 Super Omadli Zafari', 0.4), # +40% XP & Coins
    ]
    b_type, b_title, b_rate = random.choice(bonus_types)

    bonus_xp = 0
    bonus_coins = 0

    if b_type == 'xp_crit':
        bonus_xp = max(20, int(base_xp * b_rate))
        profile.add_xp(bonus_xp)
    elif b_type == 'coin_rain':
        bonus_coins = max(10, int(base_coins * b_rate))
        profile.add_coins(bonus_coins)
    elif b_type == 'super_lucky':
        bonus_xp = max(15, int(base_xp * b_rate))
        bonus_coins = max(5, int(base_coins * b_rate))
        profile.add_xp(bonus_xp)
        profile.add_coins(bonus_coins)

    return {
        'type': b_type,
        'title': b_title,
        'bonus_xp': bonus_xp,
        'bonus_coins': bonus_coins,
        'message': f"{b_title}: Qo'shimcha +{bonus_xp} XP va +{bonus_coins} Tanga taqdim etildi!" if bonus_coins and bonus_xp else (
            f"{b_title}: Qo'shimcha +{bonus_xp} XP berildi!" if bonus_xp else f"{b_title}: Qo'shimcha +{bonus_coins} Tanga berildi!"
        ),
    }
