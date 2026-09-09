import re
from datetime import date

from rest_framework import serializers

from accounts.serializers import PINCODE_RE

from .models import (
    Booking,
    BookingImage,
    BookingTrackingEvent,
    ContactSubmission,
    CustomerNotification,
    Service,
    ServiceFeature,
    TechnicianNotification,
)

# Deliberately not the accounts app's Indian-mobile-only pattern
# (accounts/serializers.py's INDIAN_MOBILE_RE) — this is a public "get in
# touch" form, not the OTP login flow, and matches the same 7-15 digit rule
# the frontend already validates against (ContactForm.tsx's `validate`).
PHONE_DIGITS_RE = re.compile(r'^\d{7,15}$')


class ContactSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = ['name', 'email', 'phone', 'subject', 'message']
        extra_kwargs = {'subject': {'required': False, 'allow_blank': True}}

    def validate_name(self, value):
        # Collapses internal whitespace runs too, same reasoning as
        # accounts/serializers.py's CreateAccountSerializer.validate_full_name.
        trimmed = ' '.join(value.split())
        if not trimmed:
            raise serializers.ValidationError('Enter your name.')
        return trimmed

    def validate_email(self, value):
        return value.strip().lower()

    def validate_phone(self, value):
        digits = re.sub(r'\D', '', value or '')
        if not PHONE_DIGITS_RE.match(digits):
            raise serializers.ValidationError('Enter a valid phone number.')
        return digits

    def validate_message(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError('Enter a message.')
        return trimmed


class BookingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingImage
        fields = ['id', 'image', 'uploaded_at']
        read_only_fields = fields


class BookingCreateSerializer(serializers.ModelSerializer):
    """POST backing for customer_bookings (views.py). Deliberately has no
    `customer`/`technician`/`status`/`estimated_min_price`/
    `estimated_max_price` fields — create() below sets every one of those
    itself (customer from the authenticated request, technician=None,
    status=PENDING, the estimate copied from the validated `service`), so
    nothing in the request body can influence any of them regardless of
    what a client sends. Images aren't handled here at all — see
    views.py's customer_bookings, which reads them from request.FILES
    directly since they arrive as repeated multipart entries, not JSON.
    """

    # SlugRelatedField, not a plain CharField — DRF itself rejects an
    # unknown or inactive slug with a normal 400 before validate() even
    # runs, which is exactly "the frontend must not be able to book a
    # nonexistent service."
    service = serializers.SlugRelatedField(slug_field='slug', queryset=Service.objects.filter(is_active=True))

    class Meta:
        model = Booking
        fields = [
            'id',
            'service',
            'booking_date',
            'time_slot',
            'address_line',
            'city',
            'state',
            'pincode',
            'latitude',
            'longitude',
            'complaint',
        ]
        read_only_fields = ['id']

    def validate_booking_date(self, value):
        if value < date.today():
            raise serializers.ValidationError('Choose a booking date that is today or later.')
        return value

    def validate_address_line(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError('Enter your service address.')
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

    def validate_pincode(self, value):
        if not PINCODE_RE.match(value.strip()):
            raise serializers.ValidationError('Enter a valid 6-digit PIN code.')
        return value.strip()

    def validate_complaint(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError('Describe the issue you’re experiencing.')
        return trimmed

    def create(self, validated_data):
        service = validated_data['service']
        return Booking.objects.create(
            customer=self.context['customer'],
            status=Booking.STATUS_PENDING,
            estimated_min_price=service.estimated_price_from,
            estimated_max_price=service.estimated_price_to,
            **validated_data,
        )


class BookingListSerializer(serializers.ModelSerializer):
    """GET (list) backing for customer_bookings — safe, summary fields only.
    booking_ref/service_name/service_slug are read straight through rather
    than duplicated onto Booking itself (see that model's own docstring)."""

    booking_ref = serializers.ReadOnlyField()
    service_slug = serializers.CharField(source='service.slug', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    time_slot_label = serializers.CharField(source='get_time_slot_display', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_ref',
            'service_slug',
            'service_name',
            'booking_date',
            'time_slot',
            'time_slot_label',
            'address_line',
            'city',
            'state',
            'pincode',
            'estimated_min_price',
            'estimated_max_price',
            'status',
            'created_at',
        ]
        read_only_fields = fields


class BookingDetailSerializer(BookingListSerializer):
    """GET (detail) backing for booking_detail — everything the list view
    has, plus location/complaint/images/technician. technician_name/
    technician_phone are None until an admin assigns one (see Booking.
    technician's own docstring) — the frontend shows "Technician will be
    assigned soon" for exactly that None case."""

    images = BookingImageSerializer(many=True, read_only=True)
    technician_name = serializers.SerializerMethodField()
    technician_phone = serializers.SerializerMethodField()

    class Meta(BookingListSerializer.Meta):
        fields = BookingListSerializer.Meta.fields + [
            'latitude',
            'longitude',
            'complaint',
            'images',
            'technician_name',
            'technician_phone',
            'updated_at',
        ]
        read_only_fields = fields

    def get_technician_name(self, obj):
        return obj.technician.name if obj.technician else None

    def get_technician_phone(self, obj):
        return obj.technician.mobile_number if obj.technician else None


class BookingTrackingEventSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = BookingTrackingEvent
        fields = ['status', 'status_label', 'note', 'created_at']
        read_only_fields = fields


class BookingTrackingSerializer(serializers.ModelSerializer):
    """GET backing for booking_tracking (views.py). Flat, matching this
    file's existing BookingListSerializer/BookingDetailSerializer shape
    rather than a nested {booking, technician, location} structure — one
    consistent response shape across every booking-related endpoint.

    technician_name/technician_phone reuse BookingDetailSerializer's exact
    None-until-assigned pattern. technician_latitude/longitude/
    location_updated_at are the technician's current position (see
    Booking's own docstring on why this is separate from the service
    address's latitude/longitude) — all three stay null until something
    actually sets them (Django Admin today; a technician-facing API later),
    never fabricated.
    """

    booking_ref = serializers.ReadOnlyField()
    service_name = serializers.CharField(source='service.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    time_slot_label = serializers.CharField(source='get_time_slot_display', read_only=True)
    technician_name = serializers.SerializerMethodField()
    technician_phone = serializers.SerializerMethodField()
    tracking_history = BookingTrackingEventSerializer(source='tracking_events', many=True, read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_ref',
            'service_name',
            'booking_date',
            'time_slot',
            'time_slot_label',
            'status',
            'status_label',
            'address_line',
            'city',
            'state',
            'pincode',
            'latitude',
            'longitude',
            'estimated_min_price',
            'estimated_max_price',
            'technician_name',
            'technician_phone',
            'technician_latitude',
            'technician_longitude',
            'location_updated_at',
            'tracking_history',
        ]
        read_only_fields = fields

    def get_technician_name(self, obj):
        return obj.technician.name if obj.technician else None

    def get_technician_phone(self, obj):
        return obj.technician.mobile_number if obj.technician else None


class CustomerNotificationSerializer(serializers.ModelSerializer):
    """GET backing for customer_notifications / PATCH backing for
    customer_notification_mark_read (views.py) — read-only except for
    is_read, same as TechnicianNotificationSerializer: every row is created
    by Booking.save() alone (see CustomerNotification's own docstring),
    never hand-authored through this API. booking_id/booking_ref are None
    for the (currently theoretical — see CustomerNotification's own
    docstring) case of a notification with no booking behind it, rather
    than erroring."""

    type_label = serializers.CharField(source='get_type_display', read_only=True)
    booking_id = serializers.IntegerField(read_only=True)
    booking_ref = serializers.SerializerMethodField()

    class Meta:
        model = CustomerNotification
        fields = ['id', 'type', 'type_label', 'title', 'message', 'booking_id', 'booking_ref', 'is_read', 'created_at']
        read_only_fields = fields

    def get_booking_ref(self, obj):
        return obj.booking.booking_ref if obj.booking_id else None


# --- Public services (bookings/views.py's service_list/service_detail) ---


class ServiceFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceFeature
        fields = ['id', 'title']
        read_only_fields = fields


class ServiceListSerializer(serializers.ModelSerializer):
    """GET backing for service_list — card-sized fields only, matching what
    the Services page needs to render one card per service. `id` mirrors
    the model's own primary key (`slug`) under an `id` key too, purely so
    API consumers that expect a plain `id` field (per this project's own
    API brief) don't need to know the pk happens to be the slug string."""

    id = serializers.ReadOnlyField(source='pk')

    class Meta:
        model = Service
        fields = ['id', 'slug', 'name', 'short_description', 'image', 'estimated_price_from', 'estimated_price_to']
        read_only_fields = fields


class ServiceDetailSerializer(ServiceListSerializer):
    """GET backing for service_detail — everything the list view has, plus
    the full description and the "What's Included" feature list."""

    features = ServiceFeatureSerializer(many=True, read_only=True)

    class Meta(ServiceListSerializer.Meta):
        fields = ServiceListSerializer.Meta.fields + ['full_description', 'features']
        read_only_fields = fields


# --- Technician jobs (views.py's technician_jobs) ---


class TechnicianJobSerializer(serializers.ModelSerializer):
    """GET backing for technician_jobs — a technician's own view of their
    assigned bookings. Deliberately a separate serializer from
    BookingListSerializer/BookingDetailSerializer (customer-facing, which
    never expose *another* person's identity) — here the customer's own
    name/address is exactly what the technician legitimately needs to know
    to actually do the job, not a privacy leak. No technician-identifying
    or payment fields are exposed either way; `complaint` is included since
    it's the one thing that tells the technician what's actually wrong.
    """

    booking_ref = serializers.ReadOnlyField()
    service_name = serializers.CharField(source='service.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    time_slot_label = serializers.CharField(source='get_time_slot_display', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_ref',
            'service_name',
            'customer_name',
            'address_line',
            'city',
            'state',
            'pincode',
            'booking_date',
            'time_slot',
            'time_slot_label',
            'status',
            'status_label',
            'estimated_min_price',
            'estimated_max_price',
            'complaint',
        ]
        read_only_fields = fields


class TechnicianJobDetailSerializer(TechnicianJobSerializer):
    """GET backing for technician_job_detail (views.py) — everything
    TechnicianJobSerializer's card view has, plus what "View Details" needs
    beyond it: the customer's phone number (so the technician can actually
    call ahead — the same "legitimately needs it, not a privacy leak"
    reasoning as customer_name/address_line on the parent serializer), any
    photos the customer attached to the complaint, the same status-history
    shape the customer's own tracking page already shows
    (BookingTrackingEventSerializer, reused as-is rather than a second
    "history event" shape for this app), and this job's own commission (see
    Booking's own docstring — both null/False until an admin sets them, GET
    -only here, same as every other admin-controlled field on this
    serializer's parent)."""

    customer_phone = serializers.CharField(source='customer.mobile_number', read_only=True)
    images = BookingImageSerializer(many=True, read_only=True)
    tracking_history = BookingTrackingEventSerializer(source='tracking_events', many=True, read_only=True)

    class Meta(TechnicianJobSerializer.Meta):
        fields = TechnicianJobSerializer.Meta.fields + [
            'customer_phone',
            'images',
            'tracking_history',
            'commission_amount',
            'commission_paid',
            'updated_at',
        ]
        read_only_fields = fields


class TechnicianJobStatusUpdateSerializer(serializers.Serializer):
    """PATCH backing for technician_job_update_status (views.py) — the one
    thing a technician can change on their own assigned booking: its
    status, and only by a single forward step along Booking.
    ACTIVE_STATUS_ORDER from wherever it currently sits (never backward,
    never a skip, and never into/out of 'cancelled' — that's still an
    admin/customer-only outcome, not a technician one).

    self.context['booking'] is always the technician's own booking —
    resolved by views.py's _technician_job_for the same "never trust a
    client-supplied id alone" way every other detail view in this project
    already does, never from anything in this request body.
    """

    status = serializers.ChoiceField(choices=Booking.STATUS_CHOICES)

    def validate_status(self, value):
        booking = self.context['booking']
        try:
            current_index = Booking.ACTIVE_STATUS_ORDER.index(booking.status)
        except ValueError:
            # Not in the active order at all — i.e. already cancelled.
            raise serializers.ValidationError('This job’s status can no longer be updated.')

        if current_index == len(Booking.ACTIVE_STATUS_ORDER) - 1:
            raise serializers.ValidationError('This job is already completed.')

        next_status = Booking.ACTIVE_STATUS_ORDER[current_index + 1]
        if value != next_status:
            raise serializers.ValidationError(
                f'Status must be updated one step at a time — expected "{next_status}".'
            )
        return value


class TechnicianNotificationSerializer(serializers.ModelSerializer):
    """GET backing for technician_notifications (views.py) — read-only,
    same as BookingTrackingEventSerializer above: every row is created by
    Booking.save() alone (see TechnicianNotification's own docstring),
    never hand-authored through this API."""

    type_label = serializers.CharField(source='get_type_display', read_only=True)
    booking_ref = serializers.CharField(source='booking.booking_ref', read_only=True)

    class Meta:
        model = TechnicianNotification
        fields = ['id', 'type', 'type_label', 'message', 'booking_ref', 'is_read', 'created_at']
        read_only_fields = fields
