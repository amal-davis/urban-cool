from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone

from .models import Customer, PhoneOTP, TechnicianProfile, UserProfile


def _tiny_jpeg(name='photo.jpg'):
    # A minimal valid JPEG (Pillow-parseable) — same bytes bookings/tests.py's
    # own _tiny_jpeg uses, kept as a local copy rather than a cross-app
    # import per this project's established convention (see that file's own
    # comment).
    content = (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00'
        + bytes([1] * 64)
        + b'\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01'
        b'\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n'
        b'\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xd2\xcf \xff\xd9'
    )
    return SimpleUploadedFile(name, content, content_type='image/jpeg')


def _register_customer(phone='9876543210', name='Test Customer', email=None):
    """Creates a User + Customer row directly, bypassing the OTP flow — for
    tests that exercise *login* behavior and just need an already-registered
    customer to exist, not the Signup flow itself (SignupFlowTests covers
    that separately)."""
    user = get_user_model().objects.create(username=phone, first_name=name, email=email or f'{phone}@example.com')
    user.set_unusable_password()
    user.save(update_fields=['password'])
    return Customer.objects.create(
        user=user, mobile_number=f'+91{phone}', name=name, email=email or f'{phone}@example.com'
    )


def _register_technician(phone='9812345678', name='Test Technician', email=None, is_active=True):
    """Creates a User (role=TECHNICIAN) + TechnicianProfile row directly,
    bypassing the admin-create API — mirrors _register_customer above, for
    tests that exercise technician *login* behavior and just need an
    already-existing, admin-created technician (TechnicianManagementTests
    already covers the create flow itself)."""
    user = get_user_model().objects.create(
        username=phone, first_name=name, email=email or f'{phone}@example.com', is_active=is_active
    )
    user.set_unusable_password()
    user.save(update_fields=['password'])
    UserProfile.objects.update_or_create(user=user, defaults={'role': UserProfile.ROLE_TECHNICIAN})
    return TechnicianProfile.objects.create(
        user=user,
        name=name,
        mobile_number=f'+91{phone}',
        email=email or f'{phone}@example.com',
        date_of_birth='1990-01-01',
        address_line='1 Depot Road',
        city='Kochi',
        state='Kerala',
        pincode='682001',
        specialization=TechnicianProfile.SPECIALIZATION_AC,
        experience_years=5,
    )


class SendOtpTests(TestCase):
    def setUp(self):
        # AnonRateThrottle counts requests in Django's cache, which (unlike
        # the DB) TestCase does NOT reset between tests — without this,
        # send-otp calls from earlier tests count against later ones' 5/min
        # cap and start returning 429s unrelated to what's under test.
        cache.clear()

    def test_rejects_too_short_number(self):
        response = self.client.post('/api/auth/send-otp/', {'phone': '98765'}, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_rejects_number_with_invalid_first_digit(self):
        response = self.client.post(
            '/api/auth/send-otp/', {'phone': '5432109876'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_rejects_letters(self):
        response = self.client.post(
            '/api/auth/send-otp/', {'phone': 'abcdefghij'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    @patch('accounts.views.sms.send_otp_sms')
    def test_accepts_valid_e164_number(self, mock_send):
        _register_customer('9876543210')
        response = self.client.post(
            '/api/auth/send-otp/', {'phone': '+919876543210'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        mock_send.assert_called_once()
        phone_arg = mock_send.call_args[0][0]
        self.assertEqual(phone_arg, '9876543210')

    @patch('accounts.views.sms.send_otp_sms')
    def test_resend_before_cooldown_is_rejected(self, mock_send):
        _register_customer('9876543210')
        self.client.post('/api/auth/send-otp/', {'phone': '+919876543210'}, content_type='application/json')
        response = self.client.post(
            '/api/auth/send-otp/', {'phone': '+919876543210'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 429)


class VerifyOtpTests(TestCase):
    def setUp(self):
        cache.clear()

    @patch('accounts.views.sms.send_otp_sms')
    def test_full_login_flow_establishes_session(self, mock_send):
        _register_customer('9876543210')
        self.client.post('/api/auth/send-otp/', {'phone': '+919876543210'}, content_type='application/json')
        code = mock_send.call_args[0][1]

        response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone': '+919876543210', 'otp': code},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['user']['phone'], '9876543210')

    @patch('accounts.views.sms.send_otp_sms')
    def test_incorrect_otp_is_rejected(self, mock_send):
        _register_customer('9876543210')
        self.client.post('/api/auth/send-otp/', {'phone': '+919876543210'}, content_type='application/json')
        response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone': '+919876543210', 'otp': '000000'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'otp_invalid')

    def test_verify_without_a_prior_send_is_rejected(self):
        _register_customer('9876543210')
        response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone': '+919876543210', 'otp': '123456'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'otp_not_found')

    def test_send_otp_rejects_a_number_with_no_account(self):
        # Login no longer auto-provisions — a number that never completed
        # Signup must be told to sign up instead of silently getting an OTP.
        response = self.client.post(
            '/api/auth/send-otp/', {'phone': '+919876543210'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['code'], 'not_registered')

    def test_send_otp_rejects_a_bare_user_that_never_completed_signup(self):
        # A leftover bare user row (e.g. from data created before this
        # gating existed) still isn't a registered customer without a
        # Customer row — same distinction _has_completed_signup always made.
        get_user_model().objects.create(username='9876543210')
        response = self.client.post(
            '/api/auth/send-otp/', {'phone': '+919876543210'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['code'], 'not_registered')


class SignupFlowTests(TestCase):
    def setUp(self):
        cache.clear()

    def _send_and_capture_code(self, mock_send, phone='+919876543210'):
        self.client.post('/api/auth/signup/send-otp/', {'phone': phone}, content_type='application/json')
        return mock_send.call_args[0][1]

    @patch('accounts.views.sms.send_otp_sms')
    def test_full_signup_flow_creates_account_and_signs_in(self, mock_send):
        code = self._send_and_capture_code(mock_send)

        verify_response = self.client.post(
            '/api/auth/signup/verify-otp/',
            {'phone': '+919876543210', 'otp': code},
            content_type='application/json',
        )
        self.assertEqual(verify_response.status_code, 200)
        token = verify_response.json()['verification_token']

        create_response = self.client.post(
            '/api/auth/signup/create-account/',
            {'verification_token': token, 'full_name': 'Jane Doe', 'email': 'jane@example.com'},
            content_type='application/json',
        )
        self.assertEqual(create_response.status_code, 200)
        body = create_response.json()
        self.assertEqual(body['user']['phone'], '9876543210')
        self.assertEqual(body['user']['email'], 'jane@example.com')
        # login() succeeded — the session cookie is set for the created user.
        self.assertIn('sessionid', create_response.cookies)

    @patch('accounts.views.sms.send_otp_sms')
    def test_signup_send_otp_rejects_a_number_with_a_completed_account(self, mock_send):
        code = self._send_and_capture_code(mock_send)
        verify_response = self.client.post(
            '/api/auth/signup/verify-otp/',
            {'phone': '+919876543210', 'otp': code},
            content_type='application/json',
        )
        token = verify_response.json()['verification_token']
        self.client.post(
            '/api/auth/signup/create-account/',
            {'verification_token': token, 'full_name': 'Jane Doe', 'email': 'jane@example.com'},
            content_type='application/json',
        )

        cache.clear()  # only resetting the throttle, not the DB — the account must still block a repeat signup
        response = self.client.post(
            '/api/auth/signup/send-otp/', {'phone': '+919876543210'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()['code'], 'account_exists')

    def test_signup_send_otp_allows_a_number_that_only_ever_logged_in(self):
        # A bare user (unusable password, no email) from the plain login flow
        # must not block that same number from completing Signup.
        get_user_model().objects.create(username='9876543210')
        with patch('accounts.views.sms.send_otp_sms'):
            response = self.client.post(
                '/api/auth/signup/send-otp/', {'phone': '+919876543210'}, content_type='application/json'
            )
        self.assertEqual(response.status_code, 200)

    def test_create_account_rejects_an_invalid_verification_token(self):
        response = self.client.post(
            '/api/auth/signup/create-account/',
            {'verification_token': 'not-a-real-token', 'full_name': 'Jane Doe', 'email': 'jane@example.com'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'verification_invalid')

    @patch('accounts.views.sms.send_otp_sms')
    def test_create_account_rejects_a_duplicate_email(self, mock_send):
        get_user_model().objects.create(username='9111111111', email='taken@example.com')

        code = self._send_and_capture_code(mock_send)
        verify_response = self.client.post(
            '/api/auth/signup/verify-otp/',
            {'phone': '+919876543210', 'otp': code},
            content_type='application/json',
        )
        token = verify_response.json()['verification_token']

        response = self.client.post(
            '/api/auth/signup/create-account/',
            {'verification_token': token, 'full_name': 'Jane Doe', 'email': 'taken@example.com'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()['code'], 'email_exists')

    @patch('accounts.views.sms.send_otp_sms')
    def test_completing_signup_creates_a_customer_row(self, mock_send):
        code = self._send_and_capture_code(mock_send)
        verify_response = self.client.post(
            '/api/auth/signup/verify-otp/',
            {'phone': '+919876543210', 'otp': code},
            content_type='application/json',
        )
        token = verify_response.json()['verification_token']

        self.client.post(
            '/api/auth/signup/create-account/',
            {'verification_token': token, 'full_name': 'Jane Doe', 'email': 'jane@example.com'},
            content_type='application/json',
        )

        customer = Customer.objects.get(mobile_number='+919876543210')
        self.assertEqual(customer.name, 'Jane Doe')
        self.assertEqual(customer.email, 'jane@example.com')
        self.assertTrue(customer.is_active)
        self.assertFalse(customer.is_staff)


class OtpPurposeIsolationTests(TestCase):
    """A login OTP and a registration OTP for the same phone must never be
    interchangeable — see PhoneOTP.purpose and views.py's _issue_otp/
    _consume_otp, both scoped to (phone, purpose)."""

    def setUp(self):
        cache.clear()

    def test_login_otp_cannot_verify_the_signup_endpoint(self):
        # A LOGIN-purpose OTP is created directly here (bypassing send_otp's
        # own "must already be registered" gate, which for an unregistered
        # number makes this scenario unreachable through the public API —
        # see SendOtpTests). That gate is a separate, additional safeguard;
        # it doesn't change what _consume_otp itself must still guarantee on
        # its own: a purpose mismatch is rejected no matter how the OTP came
        # to exist.
        PhoneOTP.objects.create(
            phone='9876543210',
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code_hash=make_password('111111'),
            expires_at=timezone.now() + timezone.timedelta(minutes=5),
        )

        response = self.client.post(
            '/api/auth/signup/verify-otp/',
            {'phone': '+919876543210', 'otp': '111111'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'otp_not_found')

    @patch('accounts.views.sms.send_otp_sms')
    def test_signup_otp_cannot_verify_the_login_endpoint(self, mock_send):
        self.client.post('/api/auth/signup/send-otp/', {'phone': '+919876543210'}, content_type='application/json')
        signup_code = mock_send.call_args[0][1]

        response = self.client.post(
            '/api/auth/verify-otp/',
            {'phone': '+919876543210', 'otp': signup_code},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'otp_not_found')


class CustomerProfileTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_requires_authentication(self):
        response = self.client.get('/api/customer/profile/')
        self.assertEqual(response.status_code, 403)

    def test_get_returns_own_profile(self):
        customer = _register_customer('9876543210', name='Asha Menon', email='asha@example.com')
        self.client.force_login(customer.user)

        response = self.client.get('/api/customer/profile/')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['name'], 'Asha Menon')
        self.assertEqual(body['email'], 'asha@example.com')
        self.assertEqual(body['mobile_number'], '+919876543210')

    def test_patch_updates_name_and_email(self):
        customer = _register_customer('9876543210')
        self.client.force_login(customer.user)

        response = self.client.patch(
            '/api/customer/profile/',
            {'name': 'New Name', 'email': 'new@example.com'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        customer.refresh_from_db()
        self.assertEqual(customer.name, 'New Name')
        self.assertEqual(customer.email, 'new@example.com')

    def test_patch_ignores_mobile_number(self):
        # mobile_number is read-only on this serializer by design — only the
        # OTP-gated change-mobile endpoints may change it.
        customer = _register_customer('9876543210')
        self.client.force_login(customer.user)

        response = self.client.patch(
            '/api/customer/profile/',
            {'name': 'New Name', 'mobile_number': '+919000000000'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        customer.refresh_from_db()
        self.assertEqual(customer.mobile_number, '+919876543210')

    def test_patch_rejects_invalid_email(self):
        customer = _register_customer('9876543210')
        self.client.force_login(customer.user)

        response = self.client.patch(
            '/api/customer/profile/', {'email': 'not-an-email'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_one_customer_cannot_see_anothers_profile(self):
        _register_customer('9876543210', name='Customer A')
        customer_b = _register_customer('9111111111', name='Customer B')
        self.client.force_login(customer_b.user)

        response = self.client.get('/api/customer/profile/')
        self.assertEqual(response.json()['name'], 'Customer B')


class CustomerAddressTests(TestCase):
    def setUp(self):
        cache.clear()

    def _address_payload(self, **overrides):
        payload = {
            'address_line': '123 Main Street',
            'city': 'Kochi',
            'state': 'Kerala',
            'pincode': '682001',
        }
        payload.update(overrides)
        return payload

    def test_requires_authentication(self):
        response = self.client.get('/api/customer/address/')
        self.assertEqual(response.status_code, 403)

    def test_get_with_no_address_returns_404(self):
        customer = _register_customer('9876543210')
        self.client.force_login(customer.user)

        response = self.client.get('/api/customer/address/')
        self.assertEqual(response.status_code, 404)

    def test_create_get_update_delete_cycle(self):
        customer = _register_customer('9876543210')
        self.client.force_login(customer.user)

        create_response = self.client.post(
            '/api/customer/address/', self._address_payload(), content_type='application/json'
        )
        self.assertEqual(create_response.status_code, 201)

        get_response = self.client.get('/api/customer/address/')
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.json()['city'], 'Kochi')

        # A second POST while one already exists is rejected...
        duplicate_response = self.client.post(
            '/api/customer/address/', self._address_payload(), content_type='application/json'
        )
        self.assertEqual(duplicate_response.status_code, 409)

        # ...PATCH is how an existing address gets updated instead.
        patch_response = self.client.patch(
            '/api/customer/address/', {'city': 'Thrissur'}, content_type='application/json'
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.json()['city'], 'Thrissur')

        delete_response = self.client.delete('/api/customer/address/')
        self.assertEqual(delete_response.status_code, 204)
        self.assertEqual(self.client.get('/api/customer/address/').status_code, 404)

    def test_rejects_invalid_pincode(self):
        customer = _register_customer('9876543210')
        self.client.force_login(customer.user)

        response = self.client.post(
            '/api/customer/address/', self._address_payload(pincode='123'), content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_one_customer_cannot_see_anothers_address(self):
        customer_a = _register_customer('9876543210')
        self.client.force_login(customer_a.user)
        self.client.post('/api/customer/address/', self._address_payload(city='Kochi'), content_type='application/json')
        self.client.logout()

        customer_b = _register_customer('9111111111')
        self.client.force_login(customer_b.user)
        response = self.client.get('/api/customer/address/')
        self.assertEqual(response.status_code, 404)  # B has no address of their own


class LogoutTests(TestCase):
    def test_requires_authentication(self):
        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, 403)

    def test_logout_ends_the_session(self):
        customer = _register_customer('9876543210')
        self.client.force_login(customer.user)
        self.assertEqual(self.client.get('/api/customer/profile/').status_code, 200)

        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, 200)

        # The session is gone server-side, not just a client-side cookie
        # concern — a subsequent request is anonymous again.
        self.assertEqual(self.client.get('/api/customer/profile/').status_code, 403)


class ChangeMobileTests(TestCase):
    def setUp(self):
        cache.clear()

    @patch('accounts.views.sms.send_otp_sms')
    def test_full_change_mobile_flow(self, mock_send):
        customer = _register_customer('9876543210')
        self.client.force_login(customer.user)

        send_response = self.client.post(
            '/api/auth/change-mobile/send-otp/', {'phone': '+919000011111'}, content_type='application/json'
        )
        self.assertEqual(send_response.status_code, 200)
        code = mock_send.call_args[0][1]
        self.assertEqual(mock_send.call_args[0][2], PhoneOTP.PURPOSE_CHANGE_MOBILE)

        verify_response = self.client.post(
            '/api/auth/change-mobile/verify-otp/',
            {'phone': '+919000011111', 'otp': code},
            content_type='application/json',
        )
        self.assertEqual(verify_response.status_code, 200)
        self.assertEqual(verify_response.json()['mobile_number'], '+919000011111')

        customer.refresh_from_db()
        customer.user.refresh_from_db()
        self.assertEqual(customer.mobile_number, '+919000011111')
        self.assertEqual(customer.user.username, '9000011111')

        # The session survived the username change — still authenticated.
        self.assertEqual(self.client.get('/api/customer/profile/').status_code, 200)

    def test_requires_authentication(self):
        response = self.client.post(
            '/api/auth/change-mobile/send-otp/', {'phone': '+919000011111'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 403)

    @patch('accounts.views.sms.send_otp_sms')
    def test_rejects_a_number_already_taken_by_another_customer(self, mock_send):
        _register_customer('9111111111')  # already-taken number
        customer = _register_customer('9876543210')
        self.client.force_login(customer.user)

        response = self.client.post(
            '/api/auth/change-mobile/send-otp/', {'phone': '+919111111111'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    @patch('accounts.views.sms.send_otp_sms')
    def test_allows_resubmitting_own_current_number(self, mock_send):
        # Not blocked by the "already taken" check against itself.
        customer = _register_customer('9876543210')
        self.client.force_login(customer.user)

        response = self.client.post(
            '/api/auth/change-mobile/send-otp/', {'phone': '+919876543210'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)


def _make_admin(username='admin-test'):
    user = get_user_model().objects.create(username=username, is_staff=True, is_superuser=True)
    user.set_password('x')
    user.save()
    return user


def _technician_payload(**overrides):
    payload = {
        'name': 'Arun Kumar',
        'mobile_number': '+919812345678',
        'email': 'arun.kumar@example.com',
        'date_of_birth': '1995-06-15',
        'address_line': '12 Marine Drive',
        'city': 'Kochi',
        'state': 'Kerala',
        'pincode': '682031',
        'specialization': 'ac',
        'experience_years': 3,
    }
    payload.update(overrides)
    return payload


class TechnicianManagementTests(TestCase):
    """Admin-only technician CRUD (views.py's technician_list_create/
    technician_detail/technician_activate/technician_deactivate)."""

    def setUp(self):
        cache.clear()

    def test_requires_admin_for_every_endpoint(self):
        customer = _register_customer('9111111111')
        self.client.force_login(customer.user)

        self.assertEqual(self.client.get('/api/admin/technicians/').status_code, 403)
        self.assertEqual(
            self.client.post('/api/admin/technicians/', _technician_payload(), content_type='application/json').status_code,
            403,
        )

    def test_anonymous_is_rejected_too(self):
        self.assertEqual(self.client.get('/api/admin/technicians/').status_code, 403)

    def test_admin_can_create_technician_with_role_forced_to_technician(self):
        admin = _make_admin()
        self.client.force_login(admin)

        response = self.client.post(
            '/api/admin/technicians/', _technician_payload(), content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body['name'], 'Arun Kumar')
        self.assertEqual(body['mobile_number'], '+919812345678')
        self.assertTrue(body['is_active'])

        technician = TechnicianProfile.objects.get(mobile_number='+919812345678')
        self.assertEqual(technician.user.username, '9812345678')
        self.assertEqual(UserProfile.objects.get(user=technician.user).role, UserProfile.ROLE_TECHNICIAN)

    def test_client_supplied_role_is_ignored(self):
        # No `role` field exists on the serializer at all — this proves a
        # client can't smuggle one in and have it do anything.
        admin = _make_admin()
        self.client.force_login(admin)

        response = self.client.post(
            '/api/admin/technicians/',
            _technician_payload(role='admin'),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        technician = TechnicianProfile.objects.get(mobile_number='+919812345678')
        self.assertEqual(UserProfile.objects.get(user=technician.user).role, UserProfile.ROLE_TECHNICIAN)
        self.assertFalse(technician.user.is_staff)

    def test_accepts_multiple_specializations(self):
        admin = _make_admin()
        self.client.force_login(admin)

        response = self.client.post(
            '/api/admin/technicians/',
            _technician_payload(specialization='ac,refrigerator'),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['specialization'], 'ac,refrigerator')

        technician = TechnicianProfile.objects.get(mobile_number='+919812345678')
        self.assertEqual(technician.specialization_list, ['ac', 'refrigerator'])
        self.assertEqual(technician.specialization_display, 'AC, Refrigerator')

    def test_rejects_an_invalid_specialization_key(self):
        admin = _make_admin()
        self.client.force_login(admin)

        response = self.client.post(
            '/api/admin/technicians/',
            _technician_payload(specialization='ac,not-a-real-category'),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(TechnicianProfile.objects.filter(mobile_number='+919812345678').exists())

    def test_rejects_an_empty_specialization(self):
        admin = _make_admin()
        self.client.force_login(admin)

        response = self.client.post(
            '/api/admin/technicians/', _technician_payload(specialization=''), content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_rejects_duplicate_phone(self):
        admin = _make_admin()
        self.client.force_login(admin)
        _register_customer('9812345678')  # same number, already a customer

        response = self.client.post(
            '/api/admin/technicians/', _technician_payload(), content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_rejects_duplicate_email(self):
        admin = _make_admin()
        self.client.force_login(admin)
        _register_customer('9111111111', email='arun.kumar@example.com')

        response = self.client.post(
            '/api/admin/technicians/', _technician_payload(), content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_rejects_future_date_of_birth(self):
        admin = _make_admin()
        self.client.force_login(admin)

        response = self.client.post(
            '/api/admin/technicians/', _technician_payload(date_of_birth='2099-01-01'), content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_rejects_under_18(self):
        admin = _make_admin()
        self.client.force_login(admin)
        recent = timezone.now().date().replace(year=timezone.now().date().year - 5)

        response = self.client.post(
            '/api/admin/technicians/',
            _technician_payload(date_of_birth=recent.isoformat()),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_list_and_detail(self):
        admin = _make_admin()
        self.client.force_login(admin)
        create_response = self.client.post(
            '/api/admin/technicians/', _technician_payload(), content_type='application/json'
        )
        technician_id = create_response.json()['id']

        list_response = self.client.get('/api/admin/technicians/')
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)

        detail_response = self.client.get(f'/api/admin/technicians/{technician_id}/')
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()['name'], 'Arun Kumar')

    def test_edit_technician_syncs_username(self):
        admin = _make_admin()
        self.client.force_login(admin)
        create_response = self.client.post(
            '/api/admin/technicians/', _technician_payload(), content_type='application/json'
        )
        technician_id = create_response.json()['id']

        patch_response = self.client.patch(
            f'/api/admin/technicians/{technician_id}/',
            {'mobile_number': '+919000011111'},
            content_type='application/json',
        )
        self.assertEqual(patch_response.status_code, 200)
        technician = TechnicianProfile.objects.get(pk=technician_id)
        self.assertEqual(technician.mobile_number, '+919000011111')
        self.assertEqual(technician.user.username, '9000011111')

    def test_activate_and_deactivate(self):
        admin = _make_admin()
        self.client.force_login(admin)
        create_response = self.client.post(
            '/api/admin/technicians/', _technician_payload(), content_type='application/json'
        )
        technician_id = create_response.json()['id']

        deactivate_response = self.client.post(f'/api/admin/technicians/{technician_id}/deactivate/')
        self.assertEqual(deactivate_response.status_code, 200)
        self.assertFalse(TechnicianProfile.objects.get(pk=technician_id).is_active)

        activate_response = self.client.post(f'/api/admin/technicians/{technician_id}/activate/')
        self.assertEqual(activate_response.status_code, 200)
        self.assertTrue(TechnicianProfile.objects.get(pk=technician_id).is_active)

    def test_profile_image_is_saved_and_returned(self):
        # Proves the wiring all the way through: TechnicianSerializer's
        # fields list -> create()'s **validated_data spread -> the model
        # column. Django Admin's own upload (TechnicianProfileAdminForm)
        # delegates to this exact same serializer (see its own docstring),
        # so this is also what proves that path works, without needing to
        # drive the full Admin HTML form here too.
        admin = _make_admin()
        self.client.force_login(admin)

        response = self.client.post(
            '/api/admin/technicians/',
            _technician_payload(profile_image=_tiny_jpeg()),
            format='multipart',
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['profile_image'])

        technician = TechnicianProfile.objects.get(mobile_number='+919812345678')
        self.assertTrue(technician.profile_image.name)

    def test_existing_customer_signup_and_login_still_work(self):
        # Sanity check that adding technician management didn't disturb the
        # existing Customer flows — a fuller regression already lives in
        # SignupFlowTests/VerifyOtpTests; this just confirms role bookkeeping
        # doesn't interfere with them.
        customer = _register_customer('9333333333')
        self.client.force_login(customer.user)
        self.assertEqual(self.client.get('/api/customer/profile/').status_code, 200)


class TechnicianAuthTests(TestCase):
    """Technician OTP login (views.py's technician_send_otp/
    technician_verify_otp/technician_profile) — same PhoneOTP model and
    _issue_otp/_consume_otp helpers as customer login, scoped by
    PURPOSE_TECHNICIAN_LOGIN instead of PURPOSE_LOGIN."""

    def setUp(self):
        cache.clear()

    @patch('accounts.views.sms.send_otp_sms')
    def test_send_otp_happy_path_never_leaks_the_code(self, mock_send):
        _register_technician('9812345678', name='Arun Kumar')
        response = self.client.post(
            '/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertNotIn('otp', body)
        self.assertNotIn('code', body)

        mock_send.assert_called_once()
        args, kwargs = mock_send.call_args
        self.assertEqual(args[0], '9812345678')
        self.assertEqual(args[2], PhoneOTP.PURPOSE_TECHNICIAN_LOGIN)
        # The dev-console banner includes the technician's name — see
        # sms.py's send_otp_sms — so the view must pass it through.
        self.assertEqual(kwargs.get('recipient_name'), 'Arun Kumar')

    def test_send_otp_rejects_a_number_with_no_technician_account(self):
        response = self.client.post(
            '/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['code'], 'not_registered')

    def test_send_otp_rejects_a_registered_customer_number(self):
        # A customer's number has no TechnicianProfile row — must be treated
        # exactly like an unregistered number, not silently accepted.
        _register_customer('9812345678')
        response = self.client.post(
            '/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['code'], 'not_registered')

    def test_send_otp_rejects_an_inactive_technician(self):
        _register_technician('9812345678', is_active=False)
        response = self.client.post(
            '/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['code'], 'technician_inactive')

    def test_rejects_invalid_indian_mobile_number(self):
        response = self.client.post(
            '/api/technician/auth/send-otp/', {'phone': '12345'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    @patch('accounts.views.sms.send_otp_sms')
    def test_full_login_flow_establishes_session_and_returns_safe_data(self, mock_send):
        technician = _register_technician('9812345678', name='Arun Kumar', email='arun@example.com')
        self.client.post('/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json')
        code = mock_send.call_args[0][1]

        response = self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': code},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['technician']['name'], 'Arun Kumar')
        self.assertEqual(body['technician']['mobile_number'], '+919812345678')
        self.assertTrue(body['technician']['is_active'])
        # "Safe" data only — no date_of_birth, unlike the admin-only
        # TechnicianSerializer. address_line/pincode ARE included (unlike
        # date_of_birth) — TechnicianProfilePage.tsx's self-service edit
        # form needs them, see TechnicianSelfSerializer's own docstring.
        self.assertNotIn('date_of_birth', body['technician'])
        self.assertEqual(body['technician']['address_line'], '1 Depot Road')
        self.assertEqual(body['technician']['pincode'], '682001')

        # Session cookie actually set — the technician can now reach their
        # own profile.
        profile_response = self.client.get('/api/technician/profile/')
        self.assertEqual(profile_response.status_code, 200)
        self.assertEqual(profile_response.json()['name'], 'Arun Kumar')
        self.assertEqual(technician.user.username, '9812345678')

    @patch('accounts.views.sms.send_otp_sms')
    def test_incorrect_otp_is_rejected_with_attempts_remaining(self, mock_send):
        _register_technician('9812345678')
        self.client.post('/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json')

        response = self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': '000000'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'otp_invalid')
        self.assertIn('attempts_remaining', response.json())
        # An incorrect attempt must not establish a session.
        self.assertEqual(self.client.get('/api/technician/profile/').status_code, 403)

    def test_verify_without_a_prior_send_is_rejected(self):
        _register_technician('9812345678')
        response = self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': '123456'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'otp_not_found')

    @patch('accounts.views.sms.send_otp_sms')
    def test_expired_otp_is_rejected(self, mock_send):
        _register_technician('9812345678')
        self.client.post('/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json')
        code = mock_send.call_args[0][1]

        # Backdate the OTP past its expiry rather than sleeping the test.
        otp = PhoneOTP.objects.filter(phone='9812345678', purpose=PhoneOTP.PURPOSE_TECHNICIAN_LOGIN).latest('created_at')
        otp.expires_at = timezone.now() - timezone.timedelta(seconds=1)
        otp.save(update_fields=['expires_at'])

        response = self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': code},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'otp_expired')

    @patch('accounts.views.sms.send_otp_sms')
    def test_reused_otp_is_rejected(self, mock_send):
        _register_technician('9812345678')
        self.client.post('/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json')
        code = mock_send.call_args[0][1]

        first = self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': code},
            content_type='application/json',
        )
        self.assertEqual(first.status_code, 200)
        self.client.post('/api/auth/logout/')

        second = self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': code},
            content_type='application/json',
        )
        self.assertEqual(second.status_code, 400)
        self.assertEqual(second.json()['code'], 'otp_not_found')

    @patch('accounts.views.sms.send_otp_sms')
    def test_too_many_incorrect_attempts_locks_the_otp(self, mock_send):
        _register_technician('9812345678')
        self.client.post('/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json')

        for _ in range(5):
            self.client.post(
                '/api/technician/auth/verify-otp/',
                {'phone': '+919812345678', 'otp': '000000'},
                content_type='application/json',
            )

        code = mock_send.call_args[0][1]
        response = self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': code},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json()['code'], 'otp_locked')

    @patch('accounts.views.sms.send_otp_sms')
    def test_deactivating_after_send_blocks_verify(self, mock_send):
        technician = _register_technician('9812345678')
        self.client.post('/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json')
        code = mock_send.call_args[0][1]

        technician.user.is_active = False
        technician.user.save(update_fields=['is_active'])

        response = self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': code},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['code'], 'technician_inactive')

    @patch('accounts.views.sms.send_otp_sms')
    def test_deactivating_after_login_revokes_dashboard_access(self, mock_send):
        technician = _register_technician('9812345678')
        self.client.post('/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json')
        code = mock_send.call_args[0][1]
        self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': code},
            content_type='application/json',
        )
        self.assertEqual(self.client.get('/api/technician/profile/').status_code, 200)

        technician.user.is_active = False
        technician.user.save(update_fields=['is_active'])

        # DRF's own SessionAuthentication already treats an inactive user's
        # session as unauthenticated (see technician_profile's own
        # docstring) — a plain 403 from IsAuthenticated, not a custom
        # 'technician_inactive' body (that's only reachable pre-login, from
        # technician_send_otp/technician_verify_otp, which do carry it — see
        # test_deactivating_after_send_blocks_verify above).
        response = self.client.get('/api/technician/profile/')
        self.assertEqual(response.status_code, 403)

    def test_technician_profile_requires_authentication(self):
        response = self.client.get('/api/technician/profile/')
        self.assertEqual(response.status_code, 403)

    def test_customer_session_cannot_access_technician_profile(self):
        # The central "clearly distinguish customer auth from technician
        # auth" requirement: a customer's own session must never resolve as
        # a technician one.
        customer = _register_customer('9111111111')
        self.client.force_login(customer.user)

        response = self.client.get('/api/technician/profile/')
        self.assertEqual(response.status_code, 404)

    @patch('accounts.views.sms.send_otp_sms')
    def test_technician_session_cannot_access_customer_profile(self, mock_send):
        # And the reverse: a technician session must never resolve as a
        # customer one.
        _register_technician('9812345678')
        self.client.post('/api/technician/auth/send-otp/', {'phone': '+919812345678'}, content_type='application/json')
        code = mock_send.call_args[0][1]
        self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': code},
            content_type='application/json',
        )

        response = self.client.get('/api/customer/profile/')
        self.assertEqual(response.status_code, 404)

    def test_technician_can_patch_own_profile(self):
        # The bug this covers: TechnicianProfilePage.tsx's "Save Changes"
        # used to only update local React state — nothing was ever sent to
        # the backend, so an edit silently reverted on reload. This is the
        # PATCH it now calls.
        technician = _register_technician('9812345678', name='Arun Kumar', email='arun@example.com')
        self.client.force_login(technician.user)

        response = self.client.patch(
            '/api/technician/profile/',
            {
                'name': 'Arun K. Nair',
                'email': 'arun.nair@example.com',
                'address_line': '9 Marine Drive',
                'city': 'Ernakulam',
                'state': 'Kerala',
                'pincode': '682011',
                'experience_years': 7,
            },
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['name'], 'Arun K. Nair')
        self.assertEqual(body['email'], 'arun.nair@example.com')
        self.assertEqual(body['address_line'], '9 Marine Drive')
        self.assertEqual(body['pincode'], '682011')
        self.assertEqual(body['experience_years'], 7)

        # Actually persisted, not just echoed back in the response — and
        # User.first_name/email stay in sync, same pairing the admin-only
        # TechnicianSerializer.update() already maintains.
        technician.refresh_from_db()
        self.assertEqual(technician.name, 'Arun K. Nair')
        self.assertEqual(technician.city, 'Ernakulam')
        technician.user.refresh_from_db()
        self.assertEqual(technician.user.first_name, 'Arun K. Nair')
        self.assertEqual(technician.user.email, 'arun.nair@example.com')

    def test_technician_profile_patch_cannot_change_protected_fields(self):
        # mobile_number/specialization/is_active are read-only on this
        # self-service endpoint — changing them is the admin's job
        # (technician_detail/_activate/_deactivate), never a plain PATCH
        # here, no matter what the request body includes.
        technician = _register_technician('9812345678')
        self.client.force_login(technician.user)

        response = self.client.patch(
            '/api/technician/profile/',
            {'mobile_number': '+919999999999', 'specialization': TechnicianProfile.SPECIALIZATION_MICROWAVE, 'is_active': False},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

        technician.refresh_from_db()
        self.assertEqual(technician.mobile_number, '+919812345678')
        self.assertEqual(technician.specialization, TechnicianProfile.SPECIALIZATION_AC)
        self.assertTrue(technician.is_active)

    def test_technician_profile_patch_requires_authentication(self):
        response = self.client.patch('/api/technician/profile/', {'name': 'Nobody'}, content_type='application/json')
        self.assertEqual(response.status_code, 403)


class TechnicianAdminFormTests(TestCase):
    """Django Admin's Add/Edit technician form (admin.py's
    TechnicianProfileAdminForm/TechnicianProfileAdmin) — separate from
    TechnicianManagementTests above, which exercises the same underlying
    TechnicianSerializer via the JSON/multipart API directly rather than
    through Django Admin's own HTML form and its ModelForm cleaned_data
    quirks."""

    def setUp(self):
        cache.clear()
        self.admin = _make_admin()
        self.client.force_login(self.admin)

    def _payload(self, **overrides):
        payload = {
            'name': 'Divya Nair',
            'mobile_number': '+919876500001',
            'email': 'divya@example.com',
            'date_of_birth': '1992-03-10',
            'address_line': '5 Lake View',
            'city': 'Kochi',
            'state': 'Kerala',
            'pincode': '682001',
            'specialization': 'refrigerator',
            'experience_years': 4,
            '_save': 'Save',
        }
        payload.update(overrides)
        return payload

    def test_changelist_renders(self):
        response = self.client.get('/admin/accounts/technicianprofile/')
        self.assertEqual(response.status_code, 200)

    def test_add_form_renders_with_profile_image_field(self):
        response = self.client.get('/admin/accounts/technicianprofile/add/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="profile_image"')

    def test_add_technician_without_an_image(self):
        # Regression test for a real bug caught during development: Django's
        # ModelForm always includes `profile_image` in cleaned_data (as None
        # when nothing was uploaded), which TechnicianSerializer's
        # ImageField (no null=True, matching the model column — see
        # TechnicianProfile's own docstring) used to reject outright with
        # "This field may not be null," even though the field is optional.
        # See TechnicianProfileAdminForm.clean()'s own comment for the fix.
        response = self.client.post('/admin/accounts/technicianprofile/add/', self._payload(), follow=True)
        self.assertEqual(response.status_code, 200)
        technician = TechnicianProfile.objects.filter(mobile_number='+919876500001').first()
        self.assertIsNotNone(technician, f'not created; response: {response.content[:2000]}')
        self.assertEqual(technician.name, 'Divya Nair')
        self.assertFalse(technician.profile_image)

    def test_add_technician_with_an_image(self):
        response = self.client.post(
            '/admin/accounts/technicianprofile/add/', self._payload(profile_image=_tiny_jpeg())
        )
        self.assertEqual(response.status_code, 302)
        technician = TechnicianProfile.objects.get(mobile_number='+919876500001')
        self.assertTrue(technician.profile_image.name)

    def test_add_form_renders_a_checkbox_per_specialization(self):
        response = self.client.get('/admin/accounts/technicianprofile/add/')
        self.assertContains(response, 'value="ac"')
        self.assertContains(response, 'value="refrigerator"')
        self.assertContains(response, 'value="washing-machine"')
        self.assertContains(response, 'value="microwave"')

    def test_add_technician_with_multiple_specializations_selected(self):
        response = self.client.post(
            '/admin/accounts/technicianprofile/add/',
            self._payload(specialization=['ac', 'refrigerator', 'microwave']),
        )
        self.assertEqual(response.status_code, 302, response.content[:2000])

        technician = TechnicianProfile.objects.get(mobile_number='+919876500001')
        self.assertEqual(technician.specialization_list, ['ac', 'refrigerator', 'microwave'])

    def test_add_technician_with_no_specialization_selected_is_rejected(self):
        response = self.client.post('/admin/accounts/technicianprofile/add/', self._payload(specialization=[]))
        self.assertEqual(response.status_code, 200)  # redisplays the form with an error, not a 302 redirect
        self.assertFalse(TechnicianProfile.objects.filter(mobile_number='+919876500001').exists())

    def test_edit_form_pre_checks_every_existing_specialization(self):
        self.client.post(
            '/admin/accounts/technicianprofile/add/', self._payload(specialization=['ac', 'washing-machine'])
        )
        technician = TechnicianProfile.objects.get(mobile_number='+919876500001')

        response = self.client.get(f'/admin/accounts/technicianprofile/{technician.pk}/change/')
        self.assertContains(response, 'value="ac" id="id_specialization_0" checked')
        self.assertContains(response, 'value="washing-machine" id="id_specialization_2" checked')
        self.assertNotContains(response, 'value="refrigerator" id="id_specialization_1" checked')
        self.assertNotContains(response, 'value="microwave" id="id_specialization_3" checked')

    def test_editing_other_fields_does_not_wipe_an_uploaded_image(self):
        self.client.post('/admin/accounts/technicianprofile/add/', self._payload(profile_image=_tiny_jpeg()))
        technician = TechnicianProfile.objects.get(mobile_number='+919876500001')
        original_image_name = technician.profile_image.name
        self.assertTrue(original_image_name)

        self.client.post(
            f'/admin/accounts/technicianprofile/{technician.pk}/change/',
            self._payload(name='Divya Nair Updated'),
        )
        technician.refresh_from_db()
        self.assertEqual(technician.name, 'Divya Nair Updated')
        self.assertEqual(technician.profile_image.name, original_image_name)


class OtpPurposeIsolationForTechnicianTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_a_login_purpose_otp_cannot_verify_technician_login(self):
        # PhoneOTP.purpose isolation, extended to the new technician_login
        # purpose — same guarantee OtpPurposeIsolationTests already proves
        # between login/registration. A PURPOSE_LOGIN OTP is created
        # directly here (a technician's own number can never actually reach
        # customer send_otp's PURPOSE_LOGIN path — it isn't a Customer — so
        # this simulates the only way such a row could exist) to prove
        # _consume_otp's purpose scoping holds regardless of how the row
        # came to exist, not just that the public API happens to avoid it.
        _register_technician('9812345678')
        PhoneOTP.objects.create(
            phone='9812345678',
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code_hash=make_password('111111'),
            expires_at=timezone.now() + timezone.timedelta(minutes=5),
        )

        response = self.client.post(
            '/api/technician/auth/verify-otp/',
            {'phone': '+919812345678', 'otp': '111111'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'otp_not_found')
