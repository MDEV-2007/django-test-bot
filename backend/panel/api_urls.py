from django.urls import path

from accounts import admin_mfa
from . import api, marketing_api

app_name = 'panel_api'

urlpatterns = [
    path('', api.dashboard_api, name='dashboard'),
    path('mfa/status/', admin_mfa.panel_mfa_status_api, name='mfa_status'),
    path('mfa/enroll/', admin_mfa.panel_mfa_enroll_api, name='mfa_enroll'),
    path('mfa/verify/', admin_mfa.panel_mfa_verify_api, name='mfa_verify'),
    path('mfa/lock/', admin_mfa.panel_mfa_lock_api, name='mfa_lock'),

    path('users/', api.users_api, name='users'),
    path('users/create/', api.user_create_api, name='user_create'),
    path('users/<int:pk>/', api.user_detail_api, name='user_detail'),
    path('users/<int:pk>/edit/', api.user_edit_api, name='user_edit'),
    path('users/<int:pk>/toggle-block/', api.user_toggle_block_api, name='user_toggle_block'),
    path('users/<int:pk>/reset-password/', api.user_reset_password_api, name='user_reset_password'),
    path('users/<int:pk>/adjust/', api.user_adjust_api, name='user_adjust'),
    path('users/<int:pk>/set-premium/', api.user_set_premium_api, name='user_set_premium'),
    path('users/<int:pk>/impersonate/', api.user_impersonate_api, name='user_impersonate'),
    path('teachers/<int:pk>/verify/', api.teacher_verify_api, name='teacher_verify'),
    path('stop-impersonation/', api.stop_impersonation_api, name='stop_impersonation'),

    path('teachers/', api.teachers_api, name='teachers'),
    path('teachers/create/', api.teacher_create_api, name='teacher_create'),

    path('subjects/', api.subjects_api, name='subjects'),
    path('subjects/<int:pk>/', api.subject_detail_api, name='subject_detail'),

    path('shop/', api.shop_items_api, name='shop'),
    path('shop/<int:pk>/', api.shop_item_detail_api, name='shop_detail'),

    path('testsets/', api.testsets_api, name='testsets'),
    path('testsets/bulk/', api.testsets_bulk_api, name='testsets_bulk'),
    path('testsets/<int:pk>/', api.testset_detail_api, name='testset_detail'),
    path('testsets/<int:pk>/edit/', api.testset_edit_api, name='testset_edit'),
    path('testsets/<int:pk>/audio/', api.testset_listening_audio_api, name='testset_listening_audio'),
    path('testsets/<int:pk>/duplicate/', api.testset_duplicate_api, name='testset_duplicate'),
    path('testsets/<int:pk>/toggle-publish/', api.testset_toggle_publish_api, name='testset_toggle_publish'),
    path('testsets/<int:pk>/review/', api.testset_review_api, name='testset_review'),
    path('testsets/<int:pk>/review/<int:question_pk>/', api.testset_review_answer_api,
         name='testset_review_answer'),

    path('lessons/', api.lessons_api, name='lessons'),
    path('lessons/<int:pk>/', api.lesson_detail_api, name='lesson_detail'),

    path('games/', api.games_api, name='games'),
    path('games/<int:pk>/', api.game_detail_api, name='game_detail'),

    path('attempts/', api.attempts_api, name='attempts'),
    path('attempts/export/', api.attempts_export_api, name='attempts_export'),
    path('attempts/<int:pk>/', api.attempt_detail_api, name='attempt_detail'),

    path('payments/', api.payments_api, name='payments'),
    path('payments/<int:pk>/', api.payment_detail_api, name='payment_detail'),
    path('payments/<int:pk>/approve/', api.payment_approve_api, name='payment_approve'),
    path('payments/<int:pk>/reject/', api.payment_reject_api, name='payment_reject'),
    path('payments/grant/', api.payments_grant_api, name='payments_grant'),

    path('settings/', api.settings_api, name='settings'),
    path('audit-log/', api.audit_log_api, name='audit_log'),

    path('broadcast/', api.broadcast_api, name='broadcast'),
    path('broadcast/<int:pk>/delete/', api.broadcast_delete_api, name='broadcast_delete'),

    path('surveys/', api.surveys_api, name='surveys'),
    path('surveys/<int:pk>/toggle-featured/', api.survey_toggle_featured_api, name='survey_toggle_featured'),
    path('surveys/create/', api.survey_create_api, name='survey_create'),
    path('surveys/<int:pk>/delete/', api.survey_delete_api, name='survey_delete'),
    path('mocks/', api.mock_attempts_api, name='mock_attempts'),
    path('mocks/attempts/<int:attempt_id>/review/', api.mock_prize_review_api, name='mock_prize_review'),
    path('mocks/registrations/<int:reg_id>/review/', api.mock_registration_review_api, name='mock_registration_review'),
    path('mocks/live/', api.live_mock_monitor_api, name='live_mock_monitor'),
    path('mocks/<int:pk>/remind/', api.trigger_mock_reminder_api, name='trigger_mock_reminder'),
    path('mocks/export/', api.mock_attempts_export_api, name='mock_attempts_export'),
    path('mocks/export-pdf/', api.mock_attempts_export_pdf_api, name='mock_attempts_export_pdf'),

    path('promocodes/', api.promocodes_api, name='promocodes'),
    path('promocodes/<int:pk>/', api.promocode_detail_api, name='promocode_detail'),
    path('promocodes/<int:pk>/toggle/', api.promocode_toggle_api, name='promocode_toggle'),

    path('finance/', api.financial_analytics_api, name='finance'),

    path('telegram/status/', api.telegram_bot_status_api, name='telegram_status'),
    path('telegram/channels/', api.telegram_channels_api, name='telegram_channels'),
    path('telegram/channels/<int:pk>/', api.telegram_channel_delete_api, name='telegram_channel_delete'),
    path('telegram/reset-menu/', api.telegram_reset_menu_api, name='telegram_reset_menu'),

    path('users/export/', api.users_export_csv_api, name='users_export_csv'),

    path('system/health/', api.system_health_api, name='system_health'),
    path('system/flush-cache/', api.system_cache_flush_api, name='system_flush_cache'),
    path('system/logs/', api.system_logs_api, name='system_logs'),
    path('system/anti-cheat/', api.anti_cheat_report_api, name='anti_cheat_report'),
    path('system/backup/', api.database_backup_api, name='database_backup'),
    path('system/backups/', api.backup_list_api, name='backup_list'),
    path('system/backups/download/<str:filename>/', api.backup_download_api, name='backup_download'),
    path('system/ai-usage/', api.ai_usage_api, name='ai_usage'),

    path('certificate/<int:attempt_pk>/', api.generate_certificate_api, name='generate_certificate'),

    path('broadcast/schedule/', api.broadcast_schedule_api, name='broadcast_schedule'),
    path('marketing/analytics/', marketing_api.marketing_analytics_api, name='marketing_analytics'),
    path('marketing/telegram-post/', marketing_api.marketing_post_to_telegram_api, name='marketing_telegram_post'),

    # Feature Flags (IlmIldizi 2.0)
    path('features/', api.features_list_api, name='features_list'),
    path('features/public/', api.features_public_api, name='features_public'),
    path('features/<str:key>/toggle/', api.feature_toggle_api, name='feature_toggle'),

    # Bilim Reels CMS & Hardest Questions
    path('reels/', api.panel_reels_list_create_api, name='panel_reels_list_create'),
    path('reels', api.panel_reels_list_create_api),
    path('reels/<int:reel_id>/', api.panel_reels_detail_api, name='panel_reels_detail'),
    path('reels/<int:reel_id>', api.panel_reels_detail_api),
    path('reels/<int:reel_id>/delete/', api.panel_reels_delete_api, name='panel_reels_delete'),
    path('reels/<int:reel_id>/delete', api.panel_reels_delete_api),
    path('reels/hardest-questions/', api.panel_reels_hardest_questions_api, name='panel_reels_hardest_questions'),
    path('reels/hardest-questions', api.panel_reels_hardest_questions_api),

    # Hamjamiyat (Community Feed) Moderatsiyasi
    path('community/', api.panel_community_posts_api, name='panel_community_posts'),
    path('community', api.panel_community_posts_api),
    path('community/<int:post_id>/delete/', api.panel_community_post_delete_api, name='panel_community_post_delete'),
    path('community/<int:post_id>/delete', api.panel_community_post_delete_api),
    path('community/<int:post_id>/pin/', api.panel_community_post_pin_api, name='panel_community_post_pin'),
    path('community/<int:post_id>/visibility/', api.panel_community_post_visibility_api, name='panel_community_post_visibility'),
    path('community/<int:post_id>/pin', api.panel_community_post_pin_api),

    # 24 soatlik Hikoyalar (Community Stories) Moderatsiyasi
    path('stories/', api.panel_community_stories_api, name='panel_community_stories'),
    path('stories', api.panel_community_stories_api),
    path('stories/create/', api.panel_community_story_create_api, name='panel_community_story_create'),
    path('stories/create', api.panel_community_story_create_api),
    path('stories/<int:story_id>/delete/', api.panel_community_story_delete_api, name='panel_community_story_delete'),
    path('stories/<int:story_id>/delete', api.panel_community_story_delete_api),

    # B2B O'quv Markazlari (EduCenterCampaign & Leads)
    path('campaigns/', api.panel_campaigns_api, name='panel_campaigns'),
    path('campaigns', api.panel_campaigns_api),
    path('campaigns/create/', api.panel_campaign_create_api, name='panel_campaign_create'),
    path('campaigns/create', api.panel_campaign_create_api),
    path('campaigns/<int:campaign_id>/edit/', api.panel_campaign_edit_api, name='panel_campaign_edit'),
    path('campaigns/<int:campaign_id>/edit', api.panel_campaign_edit_api),
    path('campaigns/<int:campaign_id>/toggle/', api.panel_campaign_toggle_api, name='panel_campaign_toggle'),
    path('campaigns/<int:campaign_id>/toggle', api.panel_campaign_toggle_api),
    path('campaigns/<int:campaign_id>/delete/', api.panel_campaign_delete_api, name='panel_campaign_delete'),
    path('campaigns/<int:campaign_id>/delete', api.panel_campaign_delete_api),
    path('campaigns/leads/', api.panel_campaign_leads_api, name='panel_campaign_leads'),
    path('campaigns/leads/<int:lead_id>/status/', api.panel_lead_status_api, name='panel_lead_status'),
    path('campaigns/leads', api.panel_campaign_leads_api),
    path('campaigns/<int:campaign_id>/review/', api.panel_campaign_review_api, name='panel_campaign_review'),
    path('advertisers/', api.panel_advertisers_api, name='panel_advertisers'),
    path('advertisers/<int:center_id>/review/', api.panel_advertiser_review_api, name='panel_advertiser_review'),

    # BMB Real Imtihon Zali (Stress Mode) Super Admin
    path('stress-exam/', api.stress_exam_admin_api, name='stress_exam_admin'),
    path('stress-exam', api.stress_exam_admin_api),
]

