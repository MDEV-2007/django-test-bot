from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class DailyLearningLoop(models.Model):
    """
    O'quvchining bir kunlik yopiq zanjirli Avtopilot Konveyeri (State-Machine).
    Decision fatigue'ni yo'qotish uchun har bir bosqich keyingi bosqichni avtomatik uyg'otadi.
    """
    STAGE_1_WARMUP = 'STAGE_1_WARMUP'      # 60s Anti-Darslik Shpargalka
    STAGE_2_SPRINT = 'STAGE_2_SPRINT'      # 10-15 savollik Jonli Qasos Sprinti
    STAGE_3_CLEANUP = 'STAGE_3_CLEANUP'    # 90s Xatolar Dueli / Flashcard Tozalash
    STAGE_4_ARENA = 'STAGE_4_ARENA'        # 60s 1v1 Ghost Duel
    STAGE_5_COMPLETED = 'STAGE_5_COMPLETED' # Sikl yopildi -> Sandiq ochildi va Daraxt o'sdi!

    STAGE_CHOICES = [
        (STAGE_1_WARMUP, '1. 60s Anti-Darslik Shpargalka'),
        (STAGE_2_SPRINT, '2. Jonli Qasos Sprinti'),
        (STAGE_3_CLEANUP, '3. Xatolar Dueli (Flashcards)'),
        (STAGE_4_ARENA, '4. 1v1 Ghost Arena Duellashuv'),
        (STAGE_5_COMPLETED, '5. Sikl Bajarildi (Sandiq va Daraxt)'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_learning_loops'
    )
    date = models.DateField(default=timezone.localdate, db_index=True)
    cycle_number = models.PositiveIntegerField(default=1, help_text="Kun davomidagi nechanchi sikli")

    topic = models.ForeignKey(
        'learning.Topic',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='learning_loops',
        help_text="Hozirgi o'rganilayotgan yoki eng zaif aniqlangan mavzu"
    )
    subject = models.ForeignKey(
        'tests_app.Subject',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='learning_loops'
    )

    current_stage = models.CharField(
        max_length=32,
        choices=STAGE_CHOICES,
        default=STAGE_1_WARMUP,
        db_index=True
    )

    combo_multiplier = models.FloatField(
        default=1.0,
        help_text="Uzluksizlik ko'paytirgichi (1.0 -> 1.5 -> 2.0 -> 2.5)"
    )

    session_mistakes_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="Sprint davomida xato qilingan savollar ID ro'yxati (3-bosqichda tozalash uchun)"
    )

    dtm_score_delta = models.FloatField(
        default=0.0,
        help_text="Shu siklda qo'shilgan prognoz DTM / Sertifikat bali (masalan +2.4)"
    )

    # Natijalar ko'rsatkichlari
    sprint_score = models.IntegerField(default=0)
    sprint_total = models.IntegerField(default=0)
    cleanup_cleared = models.IntegerField(default=0)
    arena_won = models.BooleanField(default=False)

    is_chest_claimed = models.BooleanField(default=False)

    # Server tomonidan tekshiriladigan javoblar (sprint va arena alohida — savol kam
    # bo'lsa arena sprint savollarini qayta ishlatadi, natijalar aralashmasin).
    sprint_session = models.ForeignKey(
        'sprint.QuizSession', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    arena_session = models.ForeignKey(
        'sprint.QuizSession', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-cycle_number', '-id']
        verbose_name = "Kunlik Avtopilot Sikli"
        verbose_name_plural = "Kunlik Avtopilot Sikllari"

    def __str__(self):
        return f"{self.user.username} | {self.date} (Sikl #{self.cycle_number}) -> {self.current_stage}"


class UserEcoTree(models.Model):
    """
    O'quvchining 'Ilm Ildizi' Eco-Daraxti va uzluksizlik (Loss Aversion) modeli.
    Har bir to'liq tugallangan sikl +35% suv beradi. 24 soat kirmasa -25% kamayib sarg'ayadi.
    """
    STAGE_SPROUT = 1
    STAGE_SAPLING = 2
    STAGE_YOUNG_TREE = 3
    STAGE_GREAT_OAK = 4
    STAGE_GOLDEN_ROOT = 5

    GROWTH_CHOICES = [
        (STAGE_SPROUT, '1: Nihol'),
        (STAGE_SAPLING, "2: Ko'chat"),
        (STAGE_YOUNG_TREE, '3: Yosh Daraxt'),
        (STAGE_GREAT_OAK, '4: Chinor'),
        (STAGE_GOLDEN_ROOT, '5: Oltin Ilm Ildizi'),
    ]

    STAGE_NAMES = {
        STAGE_SPROUT: 'Nihol',
        STAGE_SAPLING: "Ko'chat",
        STAGE_YOUNG_TREE: 'Yosh Daraxt',
        STAGE_GREAT_OAK: 'Ulkan Chinor',
        STAGE_GOLDEN_ROOT: 'Oltin Ilm Ildizi',
    }

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='eco_tree'
    )
    growth_stage = models.PositiveSmallIntegerField(
        choices=GROWTH_CHOICES,
        default=STAGE_SPROUT
    )
    water_level = models.IntegerField(
        default=35,
        help_text="0-100% suv darajasi"
    )
    root_depth_xp = models.IntegerField(
        default=0,
        help_text="Ildiz chuqurligi / Tajriba ballari"
    )
    total_cycles_completed = models.IntegerField(
        default=0,
        help_text="Tugallangan umumiy sikllar soni"
    )
    last_watered_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "O'quvchi Eco-Daraxti"
        verbose_name_plural = "O'quvchi Eco-Daraxtlari"

    def __str__(self):
        return f"{self.user.username} daraxti: {self.get_growth_stage_display()} (💧 {self.water_level}%)"

    @property
    def stage_name(self) -> str:
        return self.STAGE_NAMES.get(self.growth_stage, 'Nihol')

    def check_daily_decay(self) -> bool:
        """24 soatdan ortiq vaqt kirmasa suv darajasi -25% ga kamayadi."""
        now = timezone.now()
        hours_passed = (now - self.last_watered_at).total_seconds() / 3600.0
        
        # 24 soatdan oshsa har 24 soat uchun 25% kamayadi
        if hours_passed >= 24:
            days_missed = int(hours_passed // 24)
            decay = min(self.water_level, days_missed * 25)
            if decay > 0:
                self.water_level = max(0, self.water_level - decay)
                self.save(update_fields=['water_level', 'updated_at'])
                return True
        return False

    def water(self, amount: int = 35) -> dict:
        """Daraxtga suv quyish va o'sish dinamikasi (Multi-cycle 3 raundlik marafon)."""
        self.check_daily_decay()
        prev_stage = self.growth_stage
        self.water_level = min(100, self.water_level + amount)
        self.root_depth_xp += amount * 10
        self.total_cycles_completed += 1
        self.last_watered_at = timezone.now()

        leveled_up = False
        if self.water_level >= 100:
            if self.growth_stage < self.STAGE_GREAT_OAK:
                self.growth_stage = self.STAGE_GREAT_OAK  # 3-raundda Chinorga aylanadi
                leveled_up = True
            elif self.growth_stage == self.STAGE_GREAT_OAK and self.total_cycles_completed >= 5:
                self.growth_stage = self.STAGE_GOLDEN_ROOT
                leveled_up = True
            self.water_level = 100
        elif self.water_level >= 70 and self.growth_stage < self.STAGE_SAPLING:
            self.growth_stage = self.STAGE_SAPLING  # 2-raundda Ko'chat
            leveled_up = True

        self.save()
        return {
            'growth_stage': self.growth_stage,
            'stage_name': self.stage_name,
            'water_level': self.water_level,
            'root_depth_xp': self.root_depth_xp,
            'leveled_up': leveled_up,
            'prev_stage': prev_stage,
        }
