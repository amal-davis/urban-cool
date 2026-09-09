from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from .models import (
    Booking,
    BookingImage,
    BookingTrackingEvent,
    ContactSubmission,
    CustomerNotification,
    Service,
    ServiceFeature,
    TechnicianCommission,
    TechnicianNotification,
)


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(ModelAdmin):
    list_display = ('name', 'email', 'phone', 'subject', 'created_at')
    search_fields = ('name', 'email', 'phone')
    list_filter = ('created_at',)
    readonly_fields = ('name', 'email', 'phone', 'subject', 'message', 'created_at')
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        # Submissions only ever come from the public Contact Us form —
        # there's no legitimate reason to fabricate one from the admin.
        return False

    def has_change_permission(self, request, obj=None):
        # Every field is already readonly above; this additionally drops the
        # Save button so the record reads as what it is — an immutable log
        # of what the visitor actually typed, not something ops can edit.
        return False


class ServiceFeatureInline(TabularInline):
    """"What's Included" bullet points, managed directly on the service's
    own edit page — there's no legitimate reason to browse ServiceFeature
    as its own top-level admin list, so it's never separately registered."""

    model = ServiceFeature
    extra = 1
    fields = ('title', 'display_order')
    ordering = ('display_order', 'id')


@admin.register(Service)
class ServiceAdmin(ModelAdmin):
    """`slug` is editable only while creating a new service — see Service's
    own docstring for why changing it afterward is unsafe. `prepopulated_
    fields` fills it in from `name` on the add form (still hand-editable
    before saving); `get_readonly_fields` below then locks it for good the
    moment the service actually exists."""

    list_display = ('name', 'is_active', 'estimated_price_from', 'estimated_price_to', 'display_order', 'updated_at')
    list_display_links = ('name',)
    list_editable = ('is_active', 'display_order')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug')
    ordering = ('display_order', 'name')
    inlines = [ServiceFeatureInline]
    fieldsets = (
        (None, {'fields': ('name', 'slug', 'image', 'is_active', 'display_order')}),
        ('Description', {'fields': ('short_description', 'full_description')}),
        ('Estimated pricing', {
            'fields': ('estimated_price_from', 'estimated_price_to'),
            'description': 'Shown to customers as an estimated range, never a guaranteed final price.',
        }),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )

    def get_readonly_fields(self, request, obj=None):
        readonly = ['created_at', 'updated_at']
        if obj is not None:
            # Editing an existing service — the slug is already load-bearing
            # (see Service's own docstring) so it's locked, not just
            # pre-filled.
            readonly.append('slug')
        return readonly

    def get_prepopulated_fields(self, request, obj=None):
        # Add-form only: `slug` is a readonly_field (not a real form field)
        # once `obj` exists, and prepopulated_fields must not reference a
        # field the form doesn't have.
        return {} if obj is not None else {'slug': ('name',)}


class BookingImageInline(TabularInline):
    model = BookingImage
    extra = 0
    readonly_fields = ('image', 'uploaded_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        # Images only ever arrive with the original booking submission —
        # there's no legitimate reason to attach one from the admin later.
        return False


class BookingTrackingEventInline(TabularInline):
    """Read-only — every row here is created automatically by Booking.save()
    (see its own docstring) whenever status changes; there's no legitimate
    reason to hand-author a history entry from the admin."""

    model = BookingTrackingEvent
    extra = 0
    readonly_fields = ('status', 'note', 'latitude', 'longitude', 'created_at')
    can_delete = False
    ordering = ('created_at',)

    def has_add_permission(self, request, obj=None):
        return False


class TechnicianNotificationInline(TabularInline):
    """Read-only — every row here is created automatically by Booking.save()
    (see TechnicianNotification's own docstring) whenever a job's status
    changes; there's no legitimate reason to hand-author one from the
    admin."""

    model = TechnicianNotification
    extra = 0
    fields = ('technician', 'type', 'message', 'is_read', 'created_at')
    readonly_fields = fields
    can_delete = False
    ordering = ('-created_at',)

    def has_add_permission(self, request, obj=None):
        return False


class CustomerNotificationInline(TabularInline):
    """Read-only — every row here is created automatically by Booking.save()
    (see CustomerNotification's own docstring) at each customer-relevant
    milestone; there's no legitimate reason to hand-author one from the
    admin."""

    model = CustomerNotification
    extra = 0
    fields = ('type', 'title', 'message', 'is_read', 'created_at')
    readonly_fields = fields
    can_delete = False
    ordering = ('-created_at',)

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Booking)
class BookingAdmin(ModelAdmin):
    """Customer-submitted fields (customer/service/address/complaint) stay
    read-only, matching ContactSubmissionAdmin's "immutable log of what was
    submitted" pattern. status/technician/technician_latitude/
    technician_longitude are the exception, left editable — assigning a
    technician, progressing status, and updating their current location
    during a job is explicitly the future admin/technician workflow this
    model was designed for (see Booking's own docstring). No Technician
    Dashboard exists yet to do this from the technician's own side (see
    this app's architecture notes) — Django Admin is the stand-in for that
    until one exists, not a second tracking system of its own.

    commission_amount/commission_paid are deliberately EXCLUDED from this
    form (see `exclude` below), even though they live on this same Booking
    model — commission management has its own dedicated section
    (TechnicianCommissionAdmin below, registered against the
    TechnicianCommission proxy) rather than being two more fields buried in
    this already-long change form. Both admin sections write the exact
    same underlying rows; only where you go in Django Admin to do it
    differs.
    """

    list_display = (
        'booking_ref',
        'customer',
        'service',
        'booking_date',
        'time_slot',
        'status',
        'technician',
        'created_at',
    )
    list_filter = ('status', 'service', 'booking_date', 'time_slot')
    search_fields = ('id', 'customer__name', 'customer__mobile_number', 'service__name')
    autocomplete_fields = ['technician']
    readonly_fields = (
        'customer',
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
        'estimated_min_price',
        'estimated_max_price',
        'location_updated_at',
        'created_at',
        'updated_at',
    )
    exclude = ('commission_amount', 'commission_paid')
    inlines = [BookingImageInline, BookingTrackingEventInline, TechnicianNotificationInline, CustomerNotificationInline]
    ordering = ('-created_at',)

    @admin.display(description='Booking ID')
    def booking_ref(self, obj):
        return obj.booking_ref

    def has_add_permission(self, request):
        # A booking only ever comes from the customer booking flow —
        # fabricating one here would have no real customer submission
        # behind it.
        return False


@admin.register(TechnicianCommission)
class TechnicianCommissionAdmin(ModelAdmin):
    """A separate, focused admin section for setting a job's commission and
    marking it paid out — the same underlying Booking rows BookingAdmin
    manages (TechnicianCommission is a proxy model, not a second table; see
    its own docstring), just without every other Booking field competing
    for attention. Booking.save()'s own commission-change
    TechnicianNotification logic fires exactly the same way regardless of
    which admin section made the change, since underneath it's still the
    same model and the same save().

    Only bookings with a technician actually assigned show up here
    (get_queryset below) — an unassigned booking has nobody to pay a
    commission to yet, so it would just be noise in this list.
    """

    list_display = (
        'booking_ref',
        'customer',
        'service',
        'technician',
        'status',
        'commission_amount',
        'commission_paid',
        'booking_date',
    )
    list_display_links = ('booking_ref',)
    list_editable = ('commission_amount', 'commission_paid')
    list_filter = ('commission_paid', 'status', 'service')
    search_fields = ('id', 'customer__name', 'technician__name', 'service__name')
    autocomplete_fields = ['technician']
    fields = (
        'customer',
        'service',
        'technician',
        'status',
        'booking_date',
        'time_slot',
        'estimated_min_price',
        'estimated_max_price',
        'commission_amount',
        'commission_paid',
        'created_at',
        'updated_at',
    )
    readonly_fields = (
        'customer',
        'service',
        'technician',
        'status',
        'booking_date',
        'time_slot',
        'estimated_min_price',
        'estimated_max_price',
        'created_at',
        'updated_at',
    )
    ordering = ('-created_at',)

    @admin.display(description='Booking ID')
    def booking_ref(self, obj):
        return obj.booking_ref

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .filter(technician__isnull=False)
            .select_related('customer', 'service', 'technician')
        )

    def has_add_permission(self, request):
        # A "commission" row is really just an existing, technician-
        # assigned booking — never fabricated from this focused view.
        return False

    def has_delete_permission(self, request, obj=None):
        # Deleting here would delete the underlying Booking itself (same
        # table, same row) — never appropriate from a commission-only view.
        return False
