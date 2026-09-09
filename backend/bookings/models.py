from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from accounts.models import Customer, TechnicianProfile


class Service(models.Model):
    """A bookable service category — AC/Refrigerator/Washing Machine/
    Microwave today, and whatever else an admin adds from here on. This is
    now the single source of truth for everything the public Services page
    and Service Detail page render (name, images, descriptions, pricing,
    features) — the frontend's data/services.ts static list is no longer
    where that content is authored; adding an active row here is enough for
    a service to appear on the site with no frontend code change.

    `slug` doubles as the primary key (unchanged from this model's original
    shape — see the 0002/0003 migrations) so every historical `Booking.
    service_id` value keeps pointing at the same row unmodified by this
    change. Because of that, the slug can't safely be edited once a service
    exists (changing a CharField/SlugField primary key on save() re-inserts
    a new row rather than renaming the old one in place) — ServiceAdmin
    below makes it read-only after creation instead, and prepopulates it
    from `name` (editable) on the add form only.

    `is_active` (not deletion) is how a service gets retired — `Booking.
    service` is PROTECT, so a service referenced by any historical booking
    can never be deleted out from under it regardless.
    """

    slug = models.SlugField(primary_key=True, help_text='Used in the service URL. Cannot be changed once created.')
    name = models.CharField(max_length=100)
    short_description = models.CharField(
        max_length=300,
        blank=True,
        default='',
        help_text='One sentence shown on the service card and in page previews.',
    )
    full_description = models.TextField(
        blank=True, default='', help_text='Full description shown on the service detail page.'
    )
    image = models.ImageField(upload_to='services/', blank=True, help_text='Shown on the service card and detail page.')
    estimated_price_from = models.PositiveIntegerField(
        help_text='Estimated cost range shown to the customer — lower bound. Not a guaranteed final price.'
    )
    estimated_price_to = models.PositiveIntegerField(
        help_text='Estimated cost range shown to the customer — upper bound. Not a guaranteed final price.'
    )
    is_active = models.BooleanField(
        default=True, help_text='Only active services are shown on the public site.'
    )
    display_order = models.PositiveIntegerField(
        default=0, help_text='Lower numbers show first on the Services page.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = 'service'
        verbose_name_plural = 'services'

    def __str__(self):
        return self.name


class ServiceFeature(models.Model):
    """One "What's Included" bullet point on a Service (e.g. "Complete
    Inspection", "Cleaning", "Performance Testing") — a separate table
    rather than a fixed-size set of fields on Service itself, since
    different services legitimately need different numbers of these.
    Managed inline on ServiceAdmin, never registered/edited on its own."""

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='features')
    title = models.CharField(max_length=150)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']
        verbose_name = 'service feature'
        verbose_name_plural = 'service features'

    def __str__(self):
        return self.title


class Booking(models.Model):
    """A customer's service booking — one common model for every service
    category (AC/Refrigerator/Washing Machine/Microwave alike), never one
    model per service: `service` is what distinguishes them.

    address_line/city/state/pincode/latitude/longitude are a *copy* of
    whatever the customer had on file (or typed fresh) at booking time, not
    a FK to accounts.Address — a booking must keep showing where service was
    actually requested even if the customer's saved address changes later,
    and a customer may book at a different address than their saved one.

    estimated_min_price/estimated_max_price are likewise a snapshot of
    Service.min_price/max_price taken at creation (see serializers.py's
    BookingCreateSerializer.create) — so a later admin price change on
    Service never silently rewrites what a customer was already quoted.

    technician starts NULL and status starts PENDING for every booking,
    always — see serializers.py's own docstring for why neither is ever
    accepted from the client. SET_NULL (not CASCADE) on technician: a
    deactivated/removed technician must not take their historical bookings
    down with them.

    technician_latitude/technician_longitude/location_updated_at are the
    technician's *current* position during an active job — distinct from
    latitude/longitude above, which is where service was requested (fixed
    once the booking is made). Nullable: no technician-facing app/API
    exists yet to actually push these (see save() below and this app's own
    architecture notes) — Django Admin is the only place they're set today,
    which is enough to prove the tracking page end-to-end.

    commission_amount/commission_paid are how much this technician earns for
    this specific job and whether that's been paid out — both admin-set
    (Django Admin is the only place a "final" price is ever decided at all;
    see estimated_min_price/estimated_max_price above), never derived from
    estimated_min_price/estimated_max_price automatically. Null
    commission_amount means "no commission set yet", not zero — the
    technician dashboard's Earnings page (and its own totals) only ever
    counts jobs with a commission actually set, same reasoning
    BookingTrackingEvent-driven history only logs what actually happened.
    """

    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_ASSIGNED = 'assigned'
    STATUS_TECHNICIAN_ON_THE_WAY = 'technician_on_the_way'
    STATUS_ARRIVED = 'arrived'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_ASSIGNED, 'Assigned'),
        (STATUS_TECHNICIAN_ON_THE_WAY, 'Technician On The Way'),
        (STATUS_ARRIVED, 'Arrived'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]
    # The normal (non-cancelled) progression, in order — used both by
    # save() below (to tell "moved forward" apart from "was cancelled") and
    # by anything that needs to render this as a linear timeline.
    ACTIVE_STATUS_ORDER = [
        STATUS_PENDING,
        STATUS_CONFIRMED,
        STATUS_ASSIGNED,
        STATUS_TECHNICIAN_ON_THE_WAY,
        STATUS_ARRIVED,
        STATUS_IN_PROGRESS,
        STATUS_COMPLETED,
    ]

    # Fixed 2-hour windows spanning the business's actual service hours
    # (9 AM-7 PM) — a technician is dispatched sometime within the chosen
    # window, not at an exact minute, so this is a small closed choice set
    # (like STATUS_CHOICES above) rather than a free-form TimeField. The
    # stored value is the window's start time in 24-hour HH:MM (sorts
    # correctly as a plain string, and doubles as an unambiguous key even
    # once formatted for display); the label is what's actually shown.
    TIME_SLOT_09_11 = '09:00'
    TIME_SLOT_11_13 = '11:00'
    TIME_SLOT_13_15 = '13:00'
    TIME_SLOT_15_17 = '15:00'
    TIME_SLOT_17_19 = '17:00'
    TIME_SLOT_CHOICES = [
        (TIME_SLOT_09_11, '9:00 AM - 11:00 AM'),
        (TIME_SLOT_11_13, '11:00 AM - 1:00 PM'),
        (TIME_SLOT_13_15, '1:00 PM - 3:00 PM'),
        (TIME_SLOT_15_17, '3:00 PM - 5:00 PM'),
        (TIME_SLOT_17_19, '5:00 PM - 7:00 PM'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bookings')
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name='bookings')
    technician = models.ForeignKey(
        TechnicianProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings'
    )
    booking_date = models.DateField()
    time_slot = models.CharField(
        max_length=5,
        choices=TIME_SLOT_CHOICES,
        help_text='The 2-hour arrival window the customer picked at booking time.',
    )
    address_line = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    complaint = models.TextField()
    estimated_min_price = models.PositiveIntegerField()
    estimated_max_price = models.PositiveIntegerField()
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    technician_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    technician_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_updated_at = models.DateTimeField(null=True, blank=True)
    commission_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="The technician's commission for this job. Blank until an admin sets one.",
    )
    commission_paid = models.BooleanField(
        default=False, help_text='Whether commission_amount has actually been paid out to the technician.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'booking'
        verbose_name_plural = 'bookings'

    def __str__(self):
        return f'{self.booking_ref} — {self.service.name} for {self.customer.name}'

    @property
    def booking_ref(self):
        # Always derivable from pk — not a stored column, nothing to keep
        # in sync or migrate if the format ever changes.
        return f'UC{10000 + self.pk}'

    def clean(self):
        """Refuses a technician assignment that would double-book them —
        the same technician already on a different (non-cancelled) booking
        for the same booking_date + time_slot. Model-level, not just
        BookingAdmin's own form: Django's ModelForm._post_clean() calls
        instance.full_clean() on every save regardless of whether a custom
        form class is defined, so this is exercised for free by Django
        Admin's own default change form (the only place a technician is
        ever assigned today — see this model's own docstring) without
        needing a second, form-specific copy of the same check. A future
        assignment path (e.g. a technician self-accepting a job) would only
        need to also call full_clean() to get this guarantee for free too.

        Deliberately NOT enforced by save() itself (unlike the tracking/
        notification bookkeeping there) — plain `.save()` never calls
        full_clean() in Django, and a lot of legitimate code (status
        updates, the notification-triggering saves elsewhere in this file)
        re-saves an already-assigned booking without touching `technician`
        at all; running this same query on every one of those saves would
        be both wasteful and pointless, since it's specifically an
        assignment-conflict check.
        """
        super().clean()
        if self.technician_id is None:
            return

        conflict = Booking.objects.filter(
            technician_id=self.technician_id, booking_date=self.booking_date, time_slot=self.time_slot
        ).exclude(status=self.STATUS_CANCELLED)
        if self.pk:
            conflict = conflict.exclude(pk=self.pk)

        existing = conflict.select_related('customer', 'service').first()
        if existing is not None:
            raise ValidationError({
                'technician': (
                    f'{self.technician.name} is already assigned to {existing.booking_ref} '
                    f'({existing.service.name} for {existing.customer.name}) in the '
                    f'{self.get_time_slot_display()} slot on {self.booking_date}.'
                )
            })

    def save(self, *args, **kwargs):
        """Five pieces of "keep the tracking data honest" bookkeeping that
        belong on the model itself, not duplicated in every place that might
        write to a Booking (Django Admin today; the technician-facing jobs
        API too — see bookings/views.py's technician_job_update_status):

        1. Stamps location_updated_at the moment technician_latitude/
           longitude actually change, so nothing writing to this model needs
           to remember to also set the timestamp itself.
        2. Auto-advances status to ASSIGNED the instant a technician goes
           from unset to set while the booking is still pending/confirmed —
           assigning a technician *is* what "assigned" means.
        3. Logs a BookingTrackingEvent whenever status changes (including on
           creation, and including the auto-advance above) — the one place
           "record tracking history" happens, so it can never be forgotten
           by whatever code changed the status.
        4. Creates a TechnicianNotification for whoever's assigned, on that
           same status change — the technician dashboard's notification bell
           reads this, never a separate "send a notification" call some
           other code path could skip. Same "can never be forgotten"
           reasoning as #3, and deliberately piggybacks on the exact same
           status_changed check rather than a second one.
        5. Creates a TechnicianNotification whenever commission_amount or
           commission_paid changes too — an admin setting/editing a job's
           commission, or marking it paid, is exactly as "the technician
           needs to know about this" as a status change, so it's handled
           the same automatic, can't-be-forgotten way.
        6. Creates a CustomerNotification for the booking's own customer at
           each customer-relevant milestone — creation, technician
           assignment (see CustomerNotification's own docstring for why
           that single event also counts as "booking accepted" in this
           app), on-the-way, service started/completed, and cancellation.
           Same "one place, can't be forgotten" reasoning as #3/#4 above,
           and reuses the exact same status_changed/became_assigned checks
           rather than a second set of conditions that could drift out of
           sync with them.
        """
        is_new = self._state.adding
        previous = None if is_new else Booking.objects.filter(pk=self.pk).values(
            'status', 'technician_id', 'technician_latitude', 'technician_longitude',
            'commission_amount', 'commission_paid',
        ).first()

        location_changed = is_new and (self.technician_latitude is not None or self.technician_longitude is not None)
        if previous is not None:
            location_changed = (
                previous['technician_latitude'] != self.technician_latitude
                or previous['technician_longitude'] != self.technician_longitude
            )
        if location_changed:
            self.location_updated_at = timezone.now()

        became_assigned = (
            previous is not None
            and previous['technician_id'] is None
            and self.technician_id is not None
            and self.status in (self.STATUS_PENDING, self.STATUS_CONFIRMED)
        )
        if became_assigned:
            self.status = self.STATUS_ASSIGNED

        status_changed = is_new or previous['status'] != self.status
        commission_amount_changed = previous is not None and previous['commission_amount'] != self.commission_amount
        commission_paid_changed = previous is not None and previous['commission_paid'] != self.commission_paid

        super().save(*args, **kwargs)

        if status_changed:
            BookingTrackingEvent.objects.create(booking=self, status=self.status)
            # No technician yet (e.g. the PENDING row a fresh customer
            # booking starts as) — nobody to notify.
            if self.technician_id is not None:
                if became_assigned:
                    notif_type = TechnicianNotification.TYPE_ASSIGNED
                    message = f'New job assigned: {self.service.name} — {self.booking_ref}.'
                else:
                    notif_type = TechnicianNotification.TYPE_STATUS_UPDATE
                    message = f'{self.booking_ref} is now {self.get_status_display()}.'
                TechnicianNotification.objects.create(
                    technician_id=self.technician_id, booking=self, type=notif_type, message=message
                )

        if self.technician_id is not None:
            if commission_amount_changed and self.commission_amount is not None:
                # previous['commission_amount'] is None the first time an
                # admin ever sets one on this booking — worth a different,
                # more specific message than "updated" for that case.
                verb = 'added' if previous['commission_amount'] is None else 'updated'
                TechnicianNotification.objects.create(
                    technician_id=self.technician_id,
                    booking=self,
                    type=TechnicianNotification.TYPE_COMMISSION_UPDATED,
                    message=f'Commission {verb}: ₹{self.commission_amount} for {self.booking_ref}.',
                )
            elif commission_paid_changed and self.commission_paid and self.commission_amount is not None:
                # Only the "now marked paid" direction gets a notification —
                # un-marking a payout by mistake is an admin correction, not
                # something the technician needs pinged about.
                TechnicianNotification.objects.create(
                    technician_id=self.technician_id,
                    booking=self,
                    type=TechnicianNotification.TYPE_COMMISSION_UPDATED,
                    message=f'₹{self.commission_amount} commission paid out for {self.booking_ref}.',
                )

        # --- Customer notifications (see CustomerNotification's own
        # docstring) — one at creation, one at assignment (which doubles as
        # "accepted" — no separate technician-side accept step exists in
        # this app), and one for each of the remaining customer-relevant
        # status milestones. CONFIRMED/ARRIVED are deliberately not in
        # customer_status_notifications below: neither is one of this
        # feature's defined customer-facing events, so a booking passing
        # through either (e.g. an admin confirming it before assignment)
        # stays silent for the customer, exactly like every other status
        # change this model doesn't otherwise call out.
        if is_new:
            CustomerNotification.objects.create(
                customer_id=self.customer_id,
                booking=self,
                type=CustomerNotification.TYPE_BOOKING_CREATED,
                title='Booking Confirmed',
                message=f'Your {self.service.name} booking has been confirmed.',
            )
        elif became_assigned:
            CustomerNotification.objects.create(
                customer_id=self.customer_id,
                booking=self,
                type=CustomerNotification.TYPE_TECHNICIAN_ASSIGNED,
                title='Technician Assigned',
                message=f'{self.technician.name} has been assigned to your {self.service.name} booking.',
            )
            CustomerNotification.objects.create(
                customer_id=self.customer_id,
                booking=self,
                type=CustomerNotification.TYPE_BOOKING_ACCEPTED,
                title='Booking Accepted',
                message='Your technician has accepted the service request.',
            )
        elif status_changed:
            customer_status_notifications = {
                self.STATUS_TECHNICIAN_ON_THE_WAY: (
                    CustomerNotification.TYPE_TECHNICIAN_ON_THE_WAY,
                    'Technician On The Way',
                    'Your technician is on the way to your location.',
                ),
                self.STATUS_IN_PROGRESS: (
                    CustomerNotification.TYPE_SERVICE_STARTED,
                    'Service Started',
                    f'Your {self.service.name} has started.',
                ),
                self.STATUS_COMPLETED: (
                    CustomerNotification.TYPE_SERVICE_COMPLETED,
                    'Service Completed',
                    'Your service has been completed successfully.',
                ),
                self.STATUS_CANCELLED: (
                    CustomerNotification.TYPE_BOOKING_CANCELLED,
                    'Booking Cancelled',
                    'Your service booking has been cancelled.',
                ),
            }.get(self.status)
            if customer_status_notifications is not None:
                notif_type, title, message = customer_status_notifications
                CustomerNotification.objects.create(
                    customer_id=self.customer_id, booking=self, type=notif_type, title=title, message=message
                )


class TechnicianCommission(Booking):
    """Admin-only proxy of Booking — same rows, same table, no migration
    touching the database (Django still records a migration for a proxy
    model, but it's state-only; see 0009_techniciancommission.py). Exists
    purely to give commission management (admin.py's
    TechnicianCommissionAdmin) its own section in Django Admin's sidebar,
    separate from the full Booking change form — commission_amount/
    commission_paid still live on Booking itself (see that model's own
    docstring on them, and its save() override, which fires the same
    commission-change TechnicianNotification regardless of which admin
    section was used to change them).
    """

    class Meta:
        proxy = True
        verbose_name = 'technician commission'
        verbose_name_plural = 'technician commissions'


class BookingTrackingEvent(models.Model):
    """One row per status change on a Booking — created automatically by
    Booking.save() above, never constructed directly by a view/admin form.
    This is the "10:00 AM Booking Confirmed / 10:30 AM Technician Assigned"
    history the tracking page shows; latitude/longitude here (both
    optional) are a snapshot of wherever the technician was *at that
    milestone*, not a live feed — the technician's continuously-updating
    current position lives on Booking.technician_latitude/longitude
    instead, so this table doesn't grow one row per GPS ping."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='tracking_events')
    status = models.CharField(max_length=25, choices=Booking.STATUS_CHOICES)
    note = models.CharField(max_length=255, blank=True, default='')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'booking tracking event'
        verbose_name_plural = 'booking tracking events'

    def __str__(self):
        return f'{self.booking.booking_ref}: {self.get_status_display()}'


class TechnicianNotification(models.Model):
    """One row per thing a technician should be told about on their own
    booking — created automatically by Booking.save() above (same trigger,
    same "can't be forgotten" reasoning as BookingTrackingEvent), never
    constructed directly by a view. Backs the technician dashboard's
    notification bell (see bookings/views.py's technician_notifications): a
    new job landing on them (TYPE_ASSIGNED), every status change after that
    (TYPE_STATUS_UPDATE), and an admin setting/updating/paying out that
    job's commission (TYPE_COMMISSION_UPDATED) — whichever code changed it,
    Django Admin or the technician's own status-update endpoint.

    `message` is plain, pre-rendered text (not reconstructed from `type` +
    `booking` on every read) — simpler for the API/frontend, and it means a
    notification still reads sensibly even if the booking it references is
    later deleted (CASCADE aside, nothing here depends on the booking still
    existing to make sense).
    """

    TYPE_ASSIGNED = 'assigned'
    TYPE_STATUS_UPDATE = 'status_update'
    TYPE_COMMISSION_UPDATED = 'commission_updated'
    TYPE_CHOICES = [
        (TYPE_ASSIGNED, 'Job assigned'),
        (TYPE_STATUS_UPDATE, 'Status update'),
        (TYPE_COMMISSION_UPDATED, 'Commission update'),
    ]

    technician = models.ForeignKey(TechnicianProfile, on_delete=models.CASCADE, related_name='notifications')
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='technician_notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'technician notification'
        verbose_name_plural = 'technician notifications'

    def __str__(self):
        return f'{self.technician.name}: {self.message}'


class CustomerNotification(models.Model):
    """One row per thing a customer should be told about their own booking's
    service lifecycle — created automatically by Booking.save() above (same
    trigger, same "can't be forgotten" reasoning as TechnicianNotification),
    never constructed directly by a view or by the frontend. Backs the
    customer navbar's notification bell (see bookings/views.py's
    customer_notifications): a booking being created (TYPE_BOOKING_CREATED),
    a technician being assigned (TYPE_TECHNICIAN_ASSIGNED) — which, in this
    app, is the same moment counted as the technician accepting the job
    (TYPE_BOOKING_ACCEPTED fires alongside it; see Booking.save(), and
    TechnicianJobsPage.tsx's own comment on why "Assigned" and "Accepted"
    aren't distinct states here), the technician heading out
    (TYPE_TECHNICIAN_ON_THE_WAY), the service starting/finishing
    (TYPE_SERVICE_STARTED/TYPE_SERVICE_COMPLETED), and cancellation
    (TYPE_BOOKING_CANCELLED).

    `title`/`message` are plain, pre-rendered text (not reconstructed from
    `type` + `booking` on every read) — same "still reads sensibly even if
    the booking it references is later deleted" reasoning as
    TechnicianNotification.message.

    `booking` is nullable ("associated with... Booking where applicable" per
    this feature's own brief) even though every notification type today is
    booking-triggered — CASCADE, not SET_NULL: a notification with no
    booking behind it at all has nothing left to show, so it goes with the
    booking rather than surviving as a dangling row. Left open for a future
    non-booking customer notification without a migration.
    """

    TYPE_BOOKING_CREATED = 'booking_created'
    TYPE_TECHNICIAN_ASSIGNED = 'technician_assigned'
    TYPE_BOOKING_ACCEPTED = 'booking_accepted'
    TYPE_TECHNICIAN_ON_THE_WAY = 'technician_on_the_way'
    TYPE_SERVICE_STARTED = 'service_started'
    TYPE_SERVICE_COMPLETED = 'service_completed'
    TYPE_BOOKING_CANCELLED = 'booking_cancelled'
    TYPE_CHOICES = [
        (TYPE_BOOKING_CREATED, 'Booking created'),
        (TYPE_TECHNICIAN_ASSIGNED, 'Technician assigned'),
        (TYPE_BOOKING_ACCEPTED, 'Booking accepted'),
        (TYPE_TECHNICIAN_ON_THE_WAY, 'Technician on the way'),
        (TYPE_SERVICE_STARTED, 'Service started'),
        (TYPE_SERVICE_COMPLETED, 'Service completed'),
        (TYPE_BOOKING_CANCELLED, 'Booking cancelled'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='notifications')
    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, null=True, blank=True, related_name='customer_notifications'
    )
    type = models.CharField(max_length=25, choices=TYPE_CHOICES)
    title = models.CharField(max_length=100)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'customer notification'
        verbose_name_plural = 'customer notifications'

    def __str__(self):
        return f'{self.customer.name}: {self.title}'


class BookingImage(models.Model):
    """A photo the customer attached to a Booking's complaint (e.g. the AC
    outdoor unit, visible fridge damage) — a separate table rather than a
    single field on Booking because a booking may have several (up to the
    limit enforced in bookings/views.py)."""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='bookings/%Y/%m/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at']

    def __str__(self):
        return f'Image for {self.booking.booking_ref}'


class ContactSubmission(models.Model):
    """A message submitted through the public Contact Us page.

    Deliberately just a log of what the visitor typed — see
    ContactSubmissionAdmin for why it's read-only in the admin once created.
    `subject` is optional: the current frontend contact form has no subject
    field, but the column exists so one can be added there later without a
    migration.
    """

    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    subject = models.CharField(max_length=200, blank=True, default='')
    message = models.TextField()
    created_at = models.DateTimeField('submitted at', auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['-created_at'])]
        verbose_name = 'contact submission'
        verbose_name_plural = 'contact submissions'

    def __str__(self):
        return f'{self.name} <{self.email}>'
