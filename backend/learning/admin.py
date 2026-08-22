from django.contrib import admin
from .models import Topic, Lesson, VideoLesson, AudioLesson, Flashcard, Bookmark


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'order', 'icon_name')
    search_fields = ('title', 'slug')
    list_filter = ('category',)


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'topic', 'order')
    search_fields = ('title', 'content')
    list_filter = ('topic',)


@admin.register(VideoLesson)
class VideoLessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'lesson', 'duration_seconds', 'order')


@admin.register(AudioLesson)
class AudioLessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'lesson', 'duration_seconds', 'order')


@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display = ('lesson', 'front', 'back')


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ('profile', 'lesson', 'created_at')
