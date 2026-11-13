"""Do'stlik Zanjiri: kechki (22:00) avtomatik eslatma. Cron: deploy/scripts/crontab.example."""
from django.core.management.base import BaseCommand

from core.services import send_buddy_evening_nudges


class Command(BaseCommand):
    help = "Sherigi bugun test ishlagan, o'zi ishlamagan o'quvchilarga Do'stlik Zanjiri eslatmasi yuboradi."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Yubormasdan faqat sonini ko'rsatadi.")

    def handle(self, *args, **options):
        res = send_buddy_evening_nudges(dry_run=options['dry_run'])
        prefix = 'DRY RUN: ' if options['dry_run'] else ''
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Do'stlik eslatmasi: {res['sent']} ta, Telegram xatosi: {res['failed']} ta."
        ))
