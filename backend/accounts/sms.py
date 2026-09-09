"""
SMS delivery for OTP codes — deliberately isolated from views.py so wiring
up a real provider later is a one-function swap, not a scavenger hunt.

No SMS provider credentials are read, stored, or embedded here or anywhere
else in this repo. To go live, implement the provider call below by reading
its credentials from environment variables (os.environ / settings, backed
by backend/.env, which is gitignored) — never hardcode a provider secret in
source.
"""
import logging

from django.conf import settings

from .models import PhoneOTP

logger = logging.getLogger('accounts.sms')

_PURPOSE_LABELS = dict(PhoneOTP.PURPOSE_CHOICES)


class SmsProviderNotConfigured(Exception):
    """Raised when no real SMS provider is wired up and we're not in DEBUG."""


def send_otp_sms(phone: str, code: str, purpose: str = PhoneOTP.PURPOSE_LOGIN, *, recipient_name: str | None = None) -> None:
    """Send `code` to `phone` (bare 10-digit Indian mobile number) for the
    given `purpose` ('login', 'registration', 'change_mobile', or
    'technician_login').

    `recipient_name` is optional and only ever used to make the technician
    login banner below read "Technician: <name>" — every other purpose
    ignores it, unchanged from before this parameter existed.

    Raises SmsProviderNotConfigured if there's no way to actually deliver
    the message — callers must treat that as a failed send, never as
    success. This function only ever logs the code to the *server's* own
    console, and only in DEBUG; it is never sent to the browser or logged
    anywhere the frontend/user can see it.
    """
    if settings.DEBUG:
        # Deliberately never touches Python's logging %-formatting for the
        # banner body itself (an f-string instead) — this exact layout is
        # part of the contract callers/tests can rely on, not something a
        # logging Formatter should be free to rewrite.
        if purpose == PhoneOTP.PURPOSE_TECHNICIAN_LOGIN:
            banner = (
                '\n' + '=' * 41 + '\n'
                'URBAN COOL TECHNICIAN LOGIN OTP\n'
                'DEVELOPMENT ONLY\n\n'
                f'Technician: {recipient_name}\n'
                f'Mobile: +91{phone}\n\n'
                f'OTP: {code}\n'
                + '=' * 41
            )
        else:
            label = _PURPOSE_LABELS.get(purpose, purpose.title())
            banner = (
                '\n' + '=' * 40 + '\n'
                'URBAN COOL DEVELOPMENT OTP  (DEV ONLY — no real SMS was sent)\n'
                f'Mobile: +91{phone}\n'
                f'Purpose: {label}\n'
                f'OTP: {code}\n'
                + '=' * 40
            )
        logger.info(banner)
        return

    # TODO: wire a real provider (e.g. MSG91, Twilio, AWS SNS) here, reading
    # its credentials from os.environ. Until then, refuse to pretend the
    # message was sent.
    raise SmsProviderNotConfigured(
        'No SMS provider is configured for this server. Add one in accounts/sms.py before deploying.'
    )
