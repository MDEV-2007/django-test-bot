from django.apps import AppConfig


class PanelConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'panel'

    def ready(self):
        # Register the audit-log signal handlers on the tracked content models.
        from . import signals  # noqa: F401
        # Register the live-notification signal handlers (new payment/registration).
        from . import realtime_signals  # noqa: F401
