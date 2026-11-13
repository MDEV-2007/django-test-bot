"""Haftalik mikro-liga yakuni. Cron: yakshanba 22:00 (deploy/scripts/crontab.example)."""
from django.core.management.base import BaseCommand

from leaderboard.services import rollover_micro_leagues


class Command(BaseCommand):
    help = "Har divizionda Top-5 ni ligaga ko'taradi, oxirgi 5 tani tushiradi, haftalik XP'ni nolga qaytaradi."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="O'zgartirmasdan faqat sonlarni ko'rsatadi.")

    def handle(self, *args, **options):
        res = rollover_micro_leagues(dry_run=options['dry_run'])
        prefix = 'DRY RUN: ' if options['dry_run'] else ''
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Ko'tarildi: {res['promoted']}, tushdi: {res['demoted']}."
        ))
