from django.urls import path
from core import views


urlpatterns = [
    # 0-MODUL: Feature Flags
    path('feature-flags/', views.system_feature_flags_api, name='feature_flags'),
    path('admin/feature-flags/', views.admin_feature_flags_toggle_api, name='admin_feature_flags_toggle'),

    # 2-MODUL: Anti-Darslik 60s Cheat Sheet
    path('cheat-sheet/<int:topic_id>/', views.topic_cheat_sheet_api, name='topic_cheat_sheet'),

    # 3-MODUL: Ota-Ona Radari
    path('parent-radar/status/', views.parent_radar_status_api, name='parent_radar_status'),
    path('parent-radar/invoice/', views.parent_radar_send_invoice_api, name='parent_radar_send_invoice'),

    # 4-MODUL: Sinf Janglari
    path('class-battles/my/', views.class_battle_my_rooms_api, name='class_battle_my_rooms'),
    path('class-battles/create/', views.class_battle_create_api, name='class_battle_create'),
    path('class-battles/<str:pin_code>/join/', views.class_battle_join_api, name='class_battle_join'),
    path('class-battles/<int:room_id>/state/', views.class_battle_state_api, name='class_battle_state'),
    path('class-battles/<int:room_id>/start/', views.class_battle_start_api, name='class_battle_start'),
    path('class-battles/<int:room_id>/submit/', views.class_battle_submit_api, name='class_battle_submit'),
    path('class-battles/<int:room_id>/analytics/', views.class_battle_analytics_api, name='class_battle_analytics'),

    # B2B Hyper-Target Ads & Lead Gen
    path('ads/targeted-offer/', views.targeted_offer_api, name='targeted_offer'),
    path('ads/lead-submit/', views.lead_submit_api, name='lead_submit'),
    path('profile/radar/', views.student_radar_api, name='student_radar'),
]
