"""Obuna tariflarini kanonik holatga keltiradi (idempotent).

    python manage.py seed_premium_plans                      # dry-run
    python manage.py seed_premium_plans --apply
    python manage.py seed_premium_plans --apply --prune-duplicates

Tariflar ta'rifi `premium/plan_catalog.py` faylida — bu yerda takrorlanmaydi, chunki
xuddi shu ro'yxatga `services.seed_plans_if_needed()` (har so'rovda ishlaydigan
bootstrap) ham tayanadi. Ikki joyda ikki xil ta'rif turgani uchun bir marta
katalogda dublikat tariflar paydo bo'lgan edi.

DUBLIKATLAR
-----------
`--prune-duplicates` bir xil `(plan_type, duration_days)` juftligiga ega ortiqcha
qatorlarni o'chiradi. Faqat TO'LOVI YO'Q qatorlar o'chiriladi: to'lov bog'langan
tarif o'chirilsa, `Payment.plan` CASCADE bo'lgani uchun to'lov tarixi ham yo'q
bo'lardi. To'lovi bor dublikat topilsa — o'chirilmaydi, faqat ogohlantiriladi
(uni admin panelda qo'lda `is_active=False` qilib qo'yish kifoya).
"""
from django.core.management.base import BaseCommand

from premium.plan_catalog import duplicate_plans, plans, sync_plans


class Command(BaseCommand):
    help = "Obuna tariflarining nomi, narxi va mazmunini kanonik holatga keltiradi."

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true',
                            help="Bazaga yozadi. Berilmasa faqat ko'rsatadi.")
        parser.add_argument('--prune-duplicates', action='store_true',
                            help="To'lovi yo'q dublikat tariflarni o'chiradi.")

    def handle(self, *args, **options):
        apply_changes = options['apply']
        prefix = '' if apply_changes else '[DRY-RUN] '

        self.stdout.write("Kanonik tariflar:")
        for spec in plans():
            self.stdout.write(f"  {spec['name']:<22} {int(spec['price']):>7,} so'm  "
                              f"({spec['duration_days']} kun)")

        if options['prune_duplicates']:
            self._prune(apply_changes)

        if apply_changes:
            created, updated = sync_plans(update_existing=True)
            for name in created:
                self.stdout.write(self.style.SUCCESS(f"+ yaratildi: {name}"))
            for name in updated:
                self.stdout.write(f"~ yangilandi: {name}")
            self.stdout.write(self.style.SUCCESS(
                f"Tayyor: {len(created)} ta yaratildi, {len(updated)} ta yangilandi."))
        else:
            self.stdout.write(self.style.WARNING(
                f"\n{prefix}hech nima yozilmadi. Qo'llash uchun: --apply"))

    def _prune(self, apply_changes):
        dupes = duplicate_plans()
        if not dupes:
            self.stdout.write("\nDublikat tarif topilmadi.")
            return

        self.stdout.write(f"\n{len(dupes)} ta dublikat tarif topildi:")
        for plan in dupes:
            payments = plan.payment_set.count()
            if payments:
                self.stdout.write(self.style.WARNING(
                    f"  ! {plan.name} (id={plan.id}) — {payments} ta to'lov bog'langan, "
                    f"O'CHIRILMAYDI. Admin panelda is_active=False qiling."))
                continue
            self.stdout.write(f"  - {plan.name} (id={plan.id}, {int(plan.price):,} so'm)")
            if apply_changes:
                plan.delete()
