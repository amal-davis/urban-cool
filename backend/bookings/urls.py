from django.urls import path

from . import views

app_name = 'bookings'

urlpatterns = [
    path('health/', views.health, name='health'),
    path('contact/', views.contact, name='contact'),
    path('services/', views.service_list, name='service-list'),
    path('services/<slug:slug>/', views.service_detail, name='service-detail'),
    # Lands at /api/customer/bookings/... — same api/customer/* namespace
    # accounts/urls.py's profile/address endpoints already use, even though
    # the views/models live in this app (both urls modules are mounted at
    # bare 'api/' in config/urls.py, independently contributing paths).
    path('customer/bookings/', views.customer_bookings, name='customer-bookings'),
    path('customer/bookings/<int:pk>/', views.booking_detail, name='booking-detail'),
    path('customer/bookings/<int:pk>/tracking/', views.booking_tracking, name='booking-tracking'),
    path('customer/notifications/', views.customer_notifications, name='customer-notifications'),
    path(
        'customer/notifications/<int:pk>/read/',
        views.customer_notification_mark_read,
        name='customer-notification-mark-read',
    ),
    path(
        'customer/notifications/mark-all-read/',
        views.customer_notifications_mark_all_read,
        name='customer-notifications-mark-all-read',
    ),
    # Same api/technician/* namespace accounts/urls.py's technician auth/
    # profile endpoints already use, even though this view/model live in
    # this app — same reasoning as api/customer/bookings/ above.
    path('technician/jobs/', views.technician_jobs, name='technician-jobs'),
    path('technician/jobs/<int:pk>/', views.technician_job_detail, name='technician-job-detail'),
    path('technician/jobs/<int:pk>/status/', views.technician_job_update_status, name='technician-job-update-status'),
    path('technician/performance/', views.technician_performance, name='technician-performance'),
    path('technician/notifications/', views.technician_notifications, name='technician-notifications'),
    path(
        'technician/notifications/mark-read/',
        views.technician_notifications_mark_read,
        name='technician-notifications-mark-read',
    ),
    path('technician/earnings/', views.technician_earnings, name='technician-earnings'),
]
