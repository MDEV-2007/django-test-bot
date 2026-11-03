import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from panel.models import Broadcast
from panel.broadcasting import caption_lookup, has_telegram, personalize, select_recipients
from core.models import Notification
from accounts.utils import execute_telegram_broadcast

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
                profiles = select_recipients(bc)
                Notification.objects.bulk_create([
                    Notification(profile=p, title=bc.title, message=personalize(bc.message, p), type='system')
                    for p in profiles
                ])
                bc.recipients_count = len(profiles)
                bc.recipient_ids = [p.id for p in profiles]

                if bc.via_telegram:
                    caption = f"{bc.title}\n\n{bc.message}"
                    image_path = bc.image.path if (bc.image and bc.image.storage.exists(bc.image.name)) else None
                    tg_profiles = [p for p in profiles if has_telegram(p)]
                    tg_ids = [p.telegram_id for p in tg_profiles]

                    def _progress(sent, total):
                        Broadcast.objects.filter(id=bc.id).update(telegram_sent_count=sent)

                    res = execute_telegram_broadcast(
                        telegram_ids=tg_ids,
                        caption=caption,
                        image_path=image_path,
                        on_progress=_progress,
                        caption_for=caption_lookup(bc, tg_profiles),
                    )
                    bc.telegram_sent_count = res['sent_count']

                bc.is_sent = True
                bc.sent_at = timezone.now()
                bc.save()

                self.stdout.write(self.style.SUCCESS(
                    f"✓ '{bc.title}' xabari {bc.recipients_count} kishiga yuborildi (TG: {bc.telegram_sent_count})."
                ))
            except Exception as e:
                logger.exception("Failed to send broadcast #%s: %s", bc.id, e)
                self.stderr.write(self.style.ERROR(f"✗ Broadcast #{bc.id} da xatolik: {e}"))
