from rest_framework import serializers
from .models import MistakeExplanationCache, UserMistakeNotebook
from tests_app.models import Question, AnswerOption


class QuestionOptionSprintSerializer(serializers.ModelSerializer):
    """Fokus sprinti uchun savol varianti serializeri."""
    class Meta:
        model = AnswerOption
        fields = ['id', 'text']


class QuestionSprintSerializer(serializers.ModelSerializer):
    """Fokus sprinti uchun savol serializeri."""
    options = serializers.SerializerMethodField()
    correct_option_id = serializers.SerializerMethodField()
    topic_title = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id', 'body', 'options', 'correct_option_id',
            'topic_title', 'difficulty', 'explanation'
        ]

    def get_options(self, obj):
        return [{'id': c.id, 'text': c.text} for c in obj.choices.all().order_by('id')]

    def get_correct_option_id(self, obj):
        correct = obj.choices.filter(is_correct=True).first()
        return correct.id if correct else None

    def get_topic_title(self, obj):
        if hasattr(obj, 'topic') and obj.topic:
            return obj.topic.title
        if hasattr(obj, 'subject') and obj.subject:
            return obj.subject.name
        return "Umumiy Tayyorgarlik"


class MistakeExplanationCacheSerializer(serializers.ModelSerializer):
    """AI Layfxak kesh serializeri."""
    class Meta:
        model = MistakeExplanationCache
        fields = [
            'id', 'question_id', 'selected_option_id',
            'selected_option_text', 'why_wrong', 'memory_hack',
            'hit_count', 'model_name', 'created_at'
        ]


class ExplainMistakeInputSerializer(serializers.Serializer):
    """Frontenddan xato qilinganda yuboriladigan so'rov serializeri."""
    question_id = serializers.CharField(required=True)
    selected_option_id = serializers.CharField(required=True)
    selected_option_text = serializers.CharField(required=False, allow_blank=True, default='')
    correct_option_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    correct_option_text = serializers.CharField(required=False, allow_blank=True, default='')
    question_body = serializers.CharField(required=False, allow_blank=True, default='')
    topic_title = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_question_id(self, value):
        val_str = str(value).strip()
        if val_str.startswith('revenge_'):
            parts = val_str.split('_')
            if len(parts) >= 2 and parts[1].isdigit():
                return int(parts[1])
        try:
            return int(val_str)
        except (ValueError, TypeError):
            return 0

    def validate_selected_option_id(self, value):
        try:
            return int(str(value).strip())
        except (ValueError, TypeError):
            return 0

    def validate_correct_option_id(self, value):
        if value is None or str(value).strip() == '':
            return None
        try:
            return int(str(value).strip())
        except (ValueError, TypeError):
            return None


class UserMistakeNotebookSerializer(serializers.ModelSerializer):
    """Xatolar daftari serializeri."""
    question_body = serializers.CharField(source='question.body', read_only=True)

    class Meta:
        model = UserMistakeNotebook
        fields = [
            'id', 'user_id', 'question_id', 'question_body',
            'failed_option_id', 'is_resolved', 'revenge_attempts_count',
            'last_attempted_at', 'resolved_at'
        ]
