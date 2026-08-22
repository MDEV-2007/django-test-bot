from django.contrib import admin
from adminsortable2.admin import SortableTabularInline, SortableAdminBase
from .models import (
    Subject, Question, AnswerOption, MatchingPair, SubQuestion,
    QuestionGroup, GroupOption, TestSet, Attempt, AttemptAnswer, AIFeedback,
)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


class AnswerOptionInline(admin.TabularInline):
    # Plain (not sortable2) — AnswerOption has no `order` column, it's ordered by id.
    # Reordering A/B/C/D after creation isn't a real workflow need here; adding a
    # dedicated order field just for drag-drop would be schema churn for no real gain.
    model = AnswerOption
    extra = 4
    verbose_name = "Variant"
    verbose_name_plural = "Variantli savol uchun variantlar (single_choice / image_based / table_based)"


class MatchingPairInline(SortableTabularInline):
    model = MatchingPair
    extra = 4
    verbose_name = "Juftlik"
    verbose_name_plural = "Moslashtirish qatorlari (chap ustunni bo'sh qoldirsangiz — chalg'ituvchi bo'ladi)"


class SubQuestionInline(SortableTabularInline):
    model = SubQuestion
    extra = 2
    verbose_name = "Qism-savol"
    verbose_name_plural = "Ochiq savol qism-savollari (a, b... — bo'sh qoldirsangiz, savol bo'linmagan hisoblanadi)"


@admin.register(Question)
class QuestionAdmin(SortableAdminBase, admin.ModelAdmin):
    list_display = ('short_body', 'question_type', 'topic', 'difficulty', 'category', 'points')
    search_fields = ('body', 'topic__title')
    list_filter = ('question_type', 'difficulty', 'category', 'topic')
    fieldsets = (
        (None, {
            'fields': ('topic', 'body', 'question_type', 'difficulty', 'category', 'points', 'explanation'),
        }),
        ("Rasm (image_based / xarita / diagramma)", {
            'fields': ('image', 'image_url', 'image_position', 'audio_url'),
            'classes': ('collapse',),
        }),
        ("Ochiq javobli savol — bo'linmagan holat (AI baholaydi)", {
            'fields': ('reference_answer',),
            'classes': ('collapse',),
            'description': "Agar bu savolda pastdagi 'Qism-savol' bo'limida hech narsa bo'lmasa, "
                            "shu yerdagi namunaviy javob ishlatiladi.",
        }),
        ("Guruhlangan savol (grouped_item)", {
            'fields': ('group', 'correct_group_option'),
            'classes': ('collapse',),
        }),
    )

    def short_body(self, obj):
        from django.utils.html import strip_tags
        return strip_tags(obj.body)[:70]
    short_body.short_description = "Savol"

    def get_inline_instances(self, request, obj=None):
        """Only show the inline that actually matches this question's type — a matching
        question doesn't need answer-option rows, an open_written question doesn't need
        matching pairs, etc. For a brand-new (unsaved) question, show every inline since
        the type may still change before the first save."""
        if obj is None:
            inline_classes = [AnswerOptionInline, MatchingPairInline, SubQuestionInline]
        elif obj.question_type == 'matching':
            inline_classes = [MatchingPairInline]
        elif obj.question_type == 'open_written':
            inline_classes = [SubQuestionInline]
        elif obj.question_type == 'grouped_item':
            inline_classes = []
        else:  # single_choice / image_based / table_based
            inline_classes = [AnswerOptionInline]
        return [cls(self.model, self.admin_site) for cls in inline_classes]


class GroupOptionInline(SortableTabularInline):
    model = GroupOption
    extra = 6
    verbose_name = "Bank varianti"
    verbose_name_plural = "Umumiy javob banki variantlari (A, B, C...)"


@admin.register(QuestionGroup)
class QuestionGroupAdmin(SortableAdminBase, admin.ModelAdmin):
    list_display = ('test_set', 'instruction', 'order')
    list_filter = ('test_set',)
    inlines = [GroupOptionInline]


@admin.register(TestSet)
class TestSetAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject', 'category', 'duration_minutes', 'is_archived', 'created_at')
    list_filter = ('subject', 'category', 'is_archived')
    search_fields = ('title', 'description')
    filter_horizontal = ('questions',)
    # Drag-and-drop ordering of questions *within* a test would need the plain
    # questions M2M to gain an explicit through-model with an `order` column — a real
    # schema change, out of scope for this pass. Ordering here still falls back to
    # Question.Meta.ordering (by id / creation order).


@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ('profile', 'test', 'score', 'correct_answers', 'wrong_answers', 'skipped_answers', 'is_completed')
    list_filter = ('is_completed', 'test')
    search_fields = ('profile__user__username', 'test__title')


@admin.register(AttemptAnswer)
class AttemptAnswerAdmin(admin.ModelAdmin):
    list_display = ('attempt', 'question', 'selected_choice', 'grouped_option', 'is_correct')
    list_filter = ('is_correct',)


@admin.register(AIFeedback)
class AIFeedbackAdmin(admin.ModelAdmin):
    list_display = ('attempt', 'predicted_score', 'created_at')
