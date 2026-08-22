from django.urls import path

from . import api

app_name = 'tests_api'

urlpatterns = [
    path('', api.center_api, name='center'),
    path('<int:test_id>/start/', api.start_test_api, name='start'),
    path('start-random/', api.start_random_test_api, name='start_random'),
    path('start-mistakes/', api.start_mistakes_test_api, name='start_mistakes'),
    path('attempts/<int:attempt_id>/question/', api.question_api, name='question'),
    path('attempts/<int:attempt_id>/answer/', api.answer_api, name='answer'),
    path('attempts/<int:attempt_id>/finish/', api.finish_api, name='finish'),
    path('attempts/<int:attempt_id>/feedback/', api.feedback_api, name='feedback'),
    # Telegram Story: havolani egasi oladi, rasmni esa Telegram serverlari imzo bilan
    # (autentifikatsiyasiz) yuklab oladi.
    path('attempts/<int:attempt_id>/story-link/', api.story_link_api, name='story_link'),
    # Kengaytmasiz (`.png` emas): frontend proksisi Django uslubidagi yakuniy slashni
    # qo'shadi, `story.png/` esa hech qanday marshrutga tushmay 404 berardi.
    path('attempts/<int:attempt_id>/story/', api.story_image_api, name='story_image'),
    path('history/', api.history_api, name='history'),
    path('revision/', api.revision_api, name='revision'),
    path('revision/<int:item_id>/check/', api.revision_check_api, name='revision_check'),
]
