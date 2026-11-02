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


from .models import Book, BookBookmark


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject', 'grade', 'category', 'is_premium', 'views_count', 'downloads_count', 'is_published')
    list_filter = ('subject', 'grade', 'category', 'is_premium', 'is_published')
    search_fields = ('title', 'author', 'description')
    list_editable = ('is_published', 'is_premium')


@admin.register(BookBookmark)
class BookBookmarkAdmin(admin.ModelAdmin):
    list_display = ('user', 'book', 'created_at')


from .models import CommunityPost, CommunityStory


@admin.register(CommunityPost)
class CommunityPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'subject_name', 'post_type', 'is_pinned', 'created_at')
    list_filter = ('post_type', 'subject_slug', 'is_pinned', 'created_at')
    search_fields = ('title', 'caption', 'subject_name')
    list_editable = ('is_pinned',)
    ordering = ('-is_pinned', '-created_at')


@admin.register(CommunityStory)
class CommunityStoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'center', 'story_type', 'exam_track', 'badge', 'views_count', 'expires_at')
    list_filter = ('story_type', 'exam_track', 'expires_at')
    search_fields = ('title', 'caption', 'badge')
    ordering = ('-created_at',)

