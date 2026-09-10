from django.apps import AppConfig


class BookingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'bookings'

    def ready(self):
        # Registers notifications.py's post_save receivers (the
        # @receiver decorators only take effect once this module is
        # actually imported) — email sending for every TechnicianNotification/
        # CustomerNotification row, wherever it's created. Import here,
        # not at module scope in models.py, so signal wiring stays outside
        # the models module — Django's own recommended pattern.
        from . import notifications  # noqa: F401
