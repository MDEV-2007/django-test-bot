"""Majburiy kanal obunasi nima uchun ishlamayotganini bir buyruqda aniqlaydi.

    python manage.py check_channel_gate
    python manage.py check_channel_gate --user 123456789

NEGA KERAK
----------
Gate ATAYLAB "ochiq" holatga tushadi (telegrambot/subscription.py): kanal sozlanmagan,
bot kanalda admin emas yoki Telegram javob bermasa — hech kim bloklanmaydi. Bu to'g'ri
qaror (aks holda bitta noto'g'ri sozlama butun platformani yopib qo'yardi), lekin
yon ta'siri bor: "hech kim bloklanmayapti" degan bitta belgidan KAMIDA to'rt xil sabab
kelib chiqadi va ularni bir-biridan ajratish qiyin.

Bu komanda o'sha to'rt sababni ketma-ket tekshirib, qaysi biri ekanini aytadi.
"""
from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand

from telegrambot import subscription
from telegrambot.client import _DOWN_KEY, api_call


class Command(BaseCommand):
    help = "Majburiy kanal obunasi sozlamasini tekshiradi va sababni ko'rsatadi."

    def add_arguments(self, parser):
        parser.add_argument('--user', dest='user_id', default=None,
                            help="Aniq foydalanuvchining telegram_id'si bo'yicha tekshirish.")

    def handle(self, *args, **options):
        ok = self.style.SUCCESS
        bad = self.style.ERROR
        warn = self.style.WARNING

        def line(label, value, style=None):
            text = f"  {label:<24} {value}"
            self.stdout.write(style(text) if style else text)

        # ── 1. Sozlama ────────────────────────────────────────────────────────────
        self.stdout.write("\n1. SOZLAMA")
        chan = subscription.channel()
        token = bool(settings.TELEGRAM_BOT_TOKEN)
        flag = getattr(settings, 'REQUIRE_CHANNEL_SUBSCRIPTION', False)

        line("TELEGRAM_REQUIRED_CHANNEL", repr(chan) if chan else "(bo'sh)",
             None if chan else bad)
        line("REQUIRE_CHANNEL_SUBSCRIPTION", flag, None if flag else bad)
        line("TELEGRAM_BOT_TOKEN", "bor" if token else "YO'Q", None if token else bad)

        if not subscription.is_required():
            line("gate faol", "YO'Q", bad)
            self.stdout.write(bad(
                "\nXULOSA: gate umuman o'chirilgan. Yuqoridagi uchtasidan qaysi biri "
                "bo'sh/False bo'lsa — sabab o'sha.\n"
                "backend/.env ga yozib, `docker compose up -d web` bilan konteynerni "
                "QAYTA YARATING (restart yetmaydi)."))
            return
        line("gate faol", "HA", ok)

        # ── 2. Telegram bilan aloqa ───────────────────────────────────────────────
        self.stdout.write("\n2. TELEGRAM ALOQASI")
        if cache.get(_DOWN_KEY):
            line("aloqa", "UZILGAN (circuit breaker ochiq)", bad)
            self.stdout.write(bad(
                "\nXULOSA: server Telegram API'ga chiqa olmayapti, shuning uchun gate "
                "ochiq qolyapti. Serverdan tashqi ulanishni tekshiring."))
            return

        me = api_call('getMe')
        if not me.get('ok'):
            line("getMe", me.get('description') or me, bad)
            self.stdout.write(bad("\nXULOSA: bot tokeni ishlamayapti."))
            return
        bot = me['result']
        line("bot", f"@{bot.get('username')} (id={bot.get('id')})", ok)

        # ── 3. Botning kanaldagi huquqi ───────────────────────────────────────────
        self.stdout.write("\n3. BOTNING KANALDAGI HUQUQI")
        member = api_call('getChatMember', chat_id=chan, user_id=bot.get('id'))
        if not member.get('ok'):
            line("getChatMember", member.get('description') or member, bad)
            self.stdout.write(bad(
                f"\nXULOSA: bot {chan} kanalida a'zolarni ko'ra olmayapti — deyarli har doim "
                f"bu bot o'sha kanalda ADMIN emasligini bildiradi.\n"
                f"Tuzatish: {chan} kanali sozlamalarida @{bot.get('username')} ni administrator "
                f"qiling (qo'shimcha huquq shart emas, a'zolarni ko'rish yetarli)."))
            return

        status = (member.get('result') or {}).get('status')
        if status != 'administrator':
            line("bot statusi", status, bad)
            self.stdout.write(bad(
                f"\nXULOSA: bot kanalda '{status}' — admin emas. Obunani tekshirish uchun "
                f"ADMIN bo'lishi shart, aks holda gate doim ochiq qoladi."))
            return
        line("bot statusi", "administrator", ok)

        # ── 4. Aniq foydalanuvchi ─────────────────────────────────────────────────
        user_id = options['user_id']
        if not user_id:
            self.stdout.write(ok(
                "\nXULOSA: sozlama to'g'ri, gate ishlashi kerak.\n"
                "Agar o'zingizda bloklanmayotgan bo'lsa — siz kanalning egasi yoki "
                "adminisiz (status 'creator'/'administrator' ham a'zolik hisoblanadi).\n"
                "Sinash uchun kanalda BO'LMAGAN boshqa hisobdan /start yuboring, yoki:\n"
                "  python manage.py check_channel_gate --user <telegram_id>"))
            return

        self.stdout.write(f"\n4. FOYDALANUVCHI {user_id}")
        raw = api_call('getChatMember', chat_id=chan, user_id=user_id)
        if not raw.get('ok'):
            line("javob", raw.get('description') or raw, warn)
        else:
            line("status", (raw.get('result') or {}).get('status'))

        subscription.invalidate(user_id)
        subscribed = subscription.is_subscribed(user_id, use_cache=False)
        line("gate qarori", "o'tkazadi" if subscribed else "BLOKLAYDI",
             ok if not subscribed else warn)

        if subscribed:
            self.stdout.write(warn(
                "\nXULOSA: bu foydalanuvchi o'tkaziladi. Sababi yuqoridagi status — "
                "'member'/'administrator'/'creator' bo'lsa u haqiqatan kanal a'zosi."))
        else:
            self.stdout.write(ok("\nXULOSA: gate bu foydalanuvchini bloklaydi — to'g'ri ishlayapti."))
