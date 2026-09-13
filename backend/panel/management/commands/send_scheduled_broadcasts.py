import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from panel.models import Broadcast
from panel.api import _audience_profiles
from core.models import Notification
from accounts.utils import send_telegram_message, send_telegram_photo

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Rejalashtirilgan xabarlarni (Broadcasts) vaqti kelganda avtomatik yuborish"

    def handle(self, *args, **options):
        now = timezone.now()
        pending = Broadcast.objects.filter(
            is_sent=False,
            scheduled_at__isnull=False,
            scheduled_at__lte=now,
        ).order_by('scheduled_at')

        count = pending.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("Rejalashtirilgan yangi xabarlar yo'q."))
            return

        self.stdout.write(f"{count} ta rejalashtirilgan xabar topildi. Yuborish boshlanmoqda...")

        for bc in pending:
            try:
                profiles = list(_audience_profiles(bc.audience))
                Notification.objects.bulk_create([
                    Notification(profile=p, title=bc.title, message=bc.message, type='system')
                    for p in profiles
                ])
                bc.recipients_count = len(profiles)

                if bc.via_telegram:
                    sent = 0
                    caption = f"{bc.title}\n\n{bc.message}"
                    has_image = bool(bc.image)
                    image_path = bc.image.path if has_image else None
                    file_id = ''
                    for p in profiles:
                        if not p.telegram_id:
                            continue
                        try:
                            if has_image:
                                result = send_telegram_photo(p.telegram_id, image_path, caption, file_id=file_id)
                                if isinstance(result, str):
                                    file_id = result
                                ok = bool(result)
                            else:
                                ok = send_telegram_message(p.telegram_id, caption)
                            if ok:
                                sent += 1
                        except Exception as tg_err:
                            logger.warning("Telegram send failed for %s: %s", p.telegram_id, tg_err)
                    bc.telegram_sent_count = sent

                bc.is_sent = True
                bc.sent_at = timezone.now()
                bc.save()

                self.stdout.write(self.style.SUCCESS(
                    f"✓ '{bc.title}' xabari {bc.recipients_count} kishiga yuborildi (TG: {bc.telegram_sent_count})."
                ))
            except Exception as e:
                logger.exception("Failed to send broadcast #%s: %s", bc.id, e)
                self.stderr.write(self.style.ERROR(f"✗ Broadcast #{bc.id} da xatolik: {e}"))
