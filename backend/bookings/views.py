from decimal import Decimal

from django.db.models import F, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from accounts.models import Customer, TechnicianProfile

from .models import Booking, BookingImage, BookingTrackingEvent, CustomerNotification, Service, TechnicianNotification
from .serializers import (
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingListSerializer,
    BookingTrackingSerializer,
    ContactSubmissionSerializer,
    CustomerNotificationSerializer,
    ServiceDetailSerializer,
    ServiceListSerializer,
    TechnicianJobDetailSerializer,
    TechnicianJobSerializer,
    TechnicianJobStatusUpdateSerializer,
    TechnicianNotificationSerializer,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    """Simple liveness check the frontend can call to confirm the API is reachable."""
    return Response({'status': 'ok', 'service': 'urban-cool-backend'})


# --- Public services (Services page + Service Detail page) ---
#
# Deliberately public/anonymous, same as health/contact above — browsing
# services (and pricing) doesn't require an account. Only active services
# are ever returned; an inactive one 404s from service_detail exactly like a
# slug that never existed, rather than a distinct "this exists but isn't
# available" response — the public site has no legitimate use for telling
# the two apart.


@api_view(['GET'])
@permission_classes([AllowAny])
def service_list(request):
    services = Service.objects.filter(is_active=True).order_by('display_order', 'name')
    return Response(ServiceListSerializer(services, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def service_detail(request, slug):
    service = Service.objects.filter(slug=slug, is_active=True).prefetch_related('features').first()
    if service is None:
        return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ServiceDetailSerializer(service).data)


class ContactSubmitThrottle(AnonRateThrottle):
    """Public, unauthenticated endpoint — same "cheap endpoint, cap it per
    IP" reasoning as accounts/views.py's OtpSendThrottle. See
    REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] in config/settings.py for the
    actual rate."""

    scope = 'contact_submit'


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ContactSubmitThrottle])
def contact(request):
    """Public Contact Us form submission. Anonymous by design — a visitor
    reaching out about a broken appliance shouldn't need an account first."""
    serializer = ContactSubmissionSerializer(data=request.data)
    if not serializer.is_valid():
        # Same "first error, flat detail string" shape accounts/views.py
        # uses everywhere else, so the frontend has one error contract to
        # handle regardless of which endpoint it called.
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()
    return Response(
        {'detail': "Thanks for reaching out — we'll get back to you soon."},
        status=status.HTTP_201_CREATED,
    )


# --- Customer bookings (authenticated) ---
#
# Mirrors accounts/views.py's own customer_profile/customer_address in
# every respect that matters: identify the customer from request.user
# alone, never a client-supplied id; keep the same "first error, flat
# detail string" response shape; 404 (not 403) for a booking that exists
# but isn't this customer's, so an authenticated customer can never even
# confirm another customer's booking id is real.

MAX_BOOKING_IMAGES = 6
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
ACCEPTED_IMAGE_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp'}


def _customer_for(request):
    """Same lookup accounts/views.py's own _customer_for makes — kept as a
    small local copy rather than importing that app's private (underscore-
    prefixed) helper across an app boundary. Every view below resolves
    "which customer" this same way, never from a client-supplied id."""
    return Customer.objects.filter(user=request.user).select_related('user').first()


def _validate_uploaded_images(images):
    """Returns an error message string, or None if every image is
    acceptable. The authoritative check — ImageUploader.tsx enforces the
    same limits client-side, but that's a UX convenience only, never trusted
    here."""
    if len(images) > MAX_BOOKING_IMAGES:
        return f'You can upload up to {MAX_BOOKING_IMAGES} images.'
    for image in images:
        if image.content_type not in ACCEPTED_IMAGE_CONTENT_TYPES:
            return f'{image.name} isn’t a supported format. Use JPG, PNG, or WEBP.'
        if image.size > MAX_IMAGE_SIZE_BYTES:
            return f'{image.name} is larger than 5 MB.'
    return None


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def customer_bookings(request):
    customer = _customer_for(request)
    if customer is None:
        return Response({'detail': 'No customer profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        bookings = Booking.objects.filter(customer=customer).select_related('service')
        return Response(BookingListSerializer(bookings, many=True).data)

    serializer = BookingCreateSerializer(data=request.data, context={'customer': customer})
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    # Images arrive as repeated `images` entries in the same multipart body
    # (DRF's default parsers already include MultiPartParser) — validated
    # here rather than as a serializer field, since a plain
    # ListField(child=ImageField()) doesn't cleanly map onto "several files
    # under one repeated form key."
    images = request.FILES.getlist('images')
    image_error = _validate_uploaded_images(images)
    if image_error:
        return Response({'detail': image_error}, status=status.HTTP_400_BAD_REQUEST)

    booking = serializer.save()
    for image in images:
        BookingImage.objects.create(booking=booking, image=image)

    return Response(BookingDetailSerializer(booking).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def booking_detail(request, pk):
    customer = _customer_for(request)
    if customer is None:
        return Response({'detail': 'No customer profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    booking = Booking.objects.filter(pk=pk, customer=customer).select_related('service', 'technician').first()
    if booking is None:
        return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    return Response(BookingDetailSerializer(booking).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def booking_tracking(request, pk):
    """Polled by the customer's tracking page every ~12s (see
    frontend/src/lib/useBookingTracking.ts) — same ownership check as
    booking_detail above: a booking that exists but isn't this customer's
    404s, never a 403, so its existence can't even be confirmed."""
    customer = _customer_for(request)
    if customer is None:
        return Response({'detail': 'No customer profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    booking = (
        Booking.objects.filter(pk=pk, customer=customer)
        .select_related('service', 'technician')
        .prefetch_related('tracking_events')
        .first()
    )
    if booking is None:
        return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

    return Response(BookingTrackingSerializer(booking).data)


# --- Customer notifications (authenticated customer's own) ---
#
# Every row a customer can see here is created automatically by Booking.save()
# (see CustomerNotification's own docstring) the moment their booking hits a
# customer-relevant milestone — there is no "send a notification" call
# anywhere in this app to forget; this is purely read (+ mark-read) access to
# what Booking.save() already logged. Same shape as the technician
# notification endpoints below, deliberately: one GET returning both the
# unread count and the latest results (no separate unread-count-only
# endpoint — this project's existing technician_notifications view already
# established that one combined response is enough), a single-notification
# mark-read (new here — the technician bell has no per-item equivalent
# because it marks everything read the instant the panel opens, but the
# customer bell's own click-to-read-and-navigate behavior needs one), and a
# mark-all-read for the panel's own button.

# The customer bell shows more than the technician's 7 — there's no separate
# "view all notifications" page to send the overflow to (unlike the
# technician bell's "View All Jobs" link), so the panel itself needs to
# comfortably scroll through more history before anything falls off.
CUSTOMER_NOTIFICATION_LIST_LIMIT = 20


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_notifications(request):
    """`unread_count` is counted across ALL of this customer's notifications,
    not just the `results` page below — same reasoning as
    technician_notifications' own docstring."""
    customer = _customer_for(request)
    if customer is None:
        return Response({'detail': 'No customer profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    notifications = CustomerNotification.objects.filter(customer=customer).select_related('booking')[
        :CUSTOMER_NOTIFICATION_LIST_LIMIT
    ]
    unread_count = CustomerNotification.objects.filter(customer=customer, is_read=False).count()

    return Response(
        {
            'unread_count': unread_count,
            'results': CustomerNotificationSerializer(notifications, many=True).data,
        }
    )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def customer_notification_mark_read(request, pk):
    """Called when the customer clicks a single notification — the bell
    marks it read (and, if it has a booking, navigates there) without
    touching any of the customer's other notifications. Same ownership
    check as booking_detail/booking_tracking above: a notification that
    exists but isn't this customer's 404s, never a 403."""
    customer = _customer_for(request)
    if customer is None:
        return Response({'detail': 'No customer profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    notification = CustomerNotification.objects.filter(pk=pk, customer=customer).select_related('booking').first()
    if notification is None:
        return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not notification.is_read:
        notification.is_read = True
        notification.save(update_fields=['is_read'])
    return Response(CustomerNotificationSerializer(notification).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def customer_notifications_mark_all_read(request):
    """Called from the panel's own "Mark all as read" button — clears the
    bell's unread badge in one call, same as technician_notifications_
    mark_read."""
    customer = _customer_for(request)
    if customer is None:
        return Response({'detail': 'No customer profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    CustomerNotification.objects.filter(customer=customer, is_read=False).update(is_read=True)
    return Response({'detail': 'Notifications marked as read.'})


# --- Technician jobs (authenticated technician's own assigned bookings) ---
#
# Django Admin is still the only place a technician gets *assigned* to a
# booking in the first place (per Booking's own docstring) — but from here
# down, a signed-in technician can see their own assigned bookings (list +
# detail) and advance a booking's status themselves, one step at a time
# (technician_job_update_status below), the same shape as customer_bookings'
# own GET, mirrored for the technician side.


def _technician_for(request):
    """The authenticated request's own TechnicianProfile row, or None — same
    shape as _customer_for above (kept as a local copy rather than an
    import from accounts.views, per this project's established convention;
    see _customer_for's own comment)."""
    return TechnicianProfile.objects.filter(user=request.user).select_related('user').first()


def _technician_job_for(request, pk):
    """The authenticated technician's own booking (by pk), or None — same
    "resolve strictly from request.user, never trust the pk alone" shape as
    booking_detail/booking_tracking above. None covers both a pk that
    doesn't exist and one that exists but isn't assigned to this
    technician, deliberately indistinguishable to the caller (both 404,
    never a 403 that would confirm another technician's booking id is
    real) — and, same as _technician_for's own callers, a customer's
    session hitting this also finds no TechnicianProfile row and gets the
    same None."""
    technician = _technician_for(request)
    if technician is None:
        return None
    return Booking.objects.filter(pk=pk, technician=technician).select_related('service', 'customer').first()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def technician_jobs(request):
    technician = _technician_for(request)
    if technician is None:
        return Response({'detail': 'No technician profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    bookings = (
        Booking.objects.filter(technician=technician)
        .select_related('service', 'customer')
        # time_slot sorts correctly as a plain string (see its own
        # docstring — it's the window's 24-hour start time) — a technician
        # looking at their day should see the 9-11 AM job before the
        # 5-7 PM one, not whichever was created first.
        .order_by('booking_date', 'time_slot', '-created_at')
    )
    return Response(TechnicianJobSerializer(bookings, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def technician_job_detail(request, pk):
    """Backs the technician dashboard's "View Details" button — everything
    TechnicianJobDetailSerializer adds on top of the card view (customer
    phone, complaint photos, status-history timeline)."""
    booking = _technician_job_for(request, pk)
    if booking is None:
        return Response({'detail': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(TechnicianJobDetailSerializer(booking).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def technician_job_update_status(request, pk):
    """Advances a job's status one step forward — see
    TechnicianJobStatusUpdateSerializer for exactly what's allowed (a
    single forward step along Booking.ACTIVE_STATUS_ORDER, nothing else).
    Booking.save() itself both auto-logs the BookingTrackingEvent and
    stamps updated_at (see that model's own docstring), so there's nothing
    extra to do here beyond validate + save — the same tracking history the
    customer's tracking page reads picks this up for free."""
    booking = _technician_job_for(request, pk)
    if booking is None:
        return Response({'detail': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = TechnicianJobStatusUpdateSerializer(data=request.data, context={'booking': booking})
    if not serializer.is_valid():
        first_error = next(iter(serializer.errors.values()))[0]
        return Response({'detail': str(first_error)}, status=status.HTTP_400_BAD_REQUEST)

    booking.status = serializer.validated_data['status']
    booking.save()
    return Response(TechnicianJobSerializer(booking).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def technician_performance(request):
    """Backs the technician dashboard's Performance section — computed
    straight from this technician's own Booking rows, never a separate
    stored "performance" table to keep in sync. A plain dict response, not
    a ModelSerializer (nothing here maps onto one model instance) — same
    shape as health() above for the same reason.

    Only what's actually derivable today: total/completed/cancelled job
    counts, a completion rate, and an average response time (how long, on
    average, between a job landing on this technician (the 'assigned'
    tracking event) and them actually setting off (the
    'technician_on_the_way' event) — see technician_job_update_status,
    which is what creates that second event). There is no rating/review
    feature anywhere in this app yet, so "Average Rating"/"Customer
    Satisfaction" are deliberately NOT included here rather than
    fabricated — the frontend's Performance page only shows what this
    endpoint actually returns.
    """
    technician = _technician_for(request)
    if technician is None:
        return Response({'detail': 'No technician profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    bookings = Booking.objects.filter(technician=technician)
    total_jobs = bookings.count()
    completed_jobs = bookings.filter(status=Booking.STATUS_COMPLETED).count()
    cancelled_jobs = bookings.filter(status=Booking.STATUS_CANCELLED).count()
    completion_rate = round(completed_jobs / total_jobs * 100) if total_jobs else 0

    # One dict lookup per booking (assigned-at / on-the-way-at) built from a
    # single query, rather than a query per booking — `events` only ever
    # holds two rows per booking at most (this technician's own 'assigned'
    # and 'technician_on_the_way' tracking events), so this stays small even
    # for a technician with a long job history.
    events = BookingTrackingEvent.objects.filter(
        booking__technician=technician,
        status__in=[Booking.STATUS_ASSIGNED, Booking.STATUS_TECHNICIAN_ON_THE_WAY],
    ).values('booking_id', 'status', 'created_at')

    timestamps_by_booking = {}
    for event in events:
        timestamps_by_booking.setdefault(event['booking_id'], {})[event['status']] = event['created_at']

    response_times_minutes = [
        (times[Booking.STATUS_TECHNICIAN_ON_THE_WAY] - times[Booking.STATUS_ASSIGNED]).total_seconds() / 60
        for times in timestamps_by_booking.values()
        if Booking.STATUS_ASSIGNED in times and Booking.STATUS_TECHNICIAN_ON_THE_WAY in times
    ]
    avg_response_time_minutes = (
        round(sum(response_times_minutes) / len(response_times_minutes)) if response_times_minutes else None
    )

    return Response(
        {
            'total_jobs': total_jobs,
            'completed_jobs': completed_jobs,
            'cancelled_jobs': cancelled_jobs,
            'completion_rate': completion_rate,
            'avg_response_time_minutes': avg_response_time_minutes,
        }
    )


# --- Technician notifications (authenticated technician's own) ---
#
# Every row a technician can see here is created automatically by
# Booking.save() (see that model's own docstring) the moment a job lands on
# them or one of their jobs' status changes — there is no "send a
# notification" call anywhere in this app to forget; this is purely read
# (+ mark-read) access to what Booking.save() already logged.

# The technician dashboard's bell only ever shows the most recent handful —
# see TechnicianHeader's own NotificationBell component, which polls this
# periodically rather than needing a websocket for something this low-
# frequency.
NOTIFICATION_LIST_LIMIT = 7


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def technician_notifications(request):
    """`unread_count` is counted across ALL of this technician's
    notifications, not just the `results` page below — the bell's badge
    should reflect everything unread, even the 8th-oldest one that's since
    scrolled out of the latest-7 list."""
    technician = _technician_for(request)
    if technician is None:
        return Response({'detail': 'No technician profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    notifications = TechnicianNotification.objects.filter(technician=technician).select_related('booking')[
        :NOTIFICATION_LIST_LIMIT
    ]
    unread_count = TechnicianNotification.objects.filter(technician=technician, is_read=False).count()

    return Response(
        {
            'unread_count': unread_count,
            'results': TechnicianNotificationSerializer(notifications, many=True).data,
        }
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def technician_notifications_mark_read(request):
    """Called when the technician opens the notification panel — clears the
    bell's unread badge. Marks every unread notification, not just the ones
    in the latest-7 list the panel actually rendered, so the badge and
    "what's actually unread in the database" never disagree afterward."""
    technician = _technician_for(request)
    if technician is None:
        return Response({'detail': 'No technician profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    TechnicianNotification.objects.filter(technician=technician, is_read=False).update(is_read=True)
    return Response({'detail': 'Notifications marked as read.'})


# --- Technician earnings (authenticated technician's own) ---


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def technician_earnings(request):
    """Backs the technician dashboard's Earnings & Commission section —
    computed straight from this technician's own Booking rows
    (commission_amount/commission_paid, both admin-set — see Booking's own
    docstring), never a separate stored aggregate to keep in sync. Only
    bookings with a commission actually set count toward any total here —
    a job nobody's priced yet contributes nothing, positive or negative,
    same "count what's real" reasoning technician_performance above
    already follows for jobs with no response-time data yet.

    total_service_value approximates each counted job's value as the
    midpoint of its estimated_min_price/estimated_max_price — this app has
    no "actual final price" field at all (see Booking's own docstring), so
    the midpoint of what the customer was quoted is the closest honest
    stand-in for "how much was this job worth," not a real recorded price.
    """
    technician = _technician_for(request)
    if technician is None:
        return Response({'detail': 'No technician profile for this account.'}, status=status.HTTP_404_NOT_FOUND)

    priced = Booking.objects.filter(technician=technician, commission_amount__isnull=False)

    today = timezone.now().date()
    month_priced = priced.filter(booking_date__year=today.year, booking_date__month=today.month)

    def total_commission(queryset):
        return queryset.aggregate(total=Sum('commission_amount'))['total'] or Decimal('0')

    def total_service_value(queryset):
        # Sum of (min + max) across all rows, halved once at the end —
        # equivalent to summing each row's own midpoint, cheaper than
        # computing and summing per-row averages in the database.
        # estimated_min_price/estimated_max_price are plain
        # PositiveIntegerFields, so this SUM is a plain int, not a Decimal,
        # straight out of the database — wrapped in Decimal() before
        # dividing so the /2 below stays exact instead of silently
        # producing a float (which can't mix with the Decimal commission
        # totals below it).
        combined = queryset.aggregate(total=Sum(F('estimated_min_price') + F('estimated_max_price')))['total']
        return (Decimal(combined) / 2) if combined else Decimal('0')

    total_commission_earned = total_commission(priced)
    total_service_value_amount = total_service_value(priced)
    commission_rate = (
        round(total_commission_earned / total_service_value_amount * 100) if total_service_value_amount else 0
    )

    # str(), not a bare Decimal — DRF's Response only coerces Decimal ->
    # string for actual DecimalField-backed serializer output (see
    # rest_framework.utils.encoders.JSONEncoder), never for a plain dict
    # response like this one, which would otherwise silently narrow every
    # money figure here to a float.
    return Response(
        {
            'total_commission_earned': str(total_commission_earned),
            'month_commission_earned': str(total_commission(month_priced)),
            'total_service_value': str(total_service_value_amount),
            'commission_rate': commission_rate,
            'pending_payout': str(total_commission(priced.filter(commission_paid=False))),
            'paid_amount': str(total_commission(priced.filter(commission_paid=True))),
        }
    )
