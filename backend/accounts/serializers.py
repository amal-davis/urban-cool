import re
from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .constants import OTP_LENGTH
from .models import Address, Customer, TechnicianProfile, UserProfile

# Same rule the frontend uses (frontend/src/lib/indianPhone.ts) — kept in
# sync deliberately, not shared code, since the two run in different
# languages/runtimes. This is the authoritative copy: the backend must not
# rely on frontend validation alone.
INDIAN_MOBILE_RE = re.compile(r'^[6-9]\d{9}$')
OTP_CODE_RE = re.compile(rf'^\d{{{OTP_LENGTH}}}$')

# Same rule frontend/src/lib/validation.ts's isValidPincode already uses for
# the booking form's address — kept in sync deliberately, same reasoning as
# INDIAN_MOBILE_RE above.
PINCODE_RE = re.compile(r'^[1-9]\d{5}$')


def extract_local_number(value: str) -> str:
    """Accepts '+919876543210', '919876543210', or '9876543210' and returns
    the bare 10-digit local number (no validation — callers check the
    result against INDIAN_MOBILE_RE)."""
    digits = re.sub(r'\D', '', value or '')
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    return digits


class SendOtpSerializer(serializers.Serializer):
    phone = serializers.CharField()

    def validate_phone(self, value):
        local_number = extract_local_number(value)
        if not INDIAN_MOBILE_RE.match(local_number):
            raise serializers.ValidationError(
                'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
            )
        return local_number


class VerifyOtpSerializer(SendOtpSerializer):
    otp = serializers.CharField()

    def validate_otp(self, value):
        if not OTP_CODE_RE.match(value or ''):
            raise serializers.ValidationError(f'Enter the {OTP_LENGTH}-digit OTP.')
        return value


class CreateAccountSerializer(serializers.Serializer):
    """Step 3 of Signup. Deliberately has no `phone` field — the verified
    number comes only from `verification_token` (see views.signup_create_
    account), never from client-submitted input, so a caller can't claim a
    different number than the one that actually completed OTP verification.
    """

    verification_token = serializers.CharField()
    full_name = serializers.CharField()
    email = serializers.EmailField()

    def validate_full_name(self, value):
        # Collapses internal runs of whitespace too, not just leading/
        # trailing — "  Jane   Doe " -> "Jane Doe". Deliberately not a
        # stricter charset check: real names carry hyphens, apostrophes,
        # periods, and non-Latin scripts that a "letters only" pattern
        # would wrongly reject.
        trimmed = ' '.join(value.split())
        if not trimmed:
            raise serializers.ValidationError('Enter your full name.')
        return trimmed

    def validate_email(self, value):
        return value.strip().lower()


class CustomerProfileSerializer(serializers.ModelSerializer):
    """GET/PATCH backing for customer_profile (views.py). mobile_number is
    read-only here on purpose — the only way to change it is the OTP-gated
    change-mobile flow below, never a plain profile PATCH, so a client that
    includes mobile_number in the PATCH body has it silently ignored rather
    than applied.

    date_joined is a plain Python @property on Customer (see models.py —
    it reads through to the linked User), not a real model field, so it must
    be declared explicitly here rather than left to ModelSerializer's
    automatic field generation, which only introspects actual model fields.
    """

    date_joined = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Customer
        fields = ['name', 'email', 'mobile_number', 'date_joined']
        read_only_fields = ['mobile_number']

    def validate_name(self, value):
        # Same whitespace-collapse as CreateAccountSerializer.validate_full_name.
        trimmed = ' '.join(value.split())
        if not trimmed:
            raise serializers.ValidationError('Enter your full name.')
        return trimmed

    def validate_email(self, value):
        return value.strip().lower()


class AddressSerializer(serializers.ModelSerializer):
    """GET/POST/PATCH backing for customer_address (views.py). `customer` is
    deliberately not a field here — the view always sets it from
    request.user.customer, never from client-submitted input, so one
    customer's address can never be created/edited under another's id."""

    class Meta:
        model = Address
        fields = ['id', 'address_line', 'city', 'state', 'pincode', 'latitude', 'longitude', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_pincode(self, value):
        if not PINCODE_RE.match(value.strip()):
            raise serializers.ValidationError('Enter a valid 6-digit PIN code.')
        return value.strip()

    def validate_address_line(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError('Enter your address.')
        return trimmed

    def validate_city(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError('Enter your city.')
        return trimmed

    def validate_state(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError('Enter your state.')
        return trimmed


class ChangeMobileSendOtpSerializer(SendOtpSerializer):
    """Step 1 of the in-dashboard mobile-number-change flow. Reuses
    SendOtpSerializer's phone validation, then additionally rejects a number
    already registered to a *different* customer — self.context['customer']
    is the requesting user's own Customer row (see change_mobile_send_otp),
    so a customer re-submitting their own current number isn't blocked."""

    def validate_phone(self, value):
        local_number = super().validate_phone(value)
        requesting_customer = self.context['customer']
        already_taken = (
            Customer.objects.filter(mobile_number=f'+91{local_number}').exclude(pk=requesting_customer.pk).exists()
        )
        if already_taken:
            raise serializers.ValidationError('This mobile number is already registered to another account.')
        return local_number


class ChangeMobileVerifySerializer(ChangeMobileSendOtpSerializer):
    otp = serializers.CharField()

    def validate_otp(self, value):
        if not OTP_CODE_RE.match(value or ''):
            raise serializers.ValidationError(f'Enter the {OTP_LENGTH}-digit OTP.')
        return value


class TechnicianSerializer(serializers.ModelSerializer):
    """List/detail/create/update backing for the admin-only technician
    endpoints (views.py's technician_list_create/technician_detail) — one
    serializer for all four, same as CustomerProfileSerializer/
    AddressSerializer each already cover both read and write for their own
    model.

    Deliberately has no `role`/`user` field — create()/update() below always
    manage the underlying User themselves; there is nothing in the request
    body that could set a role, closing the privilege-escalation case the
    brief calls out (a client can never set its own role via this or any
    other endpoint).

    create()/update() are overridden (rather than left to the plain
    ModelSerializer defaults) so this is the ONE place "make a technician
    account" and "keep User in sync with profile edits" logic lives —
    views.py's technician_list_create/technician_detail and admin.py's
    TechnicianProfileAdmin both just call serializer.save() and get
    identical behavior for free, instead of each reimplementing it.
    """

    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = TechnicianProfile
        fields = [
            'id',
            'name',
            'mobile_number',
            'email',
            'profile_image',
            'date_of_birth',
            'address_line',
            'city',
            'state',
            'pincode',
            'specialization',
            'experience_years',
            'joining_date',
            'updated_at',
            'is_active',
        ]
        read_only_fields = ['id', 'joining_date', 'updated_at']

    def validate_name(self, value):
        trimmed = ' '.join(value.split())
        if not trimmed:
            raise serializers.ValidationError('Enter the technician’s full name.')
        return trimmed

    def validate_specialization(self, value):
        # `specialization` is a comma-separated list of TechnicianProfile.
        # SPECIALIZATION_CHOICES keys now (see that model field's own
        # docstring on why it no longer carries `choices=` for the model/DRF
        # layer to validate automatically) — TechnicianProfileAdminForm's
        # own MultipleChoiceField already only ever sends valid keys when
        # this is reached via Django Admin, but this endpoint is also the
        # admin-only API directly (views.py's technician_list_create/
        # technician_detail), which has no such form in front of it, so
        # this is the one place both paths actually get checked.
        keys = [item for item in value.split(',') if item]
        valid_keys = {key for key, _label in TechnicianProfile.SPECIALIZATION_CHOICES}
        if not keys:
            raise serializers.ValidationError('Select at least one specialization.')
        invalid = [key for key in keys if key not in valid_keys]
        if invalid:
            raise serializers.ValidationError(f'"{invalid[0]}" is not a valid specialization.')
        return ','.join(keys)

    def validate_mobile_number(self, value):
        local_number = extract_local_number(value)
        if not INDIAN_MOBILE_RE.match(local_number):
            raise serializers.ValidationError(
                'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
            )
        # Checked against auth.User.username directly rather than just
        # Customer/TechnicianProfile's own mobile_number columns — username
        # is kept in sync with whichever role table's number this is for
        # *every* account type (including a bare login-only account with
        # neither row), so this alone is the authoritative "already taken"
        # check and can't miss an edge case either single table would.
        already_taken = get_user_model().objects.filter(username=local_number)
        if self.instance is not None:
            already_taken = already_taken.exclude(pk=self.instance.user_id)
        if already_taken.exists():
            raise serializers.ValidationError('This mobile number is already registered to another account.')
        return f'+91{local_number}'

    def validate_email(self, value):
        normalized = value.strip().lower()
        already_taken = get_user_model().objects.filter(email__iexact=normalized)
        if self.instance is not None:
            already_taken = already_taken.exclude(pk=self.instance.user_id)
        if already_taken.exists():
            raise serializers.ValidationError('This email address is already registered.')
        return normalized

    def validate_date_of_birth(self, value):
        today = date.today()
        if value >= today:
            raise serializers.ValidationError('Enter a valid date of birth in the past.')
        eighteen_years_ago = today.replace(year=today.year - 18)
        if value > eighteen_years_ago:
            raise serializers.ValidationError('Technician must be at least 18 years old.')
        return value

    def create(self, validated_data):
        # role=TECHNICIAN is hardcoded here, never read from the request —
        # see this class's own docstring.
        local_number = extract_local_number(validated_data['mobile_number'])
        user_model = get_user_model()
        user = user_model.objects.create(
            username=local_number, first_name=validated_data['name'], email=validated_data['email']
        )
        user.set_unusable_password()
        user.save(update_fields=['password'])
        UserProfile.objects.update_or_create(user=user, defaults={'role': UserProfile.ROLE_TECHNICIAN})
        return TechnicianProfile.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        technician = super().update(instance, validated_data)
        # Keeps User.username/first_name/email in sync with whatever
        # changed — the same pairing signup_create_account/
        # change_mobile_verify_otp already maintain for Customer, so a
        # future technician-login flow can trust `username` as the identity
        # exactly the way it already does for customers. Technician login
        # doesn't exist yet, so there's no live session this could disturb
        # (unlike Customer, mobile_number is editable directly here rather
        # than behind an OTP re-verification).
        user = technician.user
        update_fields = []
        if 'mobile_number' in validated_data:
            user.username = extract_local_number(technician.mobile_number)
            update_fields.append('username')
        if 'name' in validated_data:
            user.first_name = technician.name
            update_fields.append('first_name')
        if 'email' in validated_data:
            user.email = technician.email
            update_fields.append('email')
        if update_fields:
            user.save(update_fields=update_fields)
        return technician

    def validate_pincode(self, value):
        if not PINCODE_RE.match(value.strip()):
            raise serializers.ValidationError('Enter a valid 6-digit PIN code.')
        return value.strip()


class TechnicianSelfSerializer(serializers.ModelSerializer):
    """GET/PATCH backing for technician_profile (views.py) and the GET-only
    shape of the technician login response — a deliberately smaller field
    set than the admin-only TechnicianSerializer above: date_of_birth stays
    out entirely (nothing in the technician dashboard shows or edits it).

    address_line/city/state/pincode/experience_years ARE writable here
    (unlike the rest) — TechnicianProfilePage.tsx's "Save Changes" edits
    exactly name/email/experience/address, so those are the fields a PATCH
    from that page needs to actually persist. mobile_number/profile_image/
    specialization/is_active stay read-only: mobile_number is the OTP login
    identity (same reasoning as CustomerProfileSerializer's), profile_image
    has no real upload wired on the frontend yet (TechnicianProfilePage.tsx
    only does a local object-URL preview), and specialization/is_active are
    the admin's job (technician_detail/_activate/_deactivate), never a
    plain self-service edit.
    """

    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = TechnicianProfile
        fields = [
            'id',
            'name',
            'mobile_number',
            'email',
            'profile_image',
            'address_line',
            'city',
            'state',
            'pincode',
            'specialization',
            'experience_years',
            'is_active',
        ]
        read_only_fields = ['id', 'mobile_number', 'profile_image', 'specialization', 'is_active']

    def validate_name(self, value):
        # Same whitespace-collapse as TechnicianSerializer.validate_name.
        trimmed = ' '.join(value.split())
        if not trimmed:
            raise serializers.ValidationError('Enter your full name.')
        return trimmed

    def validate_email(self, value):
        normalized = value.strip().lower()
        already_taken = get_user_model().objects.filter(email__iexact=normalized)
        if self.instance is not None:
            already_taken = already_taken.exclude(pk=self.instance.user_id)
        if already_taken.exists():
            raise serializers.ValidationError('This email address is already registered.')
        return normalized

    def validate_pincode(self, value):
        if not PINCODE_RE.match(value.strip()):
            raise serializers.ValidationError('Enter a valid 6-digit PIN code.')
        return value.strip()

    def update(self, instance, validated_data):
        technician = super().update(instance, validated_data)
        # Keeps User.first_name/email in sync with a self-service edit too —
        # the same pairing TechnicianSerializer.update() maintains for admin
        # edits above. mobile_number is read-only on this serializer, so
        # there's no username-sync case to handle here.
        user = technician.user
        update_fields = []
        if 'name' in validated_data:
            user.first_name = technician.name
            update_fields.append('first_name')
        if 'email' in validated_data:
            user.email = technician.email
            update_fields.append('email')
        if update_fields:
            user.save(update_fields=update_fields)
        return technician
