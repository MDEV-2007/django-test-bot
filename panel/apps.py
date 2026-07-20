from django.apps import AppConfig


class PanelConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'panel'

    def ready(self):
        # Register the audit-log signal handlers on the tracked content models.
        from . import signals  # noqa: F401
