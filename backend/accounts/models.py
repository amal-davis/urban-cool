from django.conf import settings
from django.db import models


class PhoneOTP(models.Model):
    """One-time password issued for an Indian mobile number login or
    registration attempt.

    Codes are stored hashed (`code_hash`, via django.contrib.auth.hashers) —
    never in plaintext — and are single-use. All correctness/expiry/attempt
    checks live in accounts/views.py; this model only holds state.

    `purpose` exists so a login OTP and a registration OTP for the same
    phone are never interchangeable — views.py's _issue_otp/_consume_otp
    always scope "latest unused OTP" to (phone, purpose), so an OTP sent for
    one purpose can't be replayed against the other purpose's verify
    endpoint.
    """

    PURPOSE_LOGIN = 'login'
    PURPOSE_REGISTRATION = 'registration'
    PURPOSE_CHANGE_MOBILE = 'change_mobile'
    PURPOSE_TECHNICIAN_LOGIN = 'technician_login'
    PURPOSE_CHOICES = [
        (PURPOSE_LOGIN, 'Login'),
        (PURPOSE_REGISTRATION, 'Registration'),
        (PURPOSE_CHANGE_MOBILE, 'Change mobile number'),
        (PURPOSE_TECHNICIAN_LOGIN, 'Technician login'),
    ]

    phone = models.CharField(max_length=10, db_index=True)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default=PURPOSE_LOGIN)
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    is_used = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=['phone', 'purpose', 'is_used', '-created_at'])]

    def __str__(self):
        return f'{self.get_purpose_display()} OTP for {self.phone} (used={self.is_used})'


class Customer(models.Model):
    """Profile for a customer who has completed the OTP signup flow (see
    views.py's signup_create_account), one-to-one with Django's built-in
    User rather than a swapped AUTH_USER_MODEL.

    Why not a real custom user model: by the time this was added, auth_user
    already had real rows under already-applied migrations — including a
    live admin superuser — and this project's own instructions rule out
    resetting the database or blindly replacing the user model. Swapping
    AUTH_USER_MODEL this far into a project is only safe starting from an
    empty database, so this adds the requested Customer fields
    (mobile_number/name/email) on top of the existing, already-working
    session-auth User instead.

    `is_active`/`is_staff`/`date_joined` are deliberately NOT duplicated as
    columns here — they already live correctly on `user`, and copying them
    would just be a second place they could drift out of sync. They're
    exposed as read-only properties below so admin.py/API code can read
    `customer.is_active` etc. without reaching through `customer.user`.

    A bare user auto-provisioned by a first-time *login* (verify_otp's
    get_or_create) has no Customer row — only completing all three Signup
    steps creates one. See _has_completed_signup in views.py, which checks
    for this row's existence.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='customer')
    mobile_number = models.CharField(
        max_length=13,  # '+91' + 10 digits
        unique=True,
        db_index=True,
        verbose_name='mobile number',
        help_text='E.164-ish format, e.g. +919876543210 (see serializers.extract_local_number).',
    )
    name = models.CharField(max_length=150)
    email = models.EmailField()
    created_at = models.DateTimeField('registered at', auto_now_add=True)

    class Meta:
        verbose_name = 'customer'
        verbose_name_plural = 'customers'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.mobile_number})'

    @property
    def is_active(self):
        return self.user.is_active

    @property
    def is_staff(self):
        return self.user.is_staff

    @property
    def date_joined(self):
        return self.user.date_joined


class UserProfile(models.Model):
    """One row per Django User — the single explicit source of truth for
    which of Urban Cool's three account types (customer/technician/admin)
    this user is. Per-role data lives in its own OneToOne table (`Customer`,
    `TechnicianProfile`) so this model never duplicates it — it only ever
    stores the role classification itself.

    ROLE_ADMIN is informational/for display only: every actual
    authorization check in this codebase (Django Admin access, the
    technician-management API below) keeps using Django's own
    is_staff/is_superuser, exactly as before this model existed — this field
    never grants access on its own, so there is no second, driftable
    "is this an admin" signal to keep in sync with is_staff.
    """

    ROLE_CUSTOMER = 'customer'
    ROLE_TECHNICIAN = 'technician'
    ROLE_ADMIN = 'admin'
    ROLE_CHOICES = [
        (ROLE_CUSTOMER, 'Customer'),
        (ROLE_TECHNICIAN, 'Technician'),
        (ROLE_ADMIN, 'Admin'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='role_profile')
    role = models.CharField(max_length=12, choices=ROLE_CHOICES, default=ROLE_CUSTOMER, db_index=True)

    class Meta:
        verbose_name = 'user role'
        verbose_name_plural = 'user roles'

    def __str__(self):
        return f'{self.user.username}: {self.get_role_display()}'


class TechnicianProfile(models.Model):
    """Profile for a technician account, created only by an admin (see
    views.py's technician_list_create) — mirrors Customer's own shape
    (its own name/mobile_number/email columns, not read through `user`)
    rather than reading Django's User fields directly, so the two
    role-profile tables stay structurally consistent and either can evolve
    without touching the other.

    Active/inactive reuses user.is_active directly (exactly how
    Customer.is_active already works) — deactivating a technician never
    deletes the User row, so historical booking records that reference it
    later stay intact, and reactivating is just flipping the flag back.

    "created" is `joining_date` (already existed, auto_now_add) rather than a
    second, redundant `created_at` column added alongside it — `updated_at`
    below is genuinely new (nothing previously tracked "last edited").
    """

    SPECIALIZATION_AC = 'ac'
    SPECIALIZATION_REFRIGERATOR = 'refrigerator'
    SPECIALIZATION_WASHING_MACHINE = 'washing-machine'
    SPECIALIZATION_MICROWAVE = 'microwave'
    SPECIALIZATION_CHOICES = [
        (SPECIALIZATION_AC, 'AC'),
        (SPECIALIZATION_REFRIGERATOR, 'Refrigerator'),
        (SPECIALIZATION_WASHING_MACHINE, 'Washing Machine'),
        (SPECIALIZATION_MICROWAVE, 'Microwave'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='technician_profile')
    name = models.CharField(max_length=150)
    mobile_number = models.CharField(
        max_length=13,  # '+91' + 10 digits — same shape as Customer.mobile_number
        unique=True,
        db_index=True,
        verbose_name='mobile number',
        help_text='E.164-ish format, e.g. +919876543210 (see serializers.extract_local_number).',
    )
    email = models.EmailField()
    profile_image = models.ImageField(
        upload_to='technicians/', blank=True, help_text='Shown in Django Admin and the technician dashboard.'
    )
    date_of_birth = models.DateField()
    address_line = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    # A comma-separated list of SPECIALIZATION_CHOICES keys (e.g.
    # "ac,refrigerator"), not a single value — a technician can now cover
    # more than one appliance category. No `choices=` here (unlike before):
    # Django/DRF choice validation checks the *whole* field value against
    # the choice list, which would reject any real multi-value string
    # outright; each individual token is validated instead, by
    # TechnicianProfileAdminForm's own MultipleChoiceField (admin.py) and
    # TechnicianSerializer.validate_specialization (serializers.py) — the
    # two places this field is ever written from. 60 chars comfortably
    # covers all four current keys joined at once, with room to spare.
    specialization = models.CharField(max_length=60)
    experience_years = models.PositiveSmallIntegerField(default=0)
    joining_date = models.DateField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'technician'
        verbose_name_plural = 'technicians'
        ordering = ['-joining_date']

    def __str__(self):
        return f'{self.name} ({self.mobile_number})'

    @property
    def is_active(self):
        return self.user.is_active

    @property
    def specialization_list(self):
        """The individual specialization keys this technician covers, in
        stored order — `specialization` is a comma-separated list now (see
        its own docstring), not a single value. The convenient "give them
        back separately" accessor for anything that wants that (admin.py's
        own list_display, e.g.) instead of re-splitting the raw string
        itself each time."""
        return [item for item in self.specialization.split(',') if item]

    @property
    def specialization_display(self):
        """The same list, as its human-readable labels joined for display
        (e.g. "AC, Refrigerator") — what TechnicianProfileAdmin's own
        list_display column actually shows, rather than the raw
        comma-separated keys."""
        labels = dict(self.SPECIALIZATION_CHOICES)
        return ', '.join(labels.get(key, key) for key in self.specialization_list)


class Address(models.Model):
    """A customer's single saved address — one-to-one, not a list: the
    dashboard shows/edits *the* customer's address, not an address book of
    several. See customer_address in views.py, which always derives the
    customer from request.user rather than trusting any client-supplied id.

    latitude/longitude are nullable and not collected by the dashboard's own
    address form today — kept here so a future map-pin feature doesn't need
    a migration, matching how the booking flow's own address form already
    treats the map pin as optional (see bookingValidation.ts's comment)."""

    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name='address')
    address_line = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'address'
        verbose_name_plural = 'addresses'

    def __str__(self):
        return f'{self.address_line}, {self.city}'
