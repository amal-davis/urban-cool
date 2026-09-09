"""
Shared OTP-auth config, all overridable via environment variables (see
config/settings.py) instead of being hardcoded in views/serializers. Kept in
its own module — views.py and serializers.py both need these, and importing
views from serializers (or vice versa) would create a circular import.
"""
from django.conf import settings

OTP_LENGTH = getattr(settings, 'OTP_LENGTH', 6)
OTP_TTL_SECONDS = getattr(settings, 'OTP_TTL_SECONDS', 300)
OTP_RESEND_COOLDOWN_SECONDS = getattr(settings, 'OTP_RESEND_COOLDOWN_SECONDS', 45)
OTP_MAX_ATTEMPTS = getattr(settings, 'OTP_MAX_ATTEMPTS', 5)

# How long a signup's "mobile verified" proof (see views.py's
# SIGNUP_TOKEN_SALT) stays valid for — long enough to fill in Step 3 (name +
# email) without having to re-verify, short enough that a leaked/old token
# can't be replayed much later to create an account.
SIGNUP_TOKEN_TTL_SECONDS = getattr(settings, 'SIGNUP_TOKEN_TTL_SECONDS', 600)
