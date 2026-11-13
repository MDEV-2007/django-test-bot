# Permission matrix (5-kun)

Avtomatik yig'ildi: Django URL resolver bo'ylab har bir `api/` endpointining DRF `permission_classes`i (`tests/test_roles_permissions.py` ham shu usul bilan barcha parametrsiz `api/panel/` yo'llarini student/teacher/anonim uchun tekshiradi).

Rollar: `anonymous`, `authenticated` (student), `teacher` (`IsTeacher`: teacher yoki superadmin), `superadmin` (`IsSuperAdmin`). Global default: `IsAuthenticated`. Alohida advertiser roli yo'q.

Qisqartmalar: **Anon** — anonim; **Auth** — har qanday kirgan foydalanuvchi; **Teacher**; **Admin** — Super Admin.

## Bo'limlar bo'yicha xulosa

| Bo'lim | Endpointlar | Ruxsat taqsimoti | Object-level |
|---|---|---|---|
| `api/health/` | 1 | NON-DRF: 1 | — |
| `api/auth/` | 11 | AllowAny: 5, IsAuthenticated: 5, : 1 | — |
| `api/v1/b2b/` | 3 | IsAuthenticated: 2, AllowAny: 1 | Lid — o'quvchining o'zi; lid ro'yxati faqat Super Admin (api/panel/campaigns/leads). |
| `api/v1/system/` | 16 | IsAuthenticated: 12, AllowAny: 3, IsSuperAdmin: 1 | — |
| `api/core/` | 16 | IsAuthenticated: 12, AllowAny: 3, IsSuperAdmin: 1 | — |
| `api/dashboard/` | 6 | IsAuthenticated: 4, AllowAny: 2 | — |
| `api/tests/` | 27 | IsAuthenticated: 19, IsAuthenticated,IsChannelSubscribed: 6, AllowAny: 2 | Object-level: `Attempt(profile=request.user.profile)`; RevisionItem — `profile`. |
| `api/v1/sprint/` | 5 | IsAuthenticated: 4, AllowAny: 1 | QuizSession(user=request.user) — boshqa sessiya 404. |
| `api/sprint/` | 5 | IsAuthenticated: 4, AllowAny: 1 | — |
| `api/v1/loop/` | 5 | IsAuthenticated: 5 | Har doim joriy foydalanuvchining bugungi sikli. |
| `api/loop/` | 5 | IsAuthenticated: 5 | — |
| `api/growth/` | 11 | IsAuthenticated: 7, AllowAny: 4 | — |
| `api/leaderboard/` | 1 | IsAuthenticated: 1 | — |
| `api/battles/` | 5 | IsAuthenticated: 5 | — |
| `api/shop/` | 5 | IsAuthenticated: 5 | — |
| `api/premium/` | 7 | IsAuthenticated: 4, AllowAny: 3 | To'lov skrinshoti: egasi yoki staff (token query param). |
| `api/classroom/` | 6 | IsAuthenticated: 6 | Object-level: `MockAttempt(student=profile)`; mock — o'quvchining obunasi/sinfi bo'yicha. |
| `api/learning/` | 27 | IsAuthenticated: 15, AllowAny: 11, IsAuthenticated,IsChannelSubscribed: 1 | — |
| `api/v1/learning/` | 27 | IsAuthenticated: 15, AllowAny: 11, IsAuthenticated,IsChannelSubscribed: 1 | — |
| `api/teacher/` | 33 | IsTeacher: 29, IsAuthenticated: 4 | Object-level: `created_by=request.user` (_own_test/_own_lesson/_own_game); sinf: `TeacherStudent(teacher=profile)`. |
| `api/panel/` | 110 | IsSuperAdmin: 98, IsAuthenticated,IsSuperAdmin: 8, AllowAny: 2, : 1, IsAuthenticated: 1 | Rol: `IsSuperAdmin`. Xavfli amallar (user delete/edit-rol/blok/parol/balans/premium/impersonatsiya, kampaniya o'chirish/toggle, lid holati, kontent CRUD) `AuditLog`ga yoziladi. |
| `api/games/` | 3 | IsAuthenticated: 3 | — |
| `api/analytics/` | 6 | IsAuthenticated: 5, IsSuperAdmin: 1 | — |

## AllowAny (ochiq) endpointlar va asoslash

| Endpoint | Izoh |
|---|---|
| `api/auth/config/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/auth/login/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/auth/register/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/auth/google/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/auth/telegram/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/b2b/active-campaign/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/system/feature-flags/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/system/cheat-sheet/<int:topic_id>/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/system/ads/targeted-offer/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/core/feature-flags/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/core/cheat-sheet/<int:topic_id>/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/core/ads/targeted-offer/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/dashboard/landing-leaderboard/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/dashboard/landing-reviews/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/tests/attempts/<int:attempt_id>/story/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/tests/stress-config/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/sprint/subjects/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/sprint/subjects/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/growth/onboarding-blitz/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/growth/onboarding/blitz/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/growth/status/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/growth/arena/duel/<str:duel_token>/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/premium/public-plans/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/premium/parent-checkout/<str:token>/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/premium/payments/<int:payment_id>/screenshot/` | `?token=` JWT, egasi yoki staff; aks holda 404. |
| `api/learning/flashcards/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/learning/flashcards/<str:deck_id>/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/learning/reels/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/learning/reels/quiz/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/learning/reels/<int:reel_id>/comments/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/learning/feed/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/learning/feed/<int:post_id>/comments/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/learning/stories/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/learning/library/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/learning/library/<int:book_id>/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/learning/library/<int:book_id>/download/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/flashcards/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/flashcards/<str:deck_id>/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/reels/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/reels/quiz/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/reels/<int:reel_id>/comments/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/feed/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/feed/<int:post_id>/comments/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/stories/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/library/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/library/<int:book_id>/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/v1/learning/library/<int:book_id>/download/` | Ommaviy kontent / auth oqimi (yozish amallari ichida alohida tekshiriladi). |
| `api/panel/system/backups/download/<str:filename>/` | View ichida superadmin tekshiriladi (sessiya yoki `?token=` JWT). Token URL'da — Medium (log/tarixda qoladi). |
| `api/panel/features/public/` | Faqat funksiya bayroqlari (sir emas). |

## Barcha endpointlar

| Ruxsat | Endpoint |
|---|---|
| NON-DRF | `api/health/` |
| AllowAny | `api/auth/config/` |
| AllowAny | `api/auth/login/` |
| AllowAny | `api/auth/register/` |
| AllowAny | `api/auth/google/` |
| AllowAny | `api/auth/telegram/` |
| — | `api/auth/refresh/` |
| IsAuthenticated | `api/auth/me/` |
| IsAuthenticated | `api/auth/profile/` |
| IsAuthenticated | `api/auth/subscription/` |
| IsAuthenticated | `api/auth/subscription/check/` |
| IsAuthenticated | `api/auth/onboarding-complete/` |
| AllowAny | `api/v1/b2b/active-campaign/` |
| IsAuthenticated | `api/v1/b2b/submit-lead/` |
| IsAuthenticated | `api/v1/b2b/track/` |
| AllowAny | `api/v1/system/feature-flags/` |
| IsSuperAdmin | `api/v1/system/admin/feature-flags/` |
| AllowAny | `api/v1/system/cheat-sheet/<int:topic_id>/` |
| IsAuthenticated | `api/v1/system/parent-radar/status/` |
| IsAuthenticated | `api/v1/system/parent-radar/invoice/` |
| IsAuthenticated | `api/v1/system/class-battles/my/` |
| IsAuthenticated | `api/v1/system/class-battles/create/` |
| IsAuthenticated | `api/v1/system/class-battles/<str:pin_code>/join/` |
| IsAuthenticated | `api/v1/system/class-battles/<int:room_id>/state/` |
| IsAuthenticated | `api/v1/system/class-battles/<int:room_id>/start/` |
| IsAuthenticated | `api/v1/system/class-battles/<int:room_id>/finish/` |
| IsAuthenticated | `api/v1/system/class-battles/<int:room_id>/submit/` |
| IsAuthenticated | `api/v1/system/class-battles/<int:room_id>/analytics/` |
| AllowAny | `api/v1/system/ads/targeted-offer/` |
| IsAuthenticated | `api/v1/system/ads/lead-submit/` |
| IsAuthenticated | `api/v1/system/profile/radar/` |
| AllowAny | `api/core/feature-flags/` |
| IsSuperAdmin | `api/core/admin/feature-flags/` |
| AllowAny | `api/core/cheat-sheet/<int:topic_id>/` |
| IsAuthenticated | `api/core/parent-radar/status/` |
| IsAuthenticated | `api/core/parent-radar/invoice/` |
| IsAuthenticated | `api/core/class-battles/my/` |
| IsAuthenticated | `api/core/class-battles/create/` |
| IsAuthenticated | `api/core/class-battles/<str:pin_code>/join/` |
| IsAuthenticated | `api/core/class-battles/<int:room_id>/state/` |
| IsAuthenticated | `api/core/class-battles/<int:room_id>/start/` |
| IsAuthenticated | `api/core/class-battles/<int:room_id>/finish/` |
| IsAuthenticated | `api/core/class-battles/<int:room_id>/submit/` |
| IsAuthenticated | `api/core/class-battles/<int:room_id>/analytics/` |
| AllowAny | `api/core/ads/targeted-offer/` |
| IsAuthenticated | `api/core/ads/lead-submit/` |
| IsAuthenticated | `api/core/profile/radar/` |
| IsAuthenticated | `api/dashboard/home/` |
| IsAuthenticated | `api/dashboard/daily-chest/` |
| IsAuthenticated | `api/dashboard/daily-chest/open/` |
| IsAuthenticated | `api/dashboard/notifications/` |
| AllowAny | `api/dashboard/landing-leaderboard/` |
| AllowAny | `api/dashboard/landing-reviews/` |
| IsAuthenticated | `api/tests/` |
| IsAuthenticated,IsChannelSubscribed | `api/tests/<int:test_id>/lobby/` |
| IsAuthenticated,IsChannelSubscribed | `api/tests/<int:test_id>/remind/` |
| IsAuthenticated | `api/tests/<int:test_id>/broadcast/` |
| IsAuthenticated,IsChannelSubscribed | `api/tests/<int:test_id>/start/` |
| IsAuthenticated,IsChannelSubscribed | `api/tests/start-random/` |
| IsAuthenticated,IsChannelSubscribed | `api/tests/start-mistakes/` |
| IsAuthenticated | `api/tests/mistakes-summary/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/question/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/answer/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/finish/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/exam/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/exam/answer/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/annotations/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/exam/audio-play/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/writing-review/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/feedback/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/survey/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/story-link/` |
| AllowAny | `api/tests/attempts/<int:attempt_id>/story/` |
| IsAuthenticated | `api/tests/history/` |
| IsAuthenticated | `api/tests/revision/` |
| IsAuthenticated | `api/tests/revision/<int:item_id>/check/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/tab-switch/` |
| AllowAny | `api/tests/stress-config/` |
| IsAuthenticated,IsChannelSubscribed | `api/tests/start-stress/` |
| IsAuthenticated | `api/tests/attempts/<int:attempt_id>/bubble-answer/` |
| AllowAny | `api/v1/sprint/subjects/` |
| IsAuthenticated | `api/v1/sprint/questions/` |
| IsAuthenticated | `api/v1/sprint/answer/` |
| IsAuthenticated | `api/v1/sprint/explain-mistake/` |
| IsAuthenticated | `api/v1/sprint/resolve-revenge/` |
| AllowAny | `api/sprint/subjects/` |
| IsAuthenticated | `api/sprint/questions/` |
| IsAuthenticated | `api/sprint/answer/` |
| IsAuthenticated | `api/sprint/explain-mistake/` |
| IsAuthenticated | `api/sprint/resolve-revenge/` |
| IsAuthenticated | `api/v1/loop/current/` |
| IsAuthenticated | `api/v1/loop/answer/` |
| IsAuthenticated | `api/v1/loop/advance-stage/` |
| IsAuthenticated | `api/v1/loop/share-post/` |
| IsAuthenticated | `api/v1/loop/restart-cycle/` |
| IsAuthenticated | `api/loop/current/` |
| IsAuthenticated | `api/loop/answer/` |
| IsAuthenticated | `api/loop/advance-stage/` |
| IsAuthenticated | `api/loop/share-post/` |
| IsAuthenticated | `api/loop/restart-cycle/` |
| IsAuthenticated | `api/growth/open-question/evaluate/` |
| IsAuthenticated | `api/growth/essay/evaluate/` |
| AllowAny | `api/growth/onboarding-blitz/` |
| AllowAny | `api/growth/onboarding/blitz/` |
| IsAuthenticated | `api/growth/onboarding/blitz/answer/` |
| AllowAny | `api/growth/status/` |
| IsAuthenticated | `api/growth/arena/matchmake/` |
| IsAuthenticated | `api/growth/arena/record-replay/` |
| IsAuthenticated | `api/growth/arena/create-duel/` |
| AllowAny | `api/growth/arena/duel/<str:duel_token>/` |
| IsAuthenticated | `api/growth/arena/duel/<str:duel_token>/submit/` |
| IsAuthenticated | `api/leaderboard/` |
| IsAuthenticated | `api/battles/` |
| IsAuthenticated | `api/battles/online/` |
| IsAuthenticated | `api/battles/start-quiz/` |
| IsAuthenticated | `api/battles/submit-round/` |
| IsAuthenticated | `api/battles/finish/` |
| IsAuthenticated | `api/shop/` |
| IsAuthenticated | `api/shop/inventory/` |
| IsAuthenticated | `api/shop/buy/<slug:slug>/` |
| IsAuthenticated | `api/shop/equip/<slug:slug>/` |
| IsAuthenticated | `api/shop/unequip/<slug:slug>/` |
| AllowAny | `api/premium/public-plans/` |
| IsAuthenticated | `api/premium/plans/` |
| IsAuthenticated | `api/premium/checkout/<int:plan_id>/` |
| AllowAny | `api/premium/parent-checkout/<str:token>/` |
| IsAuthenticated | `api/premium/payments/<int:payment_id>/` |
| AllowAny | `api/premium/payments/<int:payment_id>/screenshot/` |
| IsAuthenticated | `api/premium/my-payments/` |
| IsAuthenticated | `api/classroom/mocks/` |
| IsAuthenticated | `api/classroom/mocks/<int:mock_id>/` |
| IsAuthenticated | `api/classroom/mocks/<int:mock_id>/start/` |
| IsAuthenticated | `api/classroom/mocks/<int:mock_id>/leaderboard/` |
| IsAuthenticated | `api/classroom/attempts/<int:mock_attempt_id>/` |
| IsAuthenticated | `api/classroom/attempts/<int:mock_attempt_id>/submit/` |
| IsAuthenticated | `api/learning/` |
| IsAuthenticated | `api/learning/toggle-bookmark/<int:lesson_id>/` |
| IsAuthenticated,IsChannelSubscribed | `api/learning/mentor/stream/` |
| AllowAny | `api/learning/flashcards/` |
| IsAuthenticated | `api/learning/flashcards/complete/` |
| AllowAny | `api/learning/flashcards/<str:deck_id>/` |
| IsAuthenticated | `api/learning/study/start/` |
| IsAuthenticated | `api/learning/study/complete/` |
| AllowAny | `api/learning/reels/` |
| IsAuthenticated | `api/learning/reels/create/` |
| AllowAny | `api/learning/reels/quiz/` |
| AllowAny | `api/learning/reels/<int:reel_id>/comments/` |
| AllowAny | `api/learning/feed/` |
| IsAuthenticated | `api/learning/feed/create/` |
| IsAuthenticated | `api/learning/feed/create-auto/` |
| IsAuthenticated | `api/learning/feed/auto-post/` |
| IsAuthenticated | `api/learning/feed/<int:post_id>/react/` |
| AllowAny | `api/learning/feed/<int:post_id>/comments/` |
| IsAuthenticated | `api/learning/feed/<int:post_id>/delete/` |
| IsAuthenticated | `api/learning/feed/<int:post_id>/pin/` |
| IsAuthenticated | `api/learning/feed/<int:post_id>/vote-poll/` |
| AllowAny | `api/learning/stories/` |
| IsAuthenticated | `api/learning/stories/create/` |
| AllowAny | `api/learning/library/` |
| AllowAny | `api/learning/library/<int:book_id>/` |
| IsAuthenticated | `api/learning/library/<int:book_id>/bookmark/` |
| AllowAny | `api/learning/library/<int:book_id>/download/` |
| IsAuthenticated | `api/v1/learning/` |
| IsAuthenticated | `api/v1/learning/toggle-bookmark/<int:lesson_id>/` |
| IsAuthenticated,IsChannelSubscribed | `api/v1/learning/mentor/stream/` |
| AllowAny | `api/v1/learning/flashcards/` |
| IsAuthenticated | `api/v1/learning/flashcards/complete/` |
| AllowAny | `api/v1/learning/flashcards/<str:deck_id>/` |
| IsAuthenticated | `api/v1/learning/study/start/` |
| IsAuthenticated | `api/v1/learning/study/complete/` |
| AllowAny | `api/v1/learning/reels/` |
| IsAuthenticated | `api/v1/learning/reels/create/` |
| AllowAny | `api/v1/learning/reels/quiz/` |
| AllowAny | `api/v1/learning/reels/<int:reel_id>/comments/` |
| AllowAny | `api/v1/learning/feed/` |
| IsAuthenticated | `api/v1/learning/feed/create/` |
| IsAuthenticated | `api/v1/learning/feed/create-auto/` |
| IsAuthenticated | `api/v1/learning/feed/auto-post/` |
| IsAuthenticated | `api/v1/learning/feed/<int:post_id>/react/` |
| AllowAny | `api/v1/learning/feed/<int:post_id>/comments/` |
| IsAuthenticated | `api/v1/learning/feed/<int:post_id>/delete/` |
| IsAuthenticated | `api/v1/learning/feed/<int:post_id>/pin/` |
| IsAuthenticated | `api/v1/learning/feed/<int:post_id>/vote-poll/` |
| AllowAny | `api/v1/learning/stories/` |
| IsAuthenticated | `api/v1/learning/stories/create/` |
| AllowAny | `api/v1/learning/library/` |
| AllowAny | `api/v1/learning/library/<int:book_id>/` |
| IsAuthenticated | `api/v1/learning/library/<int:book_id>/bookmark/` |
| AllowAny | `api/v1/learning/library/<int:book_id>/download/` |
| IsTeacher | `api/teacher/` |
| IsTeacher | `api/teacher/tests/` |
| IsTeacher | `api/teacher/tests/create/` |
| IsTeacher | `api/teacher/tests/<int:pk>/info/` |
| IsTeacher | `api/teacher/tests/<int:pk>/build/` |
| IsTeacher | `api/teacher/tests/<int:pk>/preview/` |
| IsTeacher | `api/teacher/tests/<int:pk>/publish/` |
| IsTeacher | `api/teacher/tests/<int:pk>/delete/` |
| IsTeacher | `api/teacher/tests/<int:pk>/results/` |
| IsTeacher | `api/teacher/tests/<int:pk>/reorder/` |
| IsTeacher | `api/teacher/tests/<int:pk>/make-game/` |
| IsTeacher | `api/teacher/tests/<int:pk>/sections/` |
| IsTeacher | `api/teacher/tests/<int:pk>/sections/<int:sid>/` |
| IsTeacher | `api/teacher/tests/<int:pk>/questions/add/` |
| IsTeacher | `api/teacher/tests/<int:pk>/questions/bulk/` |
| IsTeacher | `api/teacher/tests/<int:pk>/ai-parse/` |
| IsTeacher | `api/teacher/tests/<int:pk>/questions/<int:qid>/` |
| IsTeacher | `api/teacher/tests/<int:pk>/questions/<int:qid>/delete/` |
| IsTeacher | `api/teacher/tests/<int:pk>/attempts/<int:attempt_id>/grade/` |
| IsTeacher | `api/teacher/surveys/` |
| IsTeacher | `api/teacher/topics/` |
| IsTeacher | `api/teacher/lessons/` |
| IsTeacher | `api/teacher/lessons/create/` |
| IsTeacher | `api/teacher/lessons/<int:pk>/` |
| IsTeacher | `api/teacher/lessons/<int:pk>/delete/` |
| IsTeacher | `api/teacher/games/` |
| IsTeacher | `api/teacher/games/create/` |
| IsTeacher | `api/teacher/games/<int:pk>/` |
| IsTeacher | `api/teacher/games/<int:pk>/delete/` |
| IsAuthenticated | `api/teacher/register/` |
| IsAuthenticated | `api/teacher/me/referral-link/` |
| IsAuthenticated | `api/teacher/me/dashboard/` |
| IsAuthenticated | `api/teacher/me/students/<int:student_id>/` |
| IsSuperAdmin | `api/panel/` |
| IsSuperAdmin | `api/panel/users/` |
| IsSuperAdmin | `api/panel/users/create/` |
| IsSuperAdmin | `api/panel/users/<int:pk>/` |
| IsSuperAdmin | `api/panel/users/<int:pk>/edit/` |
| IsSuperAdmin | `api/panel/users/<int:pk>/toggle-block/` |
| IsSuperAdmin | `api/panel/users/<int:pk>/reset-password/` |
| IsSuperAdmin | `api/panel/users/<int:pk>/adjust/` |
| IsSuperAdmin | `api/panel/users/<int:pk>/set-premium/` |
| IsSuperAdmin | `api/panel/users/<int:pk>/impersonate/` |
| — | `api/panel/stop-impersonation/` |
| IsSuperAdmin | `api/panel/teachers/` |
| IsSuperAdmin | `api/panel/teachers/create/` |
| IsSuperAdmin | `api/panel/subjects/` |
| IsSuperAdmin | `api/panel/subjects/<int:pk>/` |
| IsSuperAdmin | `api/panel/shop/` |
| IsSuperAdmin | `api/panel/shop/<int:pk>/` |
| IsSuperAdmin | `api/panel/testsets/` |
| IsSuperAdmin | `api/panel/testsets/bulk/` |
| IsSuperAdmin | `api/panel/testsets/<int:pk>/` |
| IsSuperAdmin | `api/panel/testsets/<int:pk>/edit/` |
| IsSuperAdmin | `api/panel/testsets/<int:pk>/audio/` |
| IsSuperAdmin | `api/panel/testsets/<int:pk>/duplicate/` |
| IsSuperAdmin | `api/panel/testsets/<int:pk>/toggle-publish/` |
| IsSuperAdmin | `api/panel/testsets/<int:pk>/review/` |
| IsSuperAdmin | `api/panel/testsets/<int:pk>/review/<int:question_pk>/` |
| IsSuperAdmin | `api/panel/lessons/` |
| IsSuperAdmin | `api/panel/lessons/<int:pk>/` |
| IsSuperAdmin | `api/panel/games/` |
| IsSuperAdmin | `api/panel/games/<int:pk>/` |
| IsSuperAdmin | `api/panel/attempts/` |
| IsSuperAdmin | `api/panel/attempts/export/` |
| IsSuperAdmin | `api/panel/attempts/<int:pk>/` |
| IsSuperAdmin | `api/panel/payments/` |
| IsSuperAdmin | `api/panel/payments/<int:pk>/` |
| IsSuperAdmin | `api/panel/payments/<int:pk>/approve/` |
| IsSuperAdmin | `api/panel/payments/<int:pk>/reject/` |
| IsSuperAdmin | `api/panel/payments/grant/` |
| IsSuperAdmin | `api/panel/settings/` |
| IsSuperAdmin | `api/panel/audit-log/` |
| IsSuperAdmin | `api/panel/broadcast/` |
| IsSuperAdmin | `api/panel/broadcast/<int:pk>/delete/` |
| IsSuperAdmin | `api/panel/surveys/` |
| IsSuperAdmin | `api/panel/surveys/<int:pk>/toggle-featured/` |
| IsSuperAdmin | `api/panel/surveys/create/` |
| IsSuperAdmin | `api/panel/surveys/<int:pk>/delete/` |
| IsSuperAdmin | `api/panel/mocks/` |
| IsSuperAdmin | `api/panel/mocks/live/` |
| IsSuperAdmin | `api/panel/mocks/<int:pk>/remind/` |
| IsSuperAdmin | `api/panel/mocks/export/` |
| IsSuperAdmin | `api/panel/mocks/export-pdf/` |
| IsSuperAdmin | `api/panel/promocodes/` |
| IsSuperAdmin | `api/panel/promocodes/<int:pk>/` |
| IsSuperAdmin | `api/panel/promocodes/<int:pk>/toggle/` |
| IsSuperAdmin | `api/panel/finance/` |
| IsSuperAdmin | `api/panel/telegram/status/` |
| IsSuperAdmin | `api/panel/telegram/channels/` |
| IsSuperAdmin | `api/panel/telegram/channels/<int:pk>/` |
| IsSuperAdmin | `api/panel/telegram/reset-menu/` |
| IsSuperAdmin | `api/panel/users/export/` |
| IsSuperAdmin | `api/panel/system/health/` |
| IsSuperAdmin | `api/panel/system/flush-cache/` |
| IsSuperAdmin | `api/panel/system/logs/` |
| IsSuperAdmin | `api/panel/system/anti-cheat/` |
| IsSuperAdmin | `api/panel/system/backup/` |
| IsSuperAdmin | `api/panel/system/backups/` |
| AllowAny | `api/panel/system/backups/download/<str:filename>/` |
| IsSuperAdmin | `api/panel/system/ai-usage/` |
| IsAuthenticated | `api/panel/certificate/<int:attempt_pk>/` |
| IsSuperAdmin | `api/panel/broadcast/schedule/` |
| IsSuperAdmin | `api/panel/marketing/analytics/` |
| IsSuperAdmin | `api/panel/marketing/telegram-post/` |
| IsSuperAdmin | `api/panel/features/` |
| AllowAny | `api/panel/features/public/` |
| IsSuperAdmin | `api/panel/features/<str:key>/toggle/` |
| IsAuthenticated,IsSuperAdmin | `api/panel/reels/` |
| IsAuthenticated,IsSuperAdmin | `api/panel/reels` |
| IsAuthenticated,IsSuperAdmin | `api/panel/reels/<int:reel_id>/` |
| IsAuthenticated,IsSuperAdmin | `api/panel/reels/<int:reel_id>` |
| IsAuthenticated,IsSuperAdmin | `api/panel/reels/<int:reel_id>/delete/` |
| IsAuthenticated,IsSuperAdmin | `api/panel/reels/<int:reel_id>/delete` |
| IsAuthenticated,IsSuperAdmin | `api/panel/reels/hardest-questions/` |
| IsAuthenticated,IsSuperAdmin | `api/panel/reels/hardest-questions` |
| IsSuperAdmin | `api/panel/community/` |
| IsSuperAdmin | `api/panel/community` |
| IsSuperAdmin | `api/panel/community/<int:post_id>/delete/` |
| IsSuperAdmin | `api/panel/community/<int:post_id>/delete` |
| IsSuperAdmin | `api/panel/community/<int:post_id>/pin/` |
| IsSuperAdmin | `api/panel/community/<int:post_id>/pin` |
| IsSuperAdmin | `api/panel/stories/` |
| IsSuperAdmin | `api/panel/stories` |
| IsSuperAdmin | `api/panel/stories/create/` |
| IsSuperAdmin | `api/panel/stories/create` |
| IsSuperAdmin | `api/panel/stories/<int:story_id>/delete/` |
| IsSuperAdmin | `api/panel/stories/<int:story_id>/delete` |
| IsSuperAdmin | `api/panel/campaigns/` |
| IsSuperAdmin | `api/panel/campaigns` |
| IsSuperAdmin | `api/panel/campaigns/create/` |
| IsSuperAdmin | `api/panel/campaigns/create` |
| IsSuperAdmin | `api/panel/campaigns/<int:campaign_id>/edit/` |
| IsSuperAdmin | `api/panel/campaigns/<int:campaign_id>/edit` |
| IsSuperAdmin | `api/panel/campaigns/<int:campaign_id>/toggle/` |
| IsSuperAdmin | `api/panel/campaigns/<int:campaign_id>/toggle` |
| IsSuperAdmin | `api/panel/campaigns/<int:campaign_id>/delete/` |
| IsSuperAdmin | `api/panel/campaigns/<int:campaign_id>/delete` |
| IsSuperAdmin | `api/panel/campaigns/leads/` |
| IsSuperAdmin | `api/panel/campaigns/leads/<int:lead_id>/status/` |
| IsSuperAdmin | `api/panel/campaigns/leads` |
| IsSuperAdmin | `api/panel/stress-exam/` |
| IsSuperAdmin | `api/panel/stress-exam` |
| IsAuthenticated | `api/games/timeline/` |
| IsAuthenticated | `api/games/map/` |
| IsAuthenticated | `api/games/character/` |
| IsAuthenticated | `api/analytics/` |
| IsAuthenticated | `api/analytics/predicted-score/` |
| IsAuthenticated | `api/analytics/score-history/` |
| IsAuthenticated | `api/analytics/tagging-status/` |
| IsAuthenticated | `api/analytics/event/` |
| IsSuperAdmin | `api/analytics/growth/` |
