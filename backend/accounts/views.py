import secrets

from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.hashers import check_password, make_password
from django.core import signing
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from . import sms
from .constants import (
    OTP_LENGTH,
    OTP_MAX_ATTEMPTS,
    OTP_RESEND_COOLDOWN_SECONDS,
    OTP_TTL_SECONDS,
    SIGNUP_TOKEN_TTL_SECONDS,
)
from .models import Address, Customer, PhoneOTP, TechnicianProfile
from .serializers import (
    AddressSerializer,
    ChangeMobileSendOtpSerializer,
    ChangeMobileVerifySerializer,
    CreateAccountSerializer,
    CustomerProfileSerializer,
    SendOtpSerializer,
    TechnicianSelfSerializer,
    TechnicianSerializer,
    VerifyOtpSerializer,
    extract_local_number,
)

# Salts django.core.signing's token to this specific purpose — a token
# signed for something else elsewhere in the app could never be replayed
# here, and vice versa.
SIGNUP_TOKEN_SALT = 'accounts.signup-verified-phone'


class OtpSendThrottle(AnonRateThrottle):
    """Caps OTP requests per IP — see REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
    in config/settings.py for the actual rate. Independent of the
    per-phone-number resend cooldown enforced below, which stops one number
    being spammed from many IPs; this stops one IP spamming many numbers."""

    scope = 'otp_send'


class OtpVerifyThrottle(AnonRateThrottle):
    scope = 'otp_verify'


class SignupThrottle(AnonRateThrottle):
    """Covers the two signup endpoints that aren't themselves an OTP send —
    signup's own send-otp view reuses OtpSendThrottle instead. Shares the
    'otp_send' scope rather than adding a new settings key for what is, in
    effect, the same "cheap unauthenticated endpoint, cap it" concern."""

    scope = 'otp_send'


def _generate_code(length: int = OTP_LENGTH) -> str:
    # secrets.choice, not random.choice — this is a security-sensitive code,
    # not a cosmetic random value.
    return ''.join(secrets.choice('0123456789') for _ in range(length))


def _has_completed_signup(phone: str) -> bool:
    """True only for a phone that finished Step 3 (has a Customer row).

    verify_otp below auto-provisions a bare user (unusable password, no
    Customer profile) on a first-time *login*, so a user row existing for
    `phone` on its own does NOT mean "already signed up" — otherwise every
    number that ever logged in once would be permanently locked out of
    Signup.
    """
    return Customer.objects.filter(mobile_number=f'+91{phone}').exists()


def _account_exists_response() -> Response:
    return Response(
        {
            'detail': 'An account already exists with this mobile number. Please log in instead.',
            'code': 'account_exists',
        },
        status=status.HTTP_409_CONFLICT,
    )


def _issue_otp(phone: str, purpose: str, *, recipient_name: str | None = None) -> Response:
    """Shared by send_otp, signup_send_otp, change_mobile_send_otp, and
    technician_send_otp: enforce the resend cooldown, generate + store a
    fresh code, and hand it to the SMS layer.

    `purpose` (PhoneOTP.PURPOSE_LOGIN / PURPOSE_REGISTRATION / ...) scopes
    every step below to that purpose alone — the cooldown, which codes get
    invalidated, and which code is created — so a login OTP request and a
    registration OTP request for the same phone never interfere with each
    other, and _consume_otp's matching purpose check (below) is what stops
    one purpose's code from being replayed against the other's verify
    endpoint.

    `recipient_name` is passed straight through to sms.send_otp_sms — only
    technician_send_otp supplies it (see that view), so the technician login
    dev-console banner can read "Technician: <name>"; every other caller
    leaves it unset and gets the same generic banner as before.
    """
    now = timezone.now()

    last_otp = PhoneOTP.objects.filter(phone=phone, purpose=purpose).order_by('-created_at').first()
    if last_otp:
        seconds_since_last = (now - last_otp.created_at).total_seconds()
        if seconds_since_last < OTP_RESEND_COOLDOWN_SECONDS:
            retry_after = int(OTP_RESEND_COOLDOWN_SECONDS - seconds_since_last)
            return Response(
                {
                    'detail': 'Please wait before requesting another OTP.',
                    'code': 'resend_cooldown',
                    'retry_after': retry_after,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

    code = _generate_code()

    # Any earlier, still-unused code for this (phone, purpose) stops being
    # valid the moment a new one is issued — otherwise two outstanding codes
    # for the same number/purpose would both verify successfully.
    PhoneOTP.objects.filter(phone=phone, purpose=purpose, is_used=False).update(is_used=True)
    PhoneOTP.objects.create(
        phone=phone,
        purpose=purpose,
        code_hash=make_password(code),
        expires_at=now + timezone.timedelta(seconds=OTP_TTL_SECONDS),
    )

    try:
        sms.send_otp_sms(phone, code, purpose, recipient_name=recipient_name)
    except sms.SmsProviderNotConfigured:
        return Response(
            {'detail': 'OTP delivery is not configured on this server yet.', 'code': 'sms_not_configured'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {
            'detail': 'OTP sent successfully.',
            'expires_in': OTP_TTL_SECONDS,
            'resend_after': OTP_RESEND_COOLDOWN_SECONDS,
            'otp_length': OTP_LENGTH,
        }
    )


def _consume_otp(phone: str, submitted_code: str, purpose: str):
    """Shared by verify_otp and signup_verify_otp: look up the latest unused
    code for (`phone`, `purpose`) and check it against `submitted_code`,
    mutating attempts/is_used exactly as the single-endpoint version used to.

    Returns (error_response, otp). error_response is None on a correct code
    — callers stay responsible for whatever happens *after* that (the login
    flow creates a session immediately; the signup flow mints a token
    instead, since the account isn't complete yet).
    """
    otp = PhoneOTP.objects.filter(phone=phone, purpose=purpose, is_used=False).order_by('-created_at').first()
    if not otp:
        return (
            Response(
                {
                    'detail': 'No OTP request found for this number. Please request a new OTP.',
                    'code': 'otp_not_found',
                },
                status=status.HTTP_400_BAD_REQUEST,
            ),
            None,
        )

    if timezone.now() > otp.expires_at:
        return (
            Response(
                {'detail': 'This OTP has expired. Please request a new one.', 'code': 'otp_expired'},
                status=status.HTTP_400_BAD_REQUEST,
            ),
            None,
        )

    if otp.attempts >= OTP_MAX_ATTEMPTS:
        return (
            Response(
                {
                    'detail': 'Too many incorrect attempts. Please request a new OTP.',
                    'code': 'otp_locked',
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            ),
            None,
        )

    if not check_password(submitted_code, otp.code_hash):
        otp.attempts += 1
        otp.save(update_fields=['attempts'])
        return (
            Response(
                {
                    'detail': 'Incorrect OTP. Please try again.',
                    'code': 'otp_invalid',
                    'attempts_remaining': max(OTP_MAX_ATTEMPTS - otp.attempts, 0),
                },
                status=status.HTTP_400_BAD_REQUEST,
            ),
            None,
        )

    otp.is_used = True
    otp.save(update_fields=['is_used'])
    return None, otp


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([OtpSendThrottle])
def send_otp(request):
    """Login Step 1. Unlike the very first version of this endpoint, a
    number that never completed Signup is rejected here rather than being
    silently auto-provisioned on successful verification — logging in is
    now only for existing customers; creating one is Signup's job alone."""
    serializer = SendOtpSerializer(data=request.data)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    phone = serializer.validated_data['phone']
    if not _has_completed_signup(phone):
        return Response(
            {
                'detail': 'No account found for this mobile number. Please sign up first.',
                'code': 'not_registered',
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    return _issue_otp(phone, PhoneOTP.PURPOSE_LOGIN)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([OtpVerifyThrottle])
def verify_otp(request):
    serializer = VerifyOtpSerializer(data=request.data)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    phone = serializer.validated_data['phone']
    submitted_code = serializer.validated_data['otp']

    error, otp = _consume_otp(phone, submitted_code, PhoneOTP.PURPOSE_LOGIN)
    if error is not None:
        return error

    # send_otp already refused to issue a login OTP for any number without a
    # completed Signup (see its own docstring), so the matching User row is
    # guaranteed to exist by the time a login OTP can ever be verified here.
    # get_or_create (not get()) is still a deliberate defensive fallback,
    # not a real provisioning path: OTP-only login has no password to check,
    # so there is no separate "wrong credentials" case to worry about, and
    # this never runs for an actually-unregistered number to begin with.
    user_model = get_user_model()
    user, created = user_model.objects.get_or_create(username=phone)
    if created:
        user.set_unusable_password()
        user.save(update_fields=['password'])

    # Establishes the session cookie DRF's SessionAuthentication expects
    # (see REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] in settings.py)
    # — there is no separate token for the frontend to store.
    login(request, user)

    return Response({'detail': 'Signed in successfully.', 'user': {'phone': phone}})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([SignupThrottle])
def signup_send_otp(request):
    """Signup Step 1: validate the number, then — unlike plain send_otp —
    refuse to hand out a code at all for a phone that already completed
    Signup, so Step 2 can never even start for it. See _has_completed_signup
    for exactly what "already exists" means here."""
    serializer = SendOtpSerializer(data=request.data)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    phone = serializer.validated_data['phone']
    if _has_completed_signup(phone):
        return _account_exists_response()

    return _issue_otp(phone, PhoneOTP.PURPOSE_REGISTRATION)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([OtpVerifyThrottle])
def signup_verify_otp(request):
    """Signup Step 2: verify the code but — unlike verify_otp — never create
    a session or a user row here. A number only counts as "signed up" once
    Step 3 (name + email) completes, so this hands back a short-lived signed
    token proving the phone was OTP-verified, for signup_create_account to
    trust instead of re-checking the OTP (or the client's own claimed
    state) again."""
    serializer = VerifyOtpSerializer(data=request.data)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    phone = serializer.validated_data['phone']

    # Re-checked here too (not just in signup_send_otp) — closes the race
    # where the same number finishes Signup in another tab/device between
    # this device's OTP being sent and being verified.
    if _has_completed_signup(phone):
        return _account_exists_response()

    error, otp = _consume_otp(phone, serializer.validated_data['otp'], PhoneOTP.PURPOSE_REGISTRATION)
    if error is not None:
        return error

    token = signing.dumps({'phone': phone}, salt=SIGNUP_TOKEN_SALT)

    return Response({'detail': 'Mobile number verified.', 'phone': phone, 'verification_token': token})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([SignupThrottle])
def signup_create_account(request):
    """Signup Step 3: only ever completes for a phone carrying a valid,
    unexpired token from signup_verify_otp — the phone number itself comes
    from that token, never from client-submitted input, so this is the
    server-side guarantee that an account can't be created (or created for
    a different number than was actually verified) without a real OTP
    check, no matter what the frontend's own state claims."""
    serializer = CreateAccountSerializer(data=request.data)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    token = serializer.validated_data['verification_token']
    try:
        payload = signing.loads(token, salt=SIGNUP_TOKEN_SALT, max_age=SIGNUP_TOKEN_TTL_SECONDS)
    except signing.SignatureExpired:
        return Response(
            {
                'detail': 'Your mobile verification has expired. Please verify your number again.',
                'code': 'verification_expired',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except signing.BadSignature:
        return Response(
            {
                'detail': 'Mobile verification is invalid. Please verify your number again.',
                'code': 'verification_invalid',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    phone = payload['phone']
    full_name = serializer.validated_data['full_name']
    email = serializer.validated_data['email']

    if _has_completed_signup(phone):
        return _account_exists_response()

    user_model = get_user_model()
    if user_model.objects.filter(email__iexact=email).exclude(username=phone).exists():
        return Response(
            {'detail': 'This email address is already registered.', 'code': 'email_exists'},
            status=status.HTTP_409_CONFLICT,
        )

    # Same provisioning shape as verify_otp's login path (OTP-only, unusable
    # password) — get_or_create rather than create() because a bare user row
    # may already exist for this phone from a prior plain login.
    user, created = user_model.objects.get_or_create(username=phone)
    user.first_name = full_name
    user.email = email
    if created or not user.has_usable_password():
        user.set_unusable_password()
    user.save(update_fields=['first_name', 'email', 'password'])

    # The Customer row is what actually marks this phone as "signed up" —
    # see _has_completed_signup. update_or_create rather than create() so
    # this stays safe to call again for the same user (it never is today,
    # since _has_completed_signup already blocks a repeat, but a get_or_
    # create-shaped user row above deserves a matching shape here).
    Customer.objects.update_or_create(
        user=user,
        defaults={'mobile_number': f'+91{phone}', 'name': full_name, 'email': email},
    )

    # Same session-cookie mechanism as verify_otp — signup ends with the
    # user already signed in, not a separate "now log in" step.
    login(request, user)

    return Response(
        {
            'detail': 'Account created successfully.',
            'user': {'phone': phone, 'full_name': full_name, 'email': email},
        }
    )


def _customer_for(request):
    """The authenticated request's own Customer row, or None if this account
    isn't one (e.g. a staff/admin login with no Signup-created profile) —
    every view below turns None into a 404 rather than crashing. Never takes
    an id from anywhere but request.user, so there is no parameter a caller
    could change to reach a different customer's data."""
    return Customer.objects.filter(user=request.user).select_related('user').first()


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def customer_profile(request):
    """The authenticated customer's own profile. GET returns name/email/
    mobile_number; PATCH updates name/email only — CustomerProfileSerializer
    marks mobile_number read-only, so a PATCH body that includes it has that
    part silently ignored. Changing the number is change_mobile_*'s job."""
    customer = _customer_for(request)
    if customer is None:
        return Response({'detail': 'No customer profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(CustomerProfileSerializer(customer).data)

    serializer = CustomerProfileSerializer(customer, data=request.data, partial=True)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'POST', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def customer_address(request):
    """The authenticated customer's own single address — always resolved via
    request.user's Customer row, never a client-supplied address id, so one
    customer can never view/create/edit/delete another's address."""
    customer = _customer_for(request)
    if customer is None:
        return Response({'detail': 'No customer profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    address = Address.objects.filter(customer=customer).first()

    if request.method == 'GET':
        if address is None:
            return Response({'detail': 'No address added yet.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AddressSerializer(address).data)

    if request.method == 'POST':
        if address is not None:
            return Response(
                {'detail': 'An address already exists. Use PATCH to update it.', 'code': 'address_exists'},
                status=status.HTTP_409_CONFLICT,
            )
        serializer = AddressSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))[0]
            return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(customer=customer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # PATCH and DELETE both require an existing address.
    if address is None:
        return Response({'detail': 'No address added yet.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        serializer = AddressSerializer(address, data=request.data, partial=True)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))[0]
            return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    address.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Ends the session server-side via Django's own logout() — a client-
    side cookie delete alone would leave a valid session behind."""
    logout(request)
    return Response({'detail': 'Logged out successfully.'})


class ChangeMobileThrottle(AnonRateThrottle):
    """Shares the 'otp_send' scope — same "cheap OTP-issuing endpoint, cap
    it" reasoning as OtpSendThrottle/SignupThrottle above."""

    scope = 'otp_send'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([ChangeMobileThrottle])
def change_mobile_send_otp(request):
    """Step 1 of changing a signed-in customer's mobile number. Unlike
    Login/Signup's send-otp views, this one is authenticated — the OTP is
    always issued for whatever new number *this* logged-in customer typed,
    validated (Indian mobile + not already taken by a different customer)
    by ChangeMobileSendOtpSerializer."""
    customer = _customer_for(request)
    if customer is None:
        return Response({'detail': 'No customer profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ChangeMobileSendOtpSerializer(data=request.data, context={'customer': customer})
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    return _issue_otp(serializer.validated_data['phone'], PhoneOTP.PURPOSE_CHANGE_MOBILE)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([OtpVerifyThrottle])
def change_mobile_verify_otp(request):
    """Step 2: verifies the code, then — only on success — updates
    Customer.mobile_number and the underlying User.username together, the
    same pairing signup_create_account already maintains, so the two can
    never drift out of sync. No session refresh needed: Django's session
    keys off the user's primary key, not username, so this stays logged in
    throughout as the same session."""
    customer = _customer_for(request)
    if customer is None:
        return Response({'detail': 'No customer profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ChangeMobileVerifySerializer(data=request.data, context={'customer': customer})
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    phone = serializer.validated_data['phone']
    submitted_code = serializer.validated_data['otp']

    error, otp = _consume_otp(phone, submitted_code, PhoneOTP.PURPOSE_CHANGE_MOBILE)
    if error is not None:
        return error

    # Re-checked here too (not just in the serializer above) — closes the
    # race where the new number gets taken by someone else between this
    # OTP being sent and being verified.
    if Customer.objects.filter(mobile_number=f'+91{phone}').exclude(pk=customer.pk).exists():
        return Response(
            {'detail': 'This mobile number is already registered to another account.', 'code': 'mobile_taken'},
            status=status.HTTP_409_CONFLICT,
        )

    customer.mobile_number = f'+91{phone}'
    customer.save(update_fields=['mobile_number'])
    request.user.username = phone
    request.user.save(update_fields=['username'])

    return Response(CustomerProfileSerializer(customer).data)


# --- Technician auth (OTP login) ---
#
# Deliberately mirrors send_otp/verify_otp above rather than introducing a
# second auth mechanism: same PhoneOTP model, same _issue_otp/_consume_otp
# helpers, same session-cookie login() DRF's SessionAuthentication already
# expects (see REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] in
# settings.py) — the only things that differ from customer login are (a)
# which table a phone number is looked up against (TechnicianProfile, not
# Customer) and (b) the PURPOSE_TECHNICIAN_LOGIN OTP purpose, so a login OTP
# issued for a customer's number can never be replayed here and vice versa
# (PhoneOTP.purpose already scopes every lookup — see its own docstring).
#
# Public (AllowAny) by necessity — a technician has no session yet at this
# point — but "public" here only ever means "can attempt," never "can
# self-register": every technician row still comes exclusively from the
# admin-only endpoints below (or Django Admin), per this project's brief.
# A phone number with no matching, active TechnicianProfile can never
# receive or verify an OTP through these two views, no matter what it
# submits.


def _technician_for(request):
    """The authenticated request's own TechnicianProfile row, or None —
    same "resolve strictly from request.user, never a client-supplied id"
    shape as _customer_for above. None here is also how a *customer's*
    session naturally fails technician_profile below: a customer's user has
    no technician_profile row, so this can never accidentally authorize one
    as the other."""
    return TechnicianProfile.objects.filter(user=request.user).select_related('user').first()


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([OtpSendThrottle])
def technician_send_otp(request):
    """Technician Login Step 1. Unlike customer send_otp (which checks
    Signup completion), this checks TechnicianProfile directly — the only
    way a number ends up there at all is an admin having created it."""
    serializer = SendOtpSerializer(data=request.data)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    phone = serializer.validated_data['phone']
    technician = TechnicianProfile.objects.filter(mobile_number=f'+91{phone}').select_related('user').first()
    if technician is None:
        return Response(
            {
                'detail': 'No technician account found for this mobile number.',
                'code': 'not_registered',
            },
            status=status.HTTP_404_NOT_FOUND,
        )
    if not technician.is_active:
        return Response(
            {
                'detail': 'Your technician account has been deactivated. Please contact the admin.',
                'code': 'technician_inactive',
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    return _issue_otp(phone, PhoneOTP.PURPOSE_TECHNICIAN_LOGIN, recipient_name=technician.name)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([OtpVerifyThrottle])
def technician_verify_otp(request):
    serializer = VerifyOtpSerializer(data=request.data)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    phone = serializer.validated_data['phone']
    submitted_code = serializer.validated_data['otp']

    # Re-checked here too (not just in technician_send_otp) — closes the
    # race where an admin deactivates the technician between the OTP being
    # sent and being verified, same reasoning change_mobile_verify_otp's own
    # re-check already follows.
    technician = TechnicianProfile.objects.filter(mobile_number=f'+91{phone}').select_related('user').first()
    if technician is None:
        return Response(
            {'detail': 'No technician account found for this mobile number.', 'code': 'not_registered'},
            status=status.HTTP_404_NOT_FOUND,
        )
    if not technician.is_active:
        return Response(
            {
                'detail': 'Your technician account has been deactivated. Please contact the admin.',
                'code': 'technician_inactive',
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    error, otp = _consume_otp(phone, submitted_code, PhoneOTP.PURPOSE_TECHNICIAN_LOGIN)
    if error is not None:
        return error

    # Same session-cookie mechanism as customer verify_otp — no separate
    # token, no separate auth system. technician.user already exists (an
    # admin created it — see TechnicianSerializer.create()), so unlike
    # customer verify_otp there is no get_or_create fallback to reach for.
    login(request, technician.user)

    return Response({'detail': 'Signed in successfully.', 'technician': TechnicianSelfSerializer(technician).data})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def technician_profile(request):
    """The authenticated technician's own profile — same role as
    customer_profile above, and what TechnicianDashboard's ProtectedRoute
    equivalent polls on mount to answer "am I signed in as a technician"
    (see frontend/src/lib/TechnicianAuthContext.tsx). A customer's session
    hitting this 404s (_technician_for finds no row) exactly like a
    logged-out visitor would — the two are indistinguishable here on
    purpose, so a customer session can never be treated as a technician one.

    No explicit is_active re-check here (unlike technician_send_otp/
    technician_verify_otp, which must check it themselves — there's no
    session yet at that point): DRF's own SessionAuthentication already
    treats an inactive user's session as unauthenticated (it checks
    user.is_active before this view ever runs), so a technician deactivated
    after logging in already gets a plain 403 from IsAuthenticated alone,
    the same way a deactivated Customer's session already does today.

    PATCH updates name/email/address/experience only —
    TechnicianSelfSerializer marks mobile_number/profile_image/
    specialization/is_active read-only, so a PATCH body that includes any
    of those has that part silently ignored, same pattern customer_profile
    already follows for mobile_number. This is what TechnicianProfilePage.tsx's
    "Save Changes" now calls instead of only updating local React state."""
    technician = _technician_for(request)
    if technician is None:
        return Response({'detail': 'No technician profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(TechnicianSelfSerializer(technician).data)

    serializer = TechnicianSelfSerializer(technician, data=request.data, partial=True)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)
    updated = serializer.save()
    return Response(TechnicianSelfSerializer(updated).data)


# --- Technician management (admin-only) ---
#
# IsAdminUser (DRF built-in) gates every view below on request.user.is_staff
# — the same flag that already gates Django Admin itself, not a new
# authorization mechanism. A customer (however authenticated) gets a plain
# 403 from all of these — only an admin creates/edits/activates/deactivates
# technicians, never the technician-auth views above or any public endpoint.


def _get_technician_or_404(pk):
    try:
        return TechnicianProfile.objects.select_related('user').get(pk=pk)
    except TechnicianProfile.DoesNotExist:
        return None


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def technician_list_create(request):
    if request.method == 'GET':
        technicians = TechnicianProfile.objects.select_related('user').all()
        return Response(TechnicianSerializer(technicians, many=True).data)

    serializer = TechnicianSerializer(data=request.data)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)
    # TechnicianSerializer.create() creates the User (role=TECHNICIAN) and
    # the TechnicianProfile together — see its own docstring.
    technician = serializer.save()
    return Response(TechnicianSerializer(technician).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def technician_detail(request, pk):
    technician = _get_technician_or_404(pk)
    if technician is None:
        return Response({'detail': 'Technician not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(TechnicianSerializer(technician).data)

    serializer = TechnicianSerializer(technician, data=request.data, partial=True)
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)
    # TechnicianSerializer.update() also keeps User.username/first_name/
    # email in sync with whatever changed — see its own docstring.
    updated = serializer.save()
    return Response(TechnicianSerializer(updated).data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def technician_activate(request, pk):
    technician = _get_technician_or_404(pk)
    if technician is None:
        return Response({'detail': 'Technician not found.'}, status=status.HTTP_404_NOT_FOUND)
    # Flips User.is_active, never deletes anything — a deactivated
    # technician's historical booking records (once bookings exist) stay
    # intact regardless of this flag.
    technician.user.is_active = True
    technician.user.save(update_fields=['is_active'])
    return Response(TechnicianSerializer(technician).data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def technician_deactivate(request, pk):
    technician = _get_technician_or_404(pk)
    if technician is None:
        return Response({'detail': 'Technician not found.'}, status=status.HTTP_404_NOT_FOUND)
    technician.user.is_active = False
    technician.user.save(update_fields=['is_active'])
    return Response(TechnicianSerializer(technician).data)
