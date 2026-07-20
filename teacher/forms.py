from django import forms

from tests_app.models import TestSet, Question
from learning.models import Lesson
from games.models import Game

TEXT = ("w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 "
        "focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition")
CHECK = "w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"


class StyledMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            w = field.widget
            if isinstance(w, forms.CheckboxInput):
                w.attrs.setdefault('class', CHECK)
            else:
                w.attrs.setdefault('class', TEXT)


class TestInfoForm(StyledMixin, forms.ModelForm):
    """Step 1 of the wizard — the test's basic metadata. Ownership/publish state are set
    by the view, not exposed here."""
    class Meta:
        model = TestSet
        fields = ['title', 'subject', 'category', 'duration_minutes', 'description']
        widgets = {'description': forms.Textarea(attrs={'rows': 3})}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Subject is nullable on the model (for migration safety) but every new test must
        # pick one, so per-subject filtering/leaderboard stay correct.
        self.fields['subject'].required = True
        self.fields['subject'].empty_label = "Fanni tanlang"


class QuestionBaseForm(StyledMixin, forms.ModelForm):
    """The type-independent part of a question. Type-specific data (options, pairs,
    sub-questions, group) is parsed from POST by the view, since row counts are dynamic."""
    class Meta:
        model = Question
        fields = ['question_type', 'body', 'difficulty', 'points', 'explanation',
                  'image', 'image_position']
        widgets = {
            'body': forms.Textarea(attrs={'rows': 3}),
            'explanation': forms.Textarea(attrs={'rows': 2}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # The wizard attaches a grouped question's QuestionGroup after this form saves, so
        # defer the model's "grouped_item needs a group" validation (see Question.clean).
        self.instance._skip_group_validation = True


class LessonForm(StyledMixin, forms.ModelForm):
    class Meta:
        model = Lesson
        fields = ['topic', 'title', 'content', 'video_url', 'order']
        widgets = {'content': forms.Textarea(attrs={'rows': 10})}


class GameForm(StyledMixin, forms.ModelForm):
    class Meta:
        model = Game
        fields = ['title', 'game_type', 'subject', 'description']
        widgets = {'description': forms.Textarea(attrs={'rows': 2})}
