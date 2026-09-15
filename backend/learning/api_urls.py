from django.urls import path

from . import api

app_name = 'learning_api'

urlpatterns = [
    path('', api.center_api, name='center'),
    path('toggle-bookmark/<int:lesson_id>/', api.toggle_bookmark_api, name='toggle_bookmark'),
    path('mentor/stream/', api.MentorStreamAPI.as_view(), name='mentor_stream'),
    path('flashcards/', api.flashcards_decks_api, name='flashcards_decks'),
    path('flashcards/<int:deck_id>/', api.flashcards_deck_detail_api, name='flashcards_deck_detail'),
    path('flashcards/complete/', api.flashcards_complete_api, name='flashcards_complete'),
    path('reels/', api.reels_feed_api, name='reels_feed'),
    path('reels/quiz/', api.reels_quiz_answer_api, name='reels_quiz_answer'),
]
