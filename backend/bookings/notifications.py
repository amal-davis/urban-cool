"""
Email notifications for TechnicianNotification/CustomerNotification rows —
wired up via post_save signals (see apps.py's ready()), not called directly
from views or Booking.save(). Same "one place, can't be forgotten" design
those two models' own docstrings already describe for the in-app
notification bell they back: however a row gets created — today that's
always Booking.save() (a customer booking a service, a technician's status
update, an admin editing a commission — Django Admin saves go through the
same save() override), and anything added later the same way — an email
follows automatically, with no second call site to remember.

This is genuinely how every category from the brief is covered, not four
separate features:
- "booking a service" -> CustomerNotification(TYPE_BOOKING_CREATED)
- "technician to the user" -> CustomerNotification's on-the-way/started/
  completed rows, created when the technician's own status-update endpoint
  (bookings/views.py's technician_job_update_status) changes a booking
- "from the admin" -> Django Admin edits a Booking (status, commission)
  the exact same way any other code does, through the same save()
- "to the technician" -> TechnicianNotification's assigned/status_update/
  commission_updated rows

Failures here are swallowed, not raised — an SMTP hiccup must never turn
into a 500 on booking creation/status update. The in-app notification bell
(what these rows actually back) has already been written to the database
by the time this runs either way, so a failed send only means a missed
email, never a booking that silently failed to save.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CustomerNotification, TechnicianNotification

logger = logging.getLogger('bookings')


def _send(subject, message, to_email):
    if not to_email:
        return
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)
    except Exception:
        # Logged, not re-raised — see module docstring.
        logger.exception('Failed to send notification email to %s', to_email)


@receiver(post_save, sender=CustomerNotification)
def email_customer_notification(sender, instance, created, **kwargs):
    if not created:
        return
    message = instance.message
    if instance.booking_id is not None:
        message = f'{message}\n\nBooking reference: {instance.booking.booking_ref}'
    _send(subject=f'Urban Cool — {instance.title}', message=message, to_email=instance.customer.email)


@receiver(post_save, sender=TechnicianNotification)
def email_technician_notification(sender, instance, created, **kwargs):
    if not created:
        return
    message = f'{instance.message}\n\nBooking reference: {instance.booking.booking_ref}'
    _send(subject=f'Urban Cool — {instance.get_type_display()}', message=message, to_email=instance.technician.email)
