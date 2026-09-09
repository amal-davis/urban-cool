import io
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone

from accounts.models import Customer, TechnicianProfile

from .models import Booking, BookingImage, BookingTrackingEvent, CustomerNotification, Service, TechnicianNotification


def _make_admin(username='admin-test'):
    """Creates a staff/superuser directly — mirrors accounts/tests.py's own
    helper of the same name (kept as a local copy rather than an import
    across app test modules, consistent with this project's general
    preference for each app owning its own test fixtures)."""
    user = get_user_model().objects.create(username=username, is_staff=True, is_superuser=True)
    user.set_password('x')
    user.save()
    return user


def _register_customer(phone='9876543210', name='Test Customer', email=None):
    """Creates a User + Customer row directly — mirrors accounts/tests.py's
    own helper of the same name (kept as a local copy rather than an
    import across app test modules, consistent with this project's general
    preference for each app owning its own test fixtures)."""
    user = get_user_model().objects.create(username=phone, first_name=name, email=email or f'{phone}@example.com')
    user.set_unusable_password()
    user.save(update_fields=['password'])
    return Customer.objects.create(
        user=user, mobile_number=f'+91{phone}', name=name, email=email or f'{phone}@example.com'
    )


def _register_technician(phone='9111100001', name='Test Technician'):
    """Creates a User + TechnicianProfile row directly — same reasoning as
    _register_customer above."""
    user = get_user_model().objects.create(username=phone, first_name=name, email=f'{phone}@example.com')
    user.set_unusable_password()
    user.save(update_fields=['password'])
    return TechnicianProfile.objects.create(
        user=user,
        name=name,
        mobile_number=f'+91{phone}',
        email=f'{phone}@example.com',
        date_of_birth='1990-01-01',
        address_line='1 Depot Road',
        city='Kochi',
        state='Kerala',
        pincode='682001',
        specialization=TechnicianProfile.SPECIALIZATION_AC,
        experience_years=5,
    )


def _booking_payload(**overrides):
    payload = {
        'service': 'ac',
        'booking_date': (timezone.now().date() + timezone.timedelta(days=2)).isoformat(),
        'time_slot': Booking.TIME_SLOT_09_11,
        'address_line': '12 Palm Grove',
        'city': 'Kochi',
        'state': 'Kerala',
        'pincode': '682001',
        'complaint': 'AC is not cooling properly.',
    }
    payload.update(overrides)
    return payload


def _tiny_jpeg(name='photo.jpg', content_type='image/jpeg', size=None):
    # A minimal valid JPEG (Pillow-parseable) — ImageField's own validation
    # would reject garbage bytes, so this can't just be arbitrary content.
    content = (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00'
        + bytes([1] * 64)
        + b'\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01'
        b'\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n'
        b'\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xd2\xcf \xff\xd9'
    )
    if size is not None:
        content = content.ljust(size, b'\x00')
    return SimpleUploadedFile(name, content, content_type=content_type)


class CustomerBookingTests(TestCase):
    def setUp(self):
        pass

    def test_requires_authentication(self):
        response = self.client.get('/api/customer/bookings/')
        self.assertEqual(response.status_code, 403)
        response = self.client.post('/api/customer/bookings/', _booking_payload())
        self.assertEqual(response.status_code, 403)

    def test_create_booking_happy_path(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        response = self.client.post('/api/customer/bookings/', _booking_payload())
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body['status'], 'pending')
        self.assertEqual(body['service_slug'], 'ac')
        self.assertEqual(body['estimated_min_price'], 499)
        self.assertEqual(body['estimated_max_price'], 999)
        self.assertTrue(body['booking_ref'].startswith('UC'))
        self.assertIsNone(body['technician_name'])
        self.assertEqual(body['time_slot'], Booking.TIME_SLOT_09_11)
        self.assertEqual(body['time_slot_label'], '9:00 AM - 11:00 AM')

        booking = Booking.objects.get(pk=body['id'])
        self.assertEqual(booking.customer, customer)

    def test_client_cannot_set_customer_technician_status_or_price(self):
        customer = _register_customer()
        self.client.force_login(customer.user)
        other_customer = _register_customer('9111111111', name='Someone Else')

        response = self.client.post(
            '/api/customer/bookings/',
            _booking_payload(
                customer_id=other_customer.pk,
                customer=other_customer.pk,
                status='completed',
                estimated_min_price=1,
                estimated_max_price=2,
                technician=999,
            ),
        )
        self.assertEqual(response.status_code, 201)
        booking = Booking.objects.get(pk=response.json()['id'])
        self.assertEqual(booking.customer, customer)  # not other_customer
        self.assertEqual(booking.status, Booking.STATUS_PENDING)
        self.assertEqual(booking.estimated_min_price, 499)  # from Service, not the spoofed 1
        self.assertIsNone(booking.technician)

    def test_rejects_nonexistent_service(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        response = self.client.post('/api/customer/bookings/', _booking_payload(service='does-not-exist'))
        self.assertEqual(response.status_code, 400)

    def test_rejects_inactive_service(self):
        customer = _register_customer()
        self.client.force_login(customer.user)
        Service.objects.filter(slug='ac').update(is_active=False)

        response = self.client.post('/api/customer/bookings/', _booking_payload(service='ac'))
        self.assertEqual(response.status_code, 400)

    def test_rejects_past_booking_date(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        yesterday = (timezone.now().date() - timezone.timedelta(days=1)).isoformat()
        response = self.client.post('/api/customer/bookings/', _booking_payload(booking_date=yesterday))
        self.assertEqual(response.status_code, 400)

    def test_rejects_a_time_slot_outside_the_fixed_set(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        response = self.client.post('/api/customer/bookings/', _booking_payload(time_slot='20:00'))
        self.assertEqual(response.status_code, 400)

    def test_rejects_a_missing_time_slot(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        payload = _booking_payload()
        del payload['time_slot']
        response = self.client.post('/api/customer/bookings/', payload)
        self.assertEqual(response.status_code, 400)

    def test_accepts_every_defined_time_slot(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        for slot, label in Booking.TIME_SLOT_CHOICES:
            response = self.client.post('/api/customer/bookings/', _booking_payload(time_slot=slot))
            self.assertEqual(response.status_code, 201, f'{slot} was rejected: {response.json()}')
            self.assertEqual(response.json()['time_slot_label'], label)

    def test_rejects_invalid_pincode(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        response = self.client.post('/api/customer/bookings/', _booking_payload(pincode='123'))
        self.assertEqual(response.status_code, 400)

    def test_list_only_returns_own_bookings(self):
        customer_a = _register_customer('9876543210', name='Customer A')
        customer_b = _register_customer('9111111111', name='Customer B')

        self.client.force_login(customer_a.user)
        self.client.post('/api/customer/bookings/', _booking_payload())
        self.client.logout()

        self.client.force_login(customer_b.user)
        response = self.client.get('/api/customer/bookings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_cannot_view_another_customers_booking_detail(self):
        customer_a = _register_customer('9876543210', name='Customer A')
        self.client.force_login(customer_a.user)
        create_response = self.client.post('/api/customer/bookings/', _booking_payload())
        booking_id = create_response.json()['id']
        self.client.logout()

        customer_b = _register_customer('9111111111', name='Customer B')
        self.client.force_login(customer_b.user)
        response = self.client.get(f'/api/customer/bookings/{booking_id}/')
        self.assertEqual(response.status_code, 404)

    def test_own_booking_detail_is_visible(self):
        customer = _register_customer()
        self.client.force_login(customer.user)
        create_response = self.client.post('/api/customer/bookings/', _booking_payload())
        booking_id = create_response.json()['id']

        response = self.client.get(f'/api/customer/bookings/{booking_id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['id'], booking_id)


class BookingImageUploadTests(TestCase):
    def test_images_are_saved_and_returned(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        payload = _booking_payload()
        payload['images'] = [_tiny_jpeg('unit1.jpg'), _tiny_jpeg('unit2.jpg')]
        response = self.client.post('/api/customer/bookings/', payload, format='multipart')
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(len(body['images']), 2)
        self.assertEqual(BookingImage.objects.filter(booking_id=body['id']).count(), 2)

    def test_rejects_too_many_images(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        payload = _booking_payload()
        payload['images'] = [_tiny_jpeg(f'photo{i}.jpg') for i in range(7)]
        response = self.client.post('/api/customer/bookings/', payload, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(BookingImage.objects.count(), 0)

    def test_rejects_unsupported_file_type(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        payload = _booking_payload()
        payload['images'] = [SimpleUploadedFile('notes.txt', b'plain text', content_type='text/plain')]
        response = self.client.post('/api/customer/bookings/', payload, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(BookingImage.objects.count(), 0)

    def test_rejects_oversized_image(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        payload = _booking_payload()
        payload['images'] = [_tiny_jpeg('big.jpg', size=6 * 1024 * 1024)]
        response = self.client.post('/api/customer/bookings/', payload, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(BookingImage.objects.count(), 0)

    def test_booking_works_without_any_images(self):
        customer = _register_customer()
        self.client.force_login(customer.user)

        response = self.client.post('/api/customer/bookings/', _booking_payload())
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['images'], [])


class BookingTrackingTests(TestCase):
    def _create_booking(self, customer):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload())
        self.client.logout()
        return Booking.objects.get(pk=response.json()['id'])

    def test_requires_authentication(self):
        customer = _register_customer()
        booking = self._create_booking(customer)
        response = self.client.get(f'/api/customer/bookings/{booking.pk}/tracking/')
        self.assertEqual(response.status_code, 403)

    def test_cannot_view_another_customers_tracking(self):
        customer_a = _register_customer('9876543210', name='Customer A')
        booking = self._create_booking(customer_a)

        customer_b = _register_customer('9111111111', name='Customer B')
        self.client.force_login(customer_b.user)
        response = self.client.get(f'/api/customer/bookings/{booking.pk}/tracking/')
        self.assertEqual(response.status_code, 404)

    def test_pending_booking_has_no_technician_and_one_history_event(self):
        customer = _register_customer()
        booking = self._create_booking(customer)
        self.client.force_login(customer.user)

        response = self.client.get(f'/api/customer/bookings/{booking.pk}/tracking/')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['status'], 'pending')
        self.assertIsNone(body['technician_name'])
        self.assertIsNone(body['technician_phone'])
        self.assertIsNone(body['technician_latitude'])
        self.assertIsNone(body['location_updated_at'])
        self.assertEqual(float(body['estimated_min_price']), float(booking.estimated_min_price))
        self.assertEqual(float(body['estimated_max_price']), float(booking.estimated_max_price))
        self.assertEqual(len(body['tracking_history']), 1)
        self.assertEqual(body['tracking_history'][0]['status'], 'pending')
        self.assertEqual(body['time_slot'], booking.time_slot)
        self.assertEqual(body['time_slot_label'], '9:00 AM - 11:00 AM')

    def test_assigning_technician_auto_advances_to_assigned_and_logs_event(self):
        customer = _register_customer()
        booking = self._create_booking(customer)
        technician = _register_technician()

        booking.technician = technician
        booking.save()

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.STATUS_ASSIGNED)
        self.assertEqual(
            list(booking.tracking_events.values_list('status', flat=True)),
            [Booking.STATUS_PENDING, Booking.STATUS_ASSIGNED],
        )

        self.client.force_login(customer.user)
        response = self.client.get(f'/api/customer/bookings/{booking.pk}/tracking/')
        body = response.json()
        self.assertEqual(body['status'], 'assigned')
        self.assertEqual(body['technician_name'], technician.name)
        self.assertEqual(body['technician_phone'], technician.mobile_number)

    def test_manual_status_change_is_logged(self):
        customer = _register_customer()
        booking = self._create_booking(customer)

        booking.status = Booking.STATUS_CONFIRMED
        booking.save()
        booking.status = Booking.STATUS_CANCELLED
        booking.save()

        self.assertEqual(
            list(booking.tracking_events.values_list('status', flat=True)),
            [Booking.STATUS_PENDING, Booking.STATUS_CONFIRMED, Booking.STATUS_CANCELLED],
        )

    def test_saving_with_unchanged_status_does_not_duplicate_events(self):
        customer = _register_customer()
        booking = self._create_booking(customer)

        booking.complaint = 'Updated complaint text.'
        booking.save()

        self.assertEqual(BookingTrackingEvent.objects.filter(booking=booking).count(), 1)

    def test_arrived_status_is_valid(self):
        customer = _register_customer()
        booking = self._create_booking(customer)

        booking.status = Booking.STATUS_ARRIVED
        booking.save()
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'arrived')

    def test_location_update_stamps_location_updated_at(self):
        customer = _register_customer()
        booking = self._create_booking(customer)
        self.assertIsNone(booking.location_updated_at)

        booking.technician_latitude = 9.9312
        booking.technician_longitude = 76.2673
        booking.save()
        booking.refresh_from_db()

        self.assertIsNotNone(booking.location_updated_at)
        first_stamp = booking.location_updated_at

        # Saving again with the SAME coordinates must not bump the
        # timestamp — only an actual location change should.
        booking.complaint = 'No change to location this time.'
        booking.save()
        booking.refresh_from_db()
        self.assertEqual(booking.location_updated_at, first_stamp)

        self.client.force_login(customer.user)
        response = self.client.get(f'/api/customer/bookings/{booking.pk}/tracking/')
        body = response.json()
        self.assertEqual(float(body['technician_latitude']), 9.9312)
        self.assertIsNotNone(body['location_updated_at'])

    def test_cancelled_booking_tracking_shows_cancelled_status(self):
        customer = _register_customer()
        booking = self._create_booking(customer)
        booking.status = Booking.STATUS_CANCELLED
        booking.save()

        self.client.force_login(customer.user)
        response = self.client.get(f'/api/customer/bookings/{booking.pk}/tracking/')
        self.assertEqual(response.json()['status'], 'cancelled')


class CustomerNotificationCreationTests(TestCase):
    """CustomerNotification rows are created automatically by Booking.save()
    (see that model's own docstring) — these tests exercise that trigger
    directly, not the API views below."""

    def _create_booking(self, customer, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        return Booking.objects.get(pk=response.json()['id'])

    def test_booking_creates_a_booking_created_notification(self):
        customer = _register_customer()
        booking = self._create_booking(customer)

        notification = CustomerNotification.objects.get(customer=customer, booking=booking)
        self.assertEqual(notification.type, CustomerNotification.TYPE_BOOKING_CREATED)
        self.assertEqual(notification.title, 'Booking Confirmed')
        self.assertIn('AC Service', notification.message)
        self.assertFalse(notification.is_read)

    def test_assigning_a_technician_creates_assigned_and_accepted_notifications(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking(customer)
        CustomerNotification.objects.all().delete()  # drop the BOOKING_CREATED one from above

        booking.technician = technician
        booking.save()

        types = set(
            CustomerNotification.objects.filter(customer=customer, booking=booking).values_list('type', flat=True)
        )
        self.assertEqual(
            types, {CustomerNotification.TYPE_TECHNICIAN_ASSIGNED, CustomerNotification.TYPE_BOOKING_ACCEPTED}
        )
        assigned = CustomerNotification.objects.get(
            customer=customer, booking=booking, type=CustomerNotification.TYPE_TECHNICIAN_ASSIGNED
        )
        self.assertIn(technician.name, assigned.message)
        accepted = CustomerNotification.objects.get(
            customer=customer, booking=booking, type=CustomerNotification.TYPE_BOOKING_ACCEPTED
        )
        self.assertEqual(accepted.title, 'Booking Accepted')

    def test_status_progression_creates_the_expected_customer_notifications(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking(customer)
        booking.technician = technician
        booking.save()
        CustomerNotification.objects.all().delete()

        booking.status = Booking.STATUS_TECHNICIAN_ON_THE_WAY
        booking.save()
        notification = CustomerNotification.objects.get(customer=customer, booking=booking)
        self.assertEqual(notification.type, CustomerNotification.TYPE_TECHNICIAN_ON_THE_WAY)
        self.assertEqual(notification.title, 'Technician On The Way')

        booking.status = Booking.STATUS_ARRIVED
        booking.save()
        # ARRIVED isn't one of this feature's defined customer-facing
        # events — the count below stays at 1 (no new row).
        self.assertEqual(CustomerNotification.objects.filter(customer=customer, booking=booking).count(), 1)

        booking.status = Booking.STATUS_IN_PROGRESS
        booking.save()
        started = CustomerNotification.objects.get(
            customer=customer, booking=booking, type=CustomerNotification.TYPE_SERVICE_STARTED
        )
        self.assertEqual(started.title, 'Service Started')

        booking.status = Booking.STATUS_COMPLETED
        booking.save()
        completed = CustomerNotification.objects.get(
            customer=customer, booking=booking, type=CustomerNotification.TYPE_SERVICE_COMPLETED
        )
        self.assertEqual(completed.title, 'Service Completed')

        self.assertEqual(CustomerNotification.objects.filter(customer=customer, booking=booking).count(), 3)

    def test_cancellation_creates_a_cancelled_notification(self):
        customer = _register_customer()
        booking = self._create_booking(customer)
        CustomerNotification.objects.all().delete()

        booking.status = Booking.STATUS_CANCELLED
        booking.save()

        notification = CustomerNotification.objects.get(customer=customer, booking=booking)
        self.assertEqual(notification.type, CustomerNotification.TYPE_BOOKING_CANCELLED)
        self.assertEqual(notification.title, 'Booking Cancelled')

    def test_no_notification_for_a_save_with_no_status_change(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking(customer)
        booking.technician = technician
        booking.save()
        CustomerNotification.objects.all().delete()

        booking.save()  # re-save with the same status — nothing changed

        self.assertFalse(CustomerNotification.objects.exists())


class CustomerNotificationsApiTests(TestCase):
    """GET /api/customer/notifications/, PATCH /api/customer/notifications/
    <id>/read/, and POST /api/customer/notifications/mark-all-read/
    (views.py's customer_notifications / customer_notification_mark_read /
    customer_notifications_mark_all_read)."""

    def _create_booking(self, customer, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        return Booking.objects.get(pk=response.json()['id'])

    def test_list_requires_authentication(self):
        response = self.client.get('/api/customer/notifications/')
        self.assertEqual(response.status_code, 403)

    def test_technician_session_gets_404_not_a_customers_view(self):
        technician = _register_technician()
        self.client.force_login(technician.user)
        response = self.client.get('/api/customer/notifications/')
        self.assertEqual(response.status_code, 404)

    def test_customer_with_no_notifications_sees_empty_list(self):
        customer = _register_customer()
        self.client.force_login(customer.user)
        response = self.client.get('/api/customer/notifications/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'unread_count': 0, 'results': []})

    def test_booking_creates_a_notification_visible_over_the_api(self):
        customer = _register_customer()
        booking = self._create_booking(customer)

        self.client.force_login(customer.user)
        response = self.client.get('/api/customer/notifications/')
        body = response.json()
        self.assertEqual(body['unread_count'], 1)
        item = body['results'][0]
        self.assertEqual(item['type'], 'booking_created')
        self.assertEqual(item['type_label'], 'Booking created')
        self.assertEqual(item['title'], 'Booking Confirmed')
        self.assertEqual(item['booking_id'], booking.id)
        self.assertEqual(item['booking_ref'], booking.booking_ref)
        self.assertFalse(item['is_read'])
        self.assertIn('created_at', item)

    def test_mark_single_notification_read(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking(customer)
        booking.technician = technician
        booking.save()  # now 3 notifications: created, assigned, accepted

        self.client.force_login(customer.user)
        list_response = self.client.get('/api/customer/notifications/')
        self.assertEqual(list_response.json()['unread_count'], 3)
        target_id = list_response.json()['results'][0]['id']

        response = self.client.patch(f'/api/customer/notifications/{target_id}/read/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['is_read'])

        follow_up = self.client.get('/api/customer/notifications/')
        body = follow_up.json()
        self.assertEqual(body['unread_count'], 2)
        marked = next(item for item in body['results'] if item['id'] == target_id)
        self.assertTrue(marked['is_read'])

    def test_mark_read_requires_authentication(self):
        response = self.client.patch('/api/customer/notifications/1/read/')
        self.assertEqual(response.status_code, 403)

    def test_mark_read_404s_for_a_notification_not_owned_by_this_customer(self):
        customer_a = _register_customer('9876543210', name='Customer A')
        customer_b = _register_customer('9876500000', name='Customer B')
        booking = self._create_booking(customer_a)
        notification = CustomerNotification.objects.get(customer=customer_a, booking=booking)

        self.client.force_login(customer_b.user)
        response = self.client.patch(f'/api/customer/notifications/{notification.id}/read/')
        self.assertEqual(response.status_code, 404)

    def test_mark_all_read_requires_authentication(self):
        response = self.client.post('/api/customer/notifications/mark-all-read/')
        self.assertEqual(response.status_code, 403)

    def test_mark_all_read_clears_the_unread_count(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking(customer)
        booking.technician = technician
        booking.save()

        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/notifications/mark-all-read/')
        self.assertEqual(response.status_code, 200)

        follow_up = self.client.get('/api/customer/notifications/')
        body = follow_up.json()
        self.assertEqual(body['unread_count'], 0)
        self.assertTrue(all(item['is_read'] for item in body['results']))

    def test_customer_only_sees_their_own_notifications(self):
        customer_a = _register_customer('9876543210', name='Customer A')
        customer_b = _register_customer('9876500000', name='Customer B')
        self._create_booking(customer_a)
        self._create_booking(customer_b)

        self.client.force_login(customer_a.user)
        response = self.client.get('/api/customer/notifications/')
        body = response.json()
        self.assertEqual(len(body['results']), 1)
        self.assertEqual(body['unread_count'], 1)


class TechnicianJobsTests(TestCase):
    """GET /api/technician/jobs/ — a technician's own view of their
    assigned bookings (views.py's technician_jobs)."""

    def _create_booking_for(self, customer, technician=None, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        booking = Booking.objects.get(pk=response.json()['id'])
        if technician is not None:
            booking.technician = technician
            booking.save()
        return booking

    def test_requires_authentication(self):
        response = self.client.get('/api/technician/jobs/')
        self.assertEqual(response.status_code, 403)

    def test_customer_session_gets_404_not_a_technicians_view(self):
        customer = _register_customer()
        self.client.force_login(customer.user)
        response = self.client.get('/api/technician/jobs/')
        self.assertEqual(response.status_code, 404)

    def test_technician_with_no_assigned_bookings_sees_empty_list(self):
        technician = _register_technician()
        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/jobs/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_technician_sees_only_their_own_assigned_bookings(self):
        customer = _register_customer()
        technician_a = _register_technician('9111100001', name='Technician A')
        technician_b = _register_technician('9111100002', name='Technician B')

        assigned_to_a = self._create_booking_for(customer, technician=technician_a)
        # Assigning a technician auto-advances status to ASSIGNED (see
        # Booking.save()) — re-fetch to see the real post-save value.
        assigned_to_a.refresh_from_db()
        self._create_booking_for(customer, technician=technician_b)
        self._create_booking_for(customer, technician=None)  # unassigned — must show for nobody

        self.client.force_login(technician_a.user)
        response = self.client.get('/api/technician/jobs/')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)

        job = body[0]
        self.assertEqual(job['id'], assigned_to_a.pk)
        self.assertEqual(job['booking_ref'], assigned_to_a.booking_ref)
        self.assertEqual(job['service_name'], 'AC Service')
        self.assertEqual(job['customer_name'], customer.name)
        self.assertEqual(job['status'], 'assigned')
        self.assertEqual(job['status_label'], 'Assigned')
        self.assertEqual(job['time_slot'], Booking.TIME_SLOT_09_11)
        self.assertEqual(job['time_slot_label'], '9:00 AM - 11:00 AM')
        self.assertEqual(job['estimated_min_price'], 499)
        self.assertEqual(job['estimated_max_price'], 999)
        self.assertIn('address_line', job)
        self.assertIn('complaint', job)
        # Never a technician-identifying or payment field.
        self.assertNotIn('technician', job)

    def test_completed_and_cancelled_bookings_are_included(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)
        booking.status = Booking.STATUS_COMPLETED
        booking.save()

        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/jobs/')
        statuses = [job['status'] for job in response.json()]
        self.assertEqual(statuses, ['completed'])

    def test_same_day_jobs_are_ordered_by_time_slot(self):
        customer = _register_customer()
        technician = _register_technician()
        same_date = (timezone.now().date() + timezone.timedelta(days=3)).isoformat()
        # Created out of chronological order on purpose — proves the sort
        # is by time_slot, not creation order.
        self._create_booking_for(
            customer, technician=technician, booking_date=same_date, time_slot=Booking.TIME_SLOT_17_19
        )
        self._create_booking_for(
            customer, technician=technician, booking_date=same_date, time_slot=Booking.TIME_SLOT_09_11
        )
        self._create_booking_for(
            customer, technician=technician, booking_date=same_date, time_slot=Booking.TIME_SLOT_13_15
        )

        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/jobs/')
        slots = [job['time_slot'] for job in response.json()]
        self.assertEqual(slots, [Booking.TIME_SLOT_09_11, Booking.TIME_SLOT_13_15, Booking.TIME_SLOT_17_19])


class TechnicianJobDetailTests(TestCase):
    """GET /api/technician/jobs/<pk>/ — the technician dashboard's "View
    Details" button (views.py's technician_job_detail)."""

    def _create_booking_for(self, customer, technician=None, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        booking = Booking.objects.get(pk=response.json()['id'])
        if technician is not None:
            booking.technician = technician
            booking.save()
        return booking

    def test_requires_authentication(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)

        response = self.client.get(f'/api/technician/jobs/{booking.pk}/')
        self.assertEqual(response.status_code, 403)

    def test_technician_can_view_their_own_job_detail(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)

        self.client.force_login(technician.user)
        response = self.client.get(f'/api/technician/jobs/{booking.pk}/')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['id'], booking.pk)
        self.assertEqual(body['customer_name'], customer.name)
        # The extra fields the card view (TechnicianJobSerializer) doesn't
        # carry — this is what "View Details" is actually for.
        self.assertEqual(body['customer_phone'], customer.mobile_number)
        self.assertEqual(body['images'], [])
        # One event for creation (pending) and one for the auto-advance to
        # assigned when a technician got attached (see Booking.save()).
        self.assertEqual(len(body['tracking_history']), 2)
        self.assertEqual(body['tracking_history'][-1]['status'], 'assigned')
        self.assertIn('updated_at', body)
        # Still never a technician-identifying or payment field.
        self.assertNotIn('technician', body)

    def test_other_technicians_job_404s_not_403(self):
        customer = _register_customer()
        technician_a = _register_technician('9111100001', name='Technician A')
        technician_b = _register_technician('9111100002', name='Technician B')
        booking = self._create_booking_for(customer, technician=technician_a)

        self.client.force_login(technician_b.user)
        response = self.client.get(f'/api/technician/jobs/{booking.pk}/')
        self.assertEqual(response.status_code, 404)

    def test_unknown_job_404s(self):
        technician = _register_technician()
        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/jobs/999999/')
        self.assertEqual(response.status_code, 404)


class TechnicianJobUpdateStatusTests(TestCase):
    """PATCH /api/technician/jobs/<pk>/status/ — advancing a job's status
    one step forward (views.py's technician_job_update_status)."""

    def _create_booking_for(self, customer, technician=None, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        booking = Booking.objects.get(pk=response.json()['id'])
        if technician is not None:
            booking.technician = technician
            booking.save()
        return booking

    def test_requires_authentication(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)

        response = self.client.patch(
            f'/api/technician/jobs/{booking.pk}/status/', {'status': 'technician_on_the_way'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 403)

    def test_technician_can_advance_their_own_job_one_step(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)  # auto-advances to 'assigned'

        self.client.force_login(technician.user)
        response = self.client.patch(
            f'/api/technician/jobs/{booking.pk}/status/', {'status': 'technician_on_the_way'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'technician_on_the_way')

        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.STATUS_TECHNICIAN_ON_THE_WAY)
        # Booking.save() logs a BookingTrackingEvent on every status change —
        # confirms the technician's own update goes through that same path,
        # not a status-only shortcut that skips history.
        self.assertTrue(
            BookingTrackingEvent.objects.filter(booking=booking, status=Booking.STATUS_TECHNICIAN_ON_THE_WAY).exists()
        )

    def test_cannot_skip_ahead(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)  # 'assigned'

        self.client.force_login(technician.user)
        response = self.client.patch(
            f'/api/technician/jobs/{booking.pk}/status/', {'status': 'in_progress'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.STATUS_ASSIGNED)

    def test_cannot_move_backward(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)
        booking.status = Booking.STATUS_ARRIVED
        booking.save()

        self.client.force_login(technician.user)
        response = self.client.patch(
            f'/api/technician/jobs/{booking.pk}/status/', {'status': 'assigned'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.STATUS_ARRIVED)

    def test_cannot_advance_a_completed_job(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)
        booking.status = Booking.STATUS_COMPLETED
        booking.save()

        self.client.force_login(technician.user)
        response = self.client.patch(
            f'/api/technician/jobs/{booking.pk}/status/', {'status': 'completed'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_cannot_set_cancelled(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)  # 'assigned'

        self.client.force_login(technician.user)
        response = self.client.patch(
            f'/api/technician/jobs/{booking.pk}/status/', {'status': 'cancelled'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.STATUS_ASSIGNED)

    def test_cannot_advance_a_cancelled_job(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)
        booking.status = Booking.STATUS_CANCELLED
        booking.save()

        self.client.force_login(technician.user)
        response = self.client.patch(
            f'/api/technician/jobs/{booking.pk}/status/', {'status': 'in_progress'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_other_technicians_job_404s_not_403(self):
        customer = _register_customer()
        technician_a = _register_technician('9111100001', name='Technician A')
        technician_b = _register_technician('9111100002', name='Technician B')
        booking = self._create_booking_for(customer, technician=technician_a)

        self.client.force_login(technician_b.user)
        response = self.client.patch(
            f'/api/technician/jobs/{booking.pk}/status/', {'status': 'technician_on_the_way'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)


class TechnicianPerformanceTests(TestCase):
    """GET /api/technician/performance/ — computed straight from the
    technician's own Booking rows (views.py's technician_performance)."""

    def _create_booking_for(self, customer, technician=None, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        booking = Booking.objects.get(pk=response.json()['id'])
        if technician is not None:
            booking.technician = technician
            booking.save()
        return booking

    def test_requires_authentication(self):
        response = self.client.get('/api/technician/performance/')
        self.assertEqual(response.status_code, 403)

    def test_customer_session_gets_404_not_a_technicians_view(self):
        customer = _register_customer()
        self.client.force_login(customer.user)
        response = self.client.get('/api/technician/performance/')
        self.assertEqual(response.status_code, 404)

    def test_technician_with_no_jobs_sees_zeros_and_null_response_time(self):
        technician = _register_technician()
        self.client.force_login(technician.user)

        response = self.client.get('/api/technician/performance/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                'total_jobs': 0,
                'completed_jobs': 0,
                'cancelled_jobs': 0,
                'completion_rate': 0,
                'avg_response_time_minutes': None,
            },
        )

    def test_counts_and_completion_rate_reflect_real_bookings(self):
        customer = _register_customer()
        technician = _register_technician()

        completed = self._create_booking_for(customer, technician=technician)
        completed.status = Booking.STATUS_COMPLETED
        completed.save()

        cancelled = self._create_booking_for(customer, technician=technician)
        cancelled.status = Booking.STATUS_CANCELLED
        cancelled.save()

        self._create_booking_for(customer, technician=technician)  # still 'assigned'
        self._create_booking_for(customer, technician=None)  # unassigned — must not count

        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/performance/')
        body = response.json()
        self.assertEqual(body['total_jobs'], 3)
        self.assertEqual(body['completed_jobs'], 1)
        self.assertEqual(body['cancelled_jobs'], 1)
        # 1 completed / 3 total, rounded.
        self.assertEqual(body['completion_rate'], 33)

    def test_average_response_time_computed_from_tracking_events(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)  # logs an 'assigned' event

        assigned_event = BookingTrackingEvent.objects.get(booking=booking, status=Booking.STATUS_ASSIGNED)
        assigned_at = timezone.now() - timezone.timedelta(minutes=30)
        # .update(), not .save() — auto_now_add only applies on INSERT, so a
        # queryset update is what lets a test backdate it deterministically.
        BookingTrackingEvent.objects.filter(pk=assigned_event.pk).update(created_at=assigned_at)

        self.client.force_login(technician.user)
        self.client.patch(
            f'/api/technician/jobs/{booking.pk}/status/', {'status': 'technician_on_the_way'}, content_type='application/json'
        )
        on_the_way_event = BookingTrackingEvent.objects.get(booking=booking, status=Booking.STATUS_TECHNICIAN_ON_THE_WAY)
        BookingTrackingEvent.objects.filter(pk=on_the_way_event.pk).update(
            created_at=assigned_at + timezone.timedelta(minutes=10)
        )

        response = self.client.get('/api/technician/performance/')
        self.assertEqual(response.json()['avg_response_time_minutes'], 10)

    def test_response_time_is_null_until_a_job_moves_past_assigned(self):
        customer = _register_customer()
        technician = _register_technician()
        self._create_booking_for(customer, technician=technician)  # still 'assigned' — no on-the-way event yet

        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/performance/')
        self.assertIsNone(response.json()['avg_response_time_minutes'])


class TechnicianNotificationCreationTests(TestCase):
    """TechnicianNotification rows are created automatically by
    Booking.save() (see that model's own docstring) — these tests exercise
    that trigger directly, not the API views below."""

    def _create_booking_for(self, customer, technician=None, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        booking = Booking.objects.get(pk=response.json()['id'])
        if technician is not None:
            booking.technician = technician
            booking.save()
        return booking

    def test_assigning_a_technician_creates_an_assigned_notification(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)

        notification = TechnicianNotification.objects.get(technician=technician, booking=booking)
        self.assertEqual(notification.type, TechnicianNotification.TYPE_ASSIGNED)
        self.assertIn(booking.booking_ref, notification.message)
        self.assertFalse(notification.is_read)

    def test_a_status_change_creates_a_status_update_notification(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)

        booking.status = Booking.STATUS_TECHNICIAN_ON_THE_WAY
        booking.save()

        notification = TechnicianNotification.objects.get(
            technician=technician, booking=booking, type=TechnicianNotification.TYPE_STATUS_UPDATE
        )
        self.assertIn(booking.booking_ref, notification.message)
        self.assertIn('Technician On The Way', notification.message)

    def test_no_notification_for_an_unassigned_booking(self):
        customer = _register_customer()
        self._create_booking_for(customer)  # never assigned — stays PENDING

        self.assertFalse(TechnicianNotification.objects.exists())

    def test_no_notification_for_a_save_with_no_status_change(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)
        TechnicianNotification.objects.all().delete()

        booking.save()  # re-save with the same status — nothing changed

        self.assertFalse(TechnicianNotification.objects.exists())


class TechnicianNotificationsApiTests(TestCase):
    """GET /api/technician/notifications/ and POST /api/technician/
    notifications/mark-read/ (views.py's technician_notifications/
    technician_notifications_mark_read)."""

    def _create_booking_for(self, customer, technician=None, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        booking = Booking.objects.get(pk=response.json()['id'])
        if technician is not None:
            booking.technician = technician
            booking.save()
        return booking

    def test_list_requires_authentication(self):
        response = self.client.get('/api/technician/notifications/')
        self.assertEqual(response.status_code, 403)

    def test_customer_session_gets_404_not_a_technicians_view(self):
        customer = _register_customer()
        self.client.force_login(customer.user)
        response = self.client.get('/api/technician/notifications/')
        self.assertEqual(response.status_code, 404)

    def test_technician_with_no_notifications_sees_empty_list(self):
        technician = _register_technician()
        self.client.force_login(technician.user)

        response = self.client.get('/api/technician/notifications/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'unread_count': 0, 'results': []})

    def test_list_is_capped_at_seven_newest_first_but_unread_count_counts_everything(self):
        customer = _register_customer()
        technician = _register_technician()
        booking_a = self._create_booking_for(customer, technician=technician)  # notification 1: assigned

        self.client.force_login(technician.user)
        for target in ('technician_on_the_way', 'arrived', 'in_progress', 'completed'):
            # notifications 2-5
            self.client.patch(
                f'/api/technician/jobs/{booking_a.pk}/status/', {'status': target}, content_type='application/json'
            )
        booking_a.refresh_from_db()
        booking_a.status = Booking.STATUS_CANCELLED
        booking_a.save()  # notification 6

        # A second, independent booking pushes the total to 8 (7 above + 1
        # assigned + 1 status update here) so the 7-item cap and the true
        # unread total can be told apart. _create_booking_for logs the
        # customer in and back out again internally, so the technician
        # session needs re-establishing before the PATCH below.
        booking_b = self._create_booking_for(customer, technician=technician)  # notification 7: assigned
        self.client.force_login(technician.user)
        self.client.patch(
            f'/api/technician/jobs/{booking_b.pk}/status/',
            {'status': 'technician_on_the_way'},
            content_type='application/json',
        )  # notification 8

        total_notifications = TechnicianNotification.objects.filter(technician=technician).count()
        self.assertEqual(total_notifications, 8)

        response = self.client.get('/api/technician/notifications/')
        body = response.json()
        self.assertEqual(body['unread_count'], 8)
        self.assertEqual(len(body['results']), 7)
        # Newest first.
        created_ats = [item['created_at'] for item in body['results']]
        self.assertEqual(created_ats, sorted(created_ats, reverse=True))

    def test_result_shape(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)

        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/notifications/')
        item = response.json()['results'][0]
        self.assertEqual(item['type'], 'assigned')
        self.assertEqual(item['type_label'], 'Job assigned')
        self.assertEqual(item['booking_ref'], booking.booking_ref)
        self.assertIn(booking.booking_ref, item['message'])
        self.assertFalse(item['is_read'])
        self.assertIn('created_at', item)

    def test_mark_read_requires_authentication(self):
        response = self.client.post('/api/technician/notifications/mark-read/')
        self.assertEqual(response.status_code, 403)

    def test_mark_read_clears_the_unread_count(self):
        customer = _register_customer()
        technician = _register_technician()
        self._create_booking_for(customer, technician=technician)

        self.client.force_login(technician.user)
        mark_response = self.client.post('/api/technician/notifications/mark-read/')
        self.assertEqual(mark_response.status_code, 200)

        response = self.client.get('/api/technician/notifications/')
        body = response.json()
        self.assertEqual(body['unread_count'], 0)
        self.assertTrue(all(item['is_read'] for item in body['results']))

    def test_technician_only_sees_their_own_notifications(self):
        customer = _register_customer()
        technician_a = _register_technician('9111100001', name='Technician A')
        technician_b = _register_technician('9111100002', name='Technician B')
        self._create_booking_for(customer, technician=technician_a)
        self._create_booking_for(customer, technician=technician_b)

        self.client.force_login(technician_a.user)
        response = self.client.get('/api/technician/notifications/')
        body = response.json()
        self.assertEqual(len(body['results']), 1)
        self.assertEqual(body['unread_count'], 1)


class TechnicianCommissionNotificationTests(TestCase):
    """TechnicianNotification rows for commission_amount/commission_paid
    changes — created automatically by Booking.save() (see that model's
    own docstring), same trigger as the assigned/status_update tests in
    TechnicianNotificationCreationTests above."""

    def _create_booking_for(self, customer, technician=None, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        booking = Booking.objects.get(pk=response.json()['id'])
        if technician is not None:
            booking.technician = technician
            booking.save()
        return booking

    def test_setting_commission_for_the_first_time_creates_an_added_notification(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)

        booking.commission_amount = Decimal('150.00')
        booking.save()

        notification = TechnicianNotification.objects.get(
            technician=technician, booking=booking, type=TechnicianNotification.TYPE_COMMISSION_UPDATED
        )
        self.assertIn('added', notification.message)
        self.assertIn('150', notification.message)
        self.assertIn(booking.booking_ref, notification.message)

    def test_changing_an_existing_commission_creates_an_updated_notification(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)
        booking.commission_amount = Decimal('150.00')
        booking.save()

        booking.commission_amount = Decimal('200.00')
        booking.save()

        notifications = TechnicianNotification.objects.filter(
            technician=technician, booking=booking, type=TechnicianNotification.TYPE_COMMISSION_UPDATED
        ).order_by('id')
        self.assertEqual(notifications.count(), 2)
        self.assertIn('updated', notifications.last().message)
        self.assertIn('200', notifications.last().message)

    def test_marking_paid_creates_a_paid_notification(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)
        booking.commission_amount = Decimal('150.00')
        booking.save()
        TechnicianNotification.objects.all().delete()

        booking.commission_paid = True
        booking.save()

        notification = TechnicianNotification.objects.get(
            technician=technician, booking=booking, type=TechnicianNotification.TYPE_COMMISSION_UPDATED
        )
        self.assertIn('paid out', notification.message)

    def test_unmarking_paid_creates_no_notification(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)
        booking.commission_amount = Decimal('150.00')
        booking.commission_paid = True
        booking.save()
        TechnicianNotification.objects.all().delete()

        booking.commission_paid = False
        booking.save()

        self.assertFalse(TechnicianNotification.objects.exists())

    def test_no_commission_notification_without_an_assigned_technician(self):
        customer = _register_customer()
        booking = self._create_booking_for(customer)  # never assigned

        booking.commission_amount = Decimal('150.00')
        booking.save()

        self.assertFalse(TechnicianNotification.objects.exists())


class TechnicianEarningsApiTests(TestCase):
    """GET /api/technician/earnings/ — see views.py's technician_earnings.
    'ac' (this file's default booking service) is seeded at estimated_min_
    price=499/estimated_max_price=999, so a priced 'ac' booking always
    contributes a service-value midpoint of 749."""

    def _create_booking_for(self, customer, technician=None, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        booking = Booking.objects.get(pk=response.json()['id'])
        if technician is not None:
            booking.technician = technician
            booking.save()
        return booking

    def test_requires_authentication(self):
        response = self.client.get('/api/technician/earnings/')
        self.assertEqual(response.status_code, 403)

    def test_customer_session_gets_404_not_a_technicians_view(self):
        customer = _register_customer()
        self.client.force_login(customer.user)
        response = self.client.get('/api/technician/earnings/')
        self.assertEqual(response.status_code, 404)

    def test_technician_with_no_priced_jobs_sees_zeros(self):
        technician = _register_technician()
        self.client.force_login(technician.user)

        response = self.client.get('/api/technician/earnings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                'total_commission_earned': '0',
                'month_commission_earned': '0',
                'total_service_value': '0',
                'commission_rate': 0,
                'pending_payout': '0',
                'paid_amount': '0',
            },
        )

    def test_unpriced_jobs_never_count_toward_any_total(self):
        customer = _register_customer()
        technician = _register_technician()
        self._create_booking_for(customer, technician=technician)  # no commission_amount set

        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/earnings/')
        self.assertEqual(response.json()['total_commission_earned'], '0')
        self.assertEqual(response.json()['total_service_value'], '0')

    def test_totals_and_commission_rate_reflect_priced_jobs(self):
        customer = _register_customer()
        technician = _register_technician()
        booking_a = self._create_booking_for(customer, technician=technician)
        booking_a.commission_amount = Decimal('150.00')
        booking_a.save()
        booking_b = self._create_booking_for(customer, technician=technician)
        booking_b.commission_amount = Decimal('75.00')
        booking_b.save()

        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/earnings/')
        body = response.json()
        self.assertEqual(Decimal(body['total_commission_earned']), Decimal('225.00'))
        # Two 'ac' bookings, midpoint 749 each -> 1498 total service value.
        self.assertEqual(Decimal(body['total_service_value']), Decimal('1498'))
        # 225 / 1498 * 100, rounded.
        self.assertEqual(body['commission_rate'], round(225 / 1498 * 100))

    def test_month_commission_only_counts_bookings_dated_this_month(self):
        customer = _register_customer()
        technician = _register_technician()
        today = timezone.now().date()

        this_month = self._create_booking_for(customer, technician=technician, booking_date=today.isoformat())
        this_month.commission_amount = Decimal('150.00')
        this_month.save()

        # A booking_date far enough in the future to always land in a
        # different month than `today` (booking creation itself requires
        # today-or-later — see BookingCreateSerializer.validate_booking_date
        # — so this can't just go backward).
        other_month_date = (today + timezone.timedelta(days=200)).isoformat()
        other_month = self._create_booking_for(customer, technician=technician, booking_date=other_month_date)
        other_month.commission_amount = Decimal('300.00')
        other_month.save()

        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/earnings/')
        body = response.json()
        self.assertEqual(Decimal(body['month_commission_earned']), Decimal('150.00'))
        # Both still count toward the all-time total.
        self.assertEqual(Decimal(body['total_commission_earned']), Decimal('450.00'))

    def test_pending_and_paid_amounts_split_correctly(self):
        customer = _register_customer()
        technician = _register_technician()
        paid = self._create_booking_for(customer, technician=technician)
        paid.commission_amount = Decimal('150.00')
        paid.commission_paid = True
        paid.save()
        pending = self._create_booking_for(customer, technician=technician)
        pending.commission_amount = Decimal('75.00')
        pending.save()

        self.client.force_login(technician.user)
        response = self.client.get('/api/technician/earnings/')
        body = response.json()
        self.assertEqual(Decimal(body['paid_amount']), Decimal('150.00'))
        self.assertEqual(Decimal(body['pending_payout']), Decimal('75.00'))

    def test_technician_only_sees_their_own_earnings(self):
        customer = _register_customer()
        technician_a = _register_technician('9111100001', name='Technician A')
        technician_b = _register_technician('9111100002', name='Technician B')
        booking_a = self._create_booking_for(customer, technician=technician_a)
        booking_a.commission_amount = Decimal('150.00')
        booking_a.save()
        booking_b = self._create_booking_for(customer, technician=technician_b)
        booking_b.commission_amount = Decimal('999.00')
        booking_b.save()

        self.client.force_login(technician_a.user)
        response = self.client.get('/api/technician/earnings/')
        self.assertEqual(Decimal(response.json()['total_commission_earned']), Decimal('150.00'))


class PublicServiceApiTests(TestCase):
    """GET /api/services/ and /api/services/<slug>/ — see bookings/views.py's
    service_list/service_detail. Relies on the 4 services seeded by
    0003_seed_services.py + 0006_seed_service_content.py, same as this
    file's other tests already rely on 'ac' existing with pricing 499/999."""

    def test_list_returns_only_active_services_with_card_fields(self):
        Service.objects.filter(slug='microwave').update(is_active=False)

        response = self.client.get('/api/services/')
        self.assertEqual(response.status_code, 200)
        body = response.json()

        slugs = [item['slug'] for item in body]
        self.assertIn('ac', slugs)
        self.assertNotIn('microwave', slugs)

        ac = next(item for item in body if item['slug'] == 'ac')
        self.assertEqual(ac['id'], 'ac')
        self.assertEqual(ac['name'], 'AC Service')
        self.assertEqual(ac['estimated_price_from'], 499)
        self.assertEqual(ac['estimated_price_to'], 999)
        self.assertTrue(ac['short_description'])
        self.assertTrue(ac['image'])
        # Detail-only fields must not leak into the list response.
        self.assertNotIn('full_description', ac)
        self.assertNotIn('features', ac)

    def test_list_is_ordered_by_display_order(self):
        response = self.client.get('/api/services/')
        slugs = [item['slug'] for item in response.json()]
        self.assertEqual(slugs, ['ac', 'refrigerator', 'washing-machine', 'microwave'])

    def test_detail_includes_full_description_and_ordered_features(self):
        response = self.client.get('/api/services/ac/')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body['full_description'])
        titles = [feature['title'] for feature in body['features']]
        self.assertEqual(titles[0], 'Full AC Cleaning (Indoor & Outdoor)')
        self.assertGreaterEqual(len(titles), 1)

    def test_detail_404s_for_unknown_slug(self):
        response = self.client.get('/api/services/does-not-exist/')
        self.assertEqual(response.status_code, 404)
        self.assertIn('detail', response.json())

    def test_detail_404s_for_inactive_service(self):
        # Inactive reads exactly like nonexistent to the public API — see
        # service_detail's own comment on why the two aren't distinguished.
        Service.objects.filter(slug='ac').update(is_active=False)
        response = self.client.get('/api/services/ac/')
        self.assertEqual(response.status_code, 404)

    def test_list_excludes_inactive_from_count(self):
        before = len(self.client.get('/api/services/').json())
        Service.objects.filter(slug='ac').update(is_active=False)
        after = len(self.client.get('/api/services/').json())
        self.assertEqual(after, before - 1)


class ServiceAdminTests(TestCase):
    """Django Admin's Service editing — the actual acceptance criterion this
    whole feature is judged on: a service added here must be immediately
    live on the public API with no code change."""

    def setUp(self):
        self.admin_user = get_user_model().objects.create_superuser(
            username='admin', email='admin@example.com', password='pw12345678'
        )
        self.client.force_login(self.admin_user)

    def test_changelist_renders(self):
        response = self.client.get('/admin/bookings/service/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'AC Service')

    def test_add_form_has_editable_slug(self):
        response = self.client.get('/admin/bookings/service/add/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="slug"')

    def test_change_form_locks_slug_and_shows_features_inline(self):
        response = self.client.get('/admin/bookings/service/ac/change/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Full AC Cleaning')  # ServiceFeatureInline row
        self.assertNotContains(response, 'name="slug"')  # readonly once created

    def test_add_new_service_appears_on_public_api_immediately(self):
        response = self.client.post(
            '/admin/bookings/service/add/',
            {
                'name': 'Geyser Service',
                'slug': 'geyser',
                'short_description': 'Reliable geyser repair.',
                'full_description': 'Full geyser servicing and safety checks.',
                'estimated_price_from': 299,
                'estimated_price_to': 599,
                'is_active': 'on',
                'display_order': 5,
                'features-TOTAL_FORMS': 1,
                'features-INITIAL_FORMS': 0,
                'features-MIN_NUM_FORMS': 0,
                'features-MAX_NUM_FORMS': 1000,
                'features-0-title': 'General Inspection',
                'features-0-display_order': 0,
                '_save': 'Save',
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)

        service = Service.objects.filter(slug='geyser').first()
        self.assertIsNotNone(service)
        self.assertEqual(service.name, 'Geyser Service')
        self.assertTrue(service.is_active)
        self.assertEqual(list(service.features.values_list('title', flat=True)), ['General Inspection'])

        api_response = self.client.get('/api/services/geyser/')
        self.assertEqual(api_response.status_code, 200)
        self.assertEqual(api_response.json()['name'], 'Geyser Service')

    def test_deactivating_a_service_hides_it_from_the_public_api(self):
        self.client.post(
            f'/admin/bookings/service/ac/change/',
            {
                'name': 'AC Service',
                'short_description': 'Complete AC care for better cooling and fresh air.',
                'full_description': "From AC units that aren't cooling properly...",
                'estimated_price_from': 499,
                'estimated_price_to': 999,
                'display_order': 1,
                # is_active omitted — an unchecked checkbox simply isn't sent
                'features-TOTAL_FORMS': 0,
                'features-INITIAL_FORMS': 0,
                'features-MIN_NUM_FORMS': 0,
                'features-MAX_NUM_FORMS': 1000,
                '_save': 'Save',
            },
        )
        self.assertFalse(Service.objects.get(slug='ac').is_active)
        self.assertEqual(self.client.get('/api/services/ac/').status_code, 404)

    def test_display_order_and_is_active_are_editable_from_the_changelist(self):
        # `list_editable` on ServiceAdmin is what makes display_order/
        # is_active editable inline from the changelist (see admin.py) —
        # exercised end-to-end via the changelist's own edit formset here,
        # rather than re-testing Django's own well-covered formset
        # machinery. The formset covers every row currently listed (its PK
        # field is `slug`, since that's Service's own primary key) — Django
        # requires the whole page's forms to round-trip, not just the one
        # row actually being changed.
        services = list(Service.objects.order_by('display_order', 'name'))
        data = {
            'form-TOTAL_FORMS': len(services),
            'form-INITIAL_FORMS': len(services),
            'form-MIN_NUM_FORMS': 0,
            'form-MAX_NUM_FORMS': 1000,
            '_save': 'Save',
        }
        for i, service in enumerate(services):
            data[f'form-{i}-slug'] = service.slug
            if service.is_active:
                data[f'form-{i}-is_active'] = 'on'
            data[f'form-{i}-display_order'] = 99 if service.slug == 'microwave' else service.display_order

        response = self.client.post('/admin/bookings/service/', data)
        self.assertEqual(response.status_code, 302, response.content[:2000])
        self.assertEqual(Service.objects.get(slug='microwave').display_order, 99)


class BookingTechnicianConflictTests(TestCase):
    """Booking.clean() (models.py) refuses to save a technician assignment
    that would double-book them — the same technician already on a
    different (non-cancelled) booking for the same date + time slot.
    Exercised directly via full_clean() for the several scenarios below
    (fast, no HTTP round trip needed to prove the logic itself), plus once
    through a real Django Admin change-form POST at the bottom of this
    class — the only place this assignment actually happens in production
    — to prove the check is really wired into that form, not just a
    standalone model method nothing calls.
    """

    def setUp(self):
        self.admin = _make_admin()

    def _booking_for(self, customer, **overrides):
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        return Booking.objects.get(pk=response.json()['id'])

    def test_assigning_a_conflicting_technician_raises_on_full_clean(self):
        customer = _register_customer()
        technician = _register_technician()
        already_booked = self._booking_for(customer)
        already_booked.technician = technician
        already_booked.save()

        # Same default booking_date/time_slot as already_booked above
        # (_booking_payload's own defaults) — a genuine conflict.
        second = self._booking_for(customer, service='refrigerator')
        second.technician = technician
        with self.assertRaises(ValidationError) as ctx:
            second.full_clean()
        self.assertIn('technician', ctx.exception.message_dict)
        self.assertIn(already_booked.booking_ref, ctx.exception.message_dict['technician'][0])

    def test_different_time_slot_same_day_is_allowed(self):
        customer = _register_customer()
        technician = _register_technician()
        first = self._booking_for(customer, time_slot=Booking.TIME_SLOT_09_11)
        first.technician = technician
        first.save()

        second = self._booking_for(customer, service='refrigerator', time_slot=Booking.TIME_SLOT_11_13)
        second.technician = technician
        second.full_clean()  # does not raise

    def test_same_slot_different_date_is_allowed(self):
        customer = _register_customer()
        technician = _register_technician()
        first_date = (timezone.now().date() + timezone.timedelta(days=2)).isoformat()
        second_date = (timezone.now().date() + timezone.timedelta(days=3)).isoformat()
        first = self._booking_for(customer, booking_date=first_date)
        first.technician = technician
        first.save()

        second = self._booking_for(customer, service='refrigerator', booking_date=second_date)
        second.technician = technician
        second.full_clean()  # does not raise

    def test_a_cancelled_conflicting_booking_does_not_block_assignment(self):
        customer = _register_customer()
        technician = _register_technician()
        cancelled = self._booking_for(customer)
        cancelled.technician = technician
        cancelled.save()
        cancelled.status = Booking.STATUS_CANCELLED
        cancelled.save()

        second = self._booking_for(customer, service='refrigerator')
        second.technician = technician
        second.full_clean()  # does not raise

    def test_resaving_the_same_booking_unchanged_is_allowed(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._booking_for(customer)
        booking.technician = technician
        booking.save()

        booking.full_clean()  # its own assignment, not a conflict — does not raise

    def _formset_payload(self, prefix, queryset):
        # Every inline on BookingAdmin needs its own formset management
        # data or Django rejects the POST outright ("ManagementForm data is
        # missing"), even though none of the actual rows are being edited
        # here — and, for any inline that already has rows (INITIAL_FORMS
        # > 0), each one's own hidden `id` field too, or Django's formset
        # itself reports "This field is required." per existing row.
        rows = list(queryset)
        data = {
            f'{prefix}-TOTAL_FORMS': len(rows),
            f'{prefix}-INITIAL_FORMS': len(rows),
            f'{prefix}-MIN_NUM_FORMS': 0,
            f'{prefix}-MAX_NUM_FORMS': 0,
        }
        for i, row in enumerate(rows):
            data[f'{prefix}-{i}-id'] = row.pk
        return data

    def _admin_change_payload(self, booking, **field_overrides):
        payload = {
            'status': booking.status,
            'technician': '' if booking.technician_id is None else booking.technician_id,
            'technician_latitude': '' if booking.technician_latitude is None else booking.technician_latitude,
            'technician_longitude': '' if booking.technician_longitude is None else booking.technician_longitude,
            '_save': 'Save',
        }
        payload.update(self._formset_payload('images', booking.images.all()))
        payload.update(self._formset_payload('tracking_events', booking.tracking_events.all()))
        payload.update(self._formset_payload('technician_notifications', booking.technician_notifications.all()))
        payload.update(self._formset_payload('customer_notifications', booking.customer_notifications.all()))
        payload.update(field_overrides)
        return payload

    def test_admin_change_form_rejects_a_conflicting_assignment(self):
        customer = _register_customer()
        technician = _register_technician()
        already_booked = self._booking_for(customer)
        already_booked.technician = technician
        already_booked.save()

        second = self._booking_for(customer, service='refrigerator')  # same default date/time_slot
        self.client.force_login(self.admin)

        response = self.client.post(
            f'/admin/bookings/booking/{second.pk}/change/',
            self._admin_change_payload(second, technician=technician.pk),
        )
        self.assertEqual(response.status_code, 200)  # redisplays the form with the error, not a 302 redirect
        self.assertContains(response, 'is already assigned to')
        second.refresh_from_db()
        self.assertIsNone(second.technician)  # never actually saved

    def test_admin_change_form_accepts_a_non_conflicting_assignment(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._booking_for(customer)
        self.client.force_login(self.admin)

        response = self.client.post(
            f'/admin/bookings/booking/{booking.pk}/change/',
            self._admin_change_payload(booking, technician=technician.pk),
        )
        self.assertEqual(response.status_code, 302, response.content[:2000])
        booking.refresh_from_db()
        self.assertEqual(booking.technician, technician)


class TechnicianCommissionAdminTests(TestCase):
    """Django Admin's dedicated Technician Commissions section (admin.py's
    TechnicianCommissionAdmin, registered against the TechnicianCommission
    proxy) — a separate section from BookingAdmin, which no longer shows
    commission_amount/commission_paid at all (see that class's own
    docstring)."""

    def setUp(self):
        self.admin = _make_admin()
        self.client.force_login(self.admin)

    def _create_booking_for(self, customer, technician=None, **overrides):
        # Booking creation itself needs the customer's own session, not the
        # admin's — logs back in as the admin before returning so every
        # caller starts from the same state this class's setUp leaves it in.
        self.client.logout()
        self.client.force_login(customer.user)
        response = self.client.post('/api/customer/bookings/', _booking_payload(**overrides))
        self.client.logout()
        booking = Booking.objects.get(pk=response.json()['id'])
        if technician is not None:
            booking.technician = technician
            booking.save()
        self.client.force_login(self.admin)
        return booking

    def test_changelist_renders(self):
        response = self.client.get('/admin/bookings/techniciancommission/')
        self.assertEqual(response.status_code, 200)

    def test_only_technician_assigned_bookings_are_listed(self):
        customer = _register_customer()
        technician = _register_technician()
        assigned = self._create_booking_for(customer, technician=technician)
        self._create_booking_for(customer)  # never assigned — must not appear

        response = self.client.get('/admin/bookings/techniciancommission/')
        self.assertContains(response, assigned.booking_ref)
        self.assertEqual(response.context['cl'].result_count, 1)

    def test_booking_admin_no_longer_shows_commission_fields(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)

        response = self.client.get(f'/admin/bookings/booking/{booking.pk}/change/')
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, 'name="commission_amount"')
        self.assertNotContains(response, 'name="commission_paid"')

    def test_commission_amount_and_paid_are_editable_from_the_changelist(self):
        # Same `list_editable` changelist-formset pattern as ServiceAdmin's
        # own test above — this is what makes "set the commission and mark
        # it paid, without opening the change form" actually work.
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)

        response = self.client.post(
            '/admin/bookings/techniciancommission/',
            {
                'form-TOTAL_FORMS': 1,
                'form-INITIAL_FORMS': 1,
                'form-MIN_NUM_FORMS': 0,
                'form-MAX_NUM_FORMS': 1000,
                'form-0-id': booking.pk,
                'form-0-commission_amount': '150.00',
                'form-0-commission_paid': 'on',
                '_save': 'Save',
            },
        )
        self.assertEqual(response.status_code, 302, response.content[:2000])
        booking.refresh_from_db()
        self.assertEqual(booking.commission_amount, Decimal('150.00'))
        self.assertTrue(booking.commission_paid)

        # Booking.save() fires this the same way regardless of which admin
        # section made the change — see TechnicianCommissionAdmin's own
        # docstring.
        self.assertTrue(
            TechnicianNotification.objects.filter(
                technician=technician, booking=booking, type=TechnicianNotification.TYPE_COMMISSION_UPDATED
            ).exists()
        )

    def test_cannot_add_from_this_section(self):
        response = self.client.get('/admin/bookings/techniciancommission/add/')
        self.assertEqual(response.status_code, 403)

    def test_cannot_delete_from_this_section(self):
        customer = _register_customer()
        technician = _register_technician()
        booking = self._create_booking_for(customer, technician=technician)

        response = self.client.get(f'/admin/bookings/techniciancommission/{booking.pk}/delete/')
        self.assertEqual(response.status_code, 403)
