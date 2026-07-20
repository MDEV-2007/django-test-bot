from django import forms
from django.contrib.auth.models import User

from tests_app.models import Subject, TestSet
from learning.models import Lesson, Topic
from games.models import Game
from shop.models import ShopItem
from .models import SiteSettings, Broadcast

TEXT = ("w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 "
        "focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition")
CHECK = "w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"


class StyledFormMixin:
    """Applies consistent Tailwind classes to every widget so section forms don't each
    repeat widget styling. Checkboxes get a compact style; everything else the text style."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            widget = field.widget
            if isinstance(widget, (forms.CheckboxInput,)):
                widget.attrs.setdefault('class', CHECK)
            elif isinstance(widget, forms.Textarea):
                widget.attrs.setdefault('class', TEXT)
                widget.attrs.setdefault('rows', 4)
            else:
                widget.attrs.setdefault('class', TEXT)


class SubjectForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Subject
        fields = ['name', 'slug', 'icon_name', 'color', 'order']


class TestSetForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = TestSet
        fields = ['title', 'subject', 'description', 'category', 'duration_minutes',
                  'created_by', 'is_premium', 'is_published', 'is_archived']


class LessonForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Lesson
        fields = ['topic', 'title', 'content', 'video_url', 'created_by', 'is_published', 'order']
        widgets = {'content': forms.Textarea(attrs={'rows': 8})}


class GameForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Game
        fields = ['title', 'game_type', 'subject', 'description', 'created_by', 'is_published']


class ShopItemForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = ShopItem
        fields = ['category', 'slug', 'name', 'description', 'icon_name', 'price_coins',
                  'rarity', 'payload', 'is_consumable', 'required_level', 'is_active', 'order']
        widgets = {
            'payload': forms.Textarea(attrs={
                'rows': 3,
                'placeholder': '{"title": "Bilimdon"}  yoki  {"ring": "#f7c948"}',
            }),
        }
        help_texts = {
            'payload': "Turga xos JSON ma'lumot: unvon uchun {\"title\": \"...\"}, "
                       "ramka uchun {\"ring\": \"#hex\"}, avatar uchun {\"avatar_url\": \"...\"}.",
        }


class SiteSettingsForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = SiteSettings
        fields = ['site_name', 'logo_url', 'contact_email', 'contact_phone',
                  'telegram_channel', 'announcement', 'maintenance_mode']


class BroadcastForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Broadcast
        fields = ['title', 'message', 'image', 'audience', 'via_telegram']
        widgets = {'message': forms.Textarea(attrs={'rows': 5})}


class UserForm(StyledFormMixin, forms.ModelForm):
    """Super Admin edits identity + active flag here; role is edited via the Profile side
    (a separate field below) so both stay in one form."""
    role = forms.ChoiceField(choices=[], required=True)

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'is_active']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from accounts.models import Profile
        self.fields['role'].choices = Profile.ROLE_CHOICES
        if self.instance and self.instance.pk and hasattr(self.instance, 'profile'):
            self.fields['role'].initial = self.instance.profile.role

    def clean(self):
        cleaned = super().clean()
        # Don't let the edit form strand the platform with no super admin — block
        # demoting (or deactivating) the last active one.
        from accounts.permissions import is_last_active_superadmin
        if self.instance and self.instance.pk and is_last_active_superadmin(self.instance):
            new_role = cleaned.get('role')
            if new_role and new_role != 'superadmin':
                self.add_error('role', "Oxirgi faol super adminning rolini o'zgartirib bo'lmaydi.")
            if cleaned.get('is_active') is False:
                self.add_error('is_active', "Oxirgi faol super adminni o'chirib bo'lmaydi.")
        return cleaned

    def save(self, commit=True):
        user = super().save(commit=commit)
        if commit and hasattr(user, 'profile'):
            user.profile.role = self.cleaned_data['role']
            user.profile.save()
        return user


class TeacherCreateForm(StyledFormMixin, forms.ModelForm):
    """Create a teacher account with an initial password from the Super Admin panel."""
    password = forms.CharField(widget=forms.PasswordInput, min_length=8,
                               help_text="Kamida 8 belgi; oson taxmin qilinadigan parol qabul qilinmaydi.")

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email']

    def clean_username(self):
        username = self.cleaned_data['username']
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError("Bu foydalanuvchi nomi allaqachon band.")
        return username

    def clean_password(self):
        # Teacher accounts are privileged — hold them to the project's configured
        # password validators (length, common-password, numeric-only, similarity),
        # not just a bare length check.
        from django.contrib.auth.password_validation import validate_password
        password = self.cleaned_data['password']
        validate_password(password)
        return password

    def save(self, commit=True):
        user = User.objects.create_user(
            username=self.cleaned_data['username'],
            password=self.cleaned_data['password'],
            first_name=self.cleaned_data.get('first_name', ''),
            last_name=self.cleaned_data.get('last_name', ''),
            email=self.cleaned_data.get('email', ''),
        )
        # The post_save signal created a Profile; promote it to teacher.
        user.profile.role = 'teacher'
        user.profile.save()
        return user
