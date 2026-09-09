from django.urls import path

from . import views

app_name = 'accounts'

# Mounted at bare 'api/' in config/urls.py (not 'api/auth/') — every path
# below carries its own full prefix so existing endpoint URLs stay exactly
# what they were (api/auth/send-otp/ etc.) while api/customer/... can exist
# alongside them from the same app, same urls module.
urlpatterns = [
    # --- Auth (OTP login/signup, unauthenticated) ---
    path('auth/send-otp/', views.send_otp, name='send-otp'),
    path('auth/verify-otp/', views.verify_otp, name='verify-otp'),
    path('auth/signup/send-otp/', views.signup_send_otp, name='signup-send-otp'),
    path('auth/signup/verify-otp/', views.signup_verify_otp, name='signup-verify-otp'),
    path('auth/signup/create-account/', views.signup_create_account, name='signup-create-account'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/change-mobile/send-otp/', views.change_mobile_send_otp, name='change-mobile-send-otp'),
    path('auth/change-mobile/verify-otp/', views.change_mobile_verify_otp, name='change-mobile-verify-otp'),
    # --- Customer (authenticated) ---
    path('customer/profile/', views.customer_profile, name='customer-profile'),
    path('customer/address/', views.customer_address, name='customer-address'),
    # --- Technician auth (OTP login, unauthenticated) + self profile ---
    # Logout is deliberately NOT duplicated here — POST auth/logout/ above
    # already just ends whatever session exists via Django's own logout(),
    # regardless of whether it belongs to a customer or a technician.
    path('technician/auth/send-otp/', views.technician_send_otp, name='technician-send-otp'),
    path('technician/auth/verify-otp/', views.technician_verify_otp, name='technician-verify-otp'),
    path('technician/profile/', views.technician_profile, name='technician-profile'),
    # --- Technician management (admin-only) ---
    path('admin/technicians/', views.technician_list_create, name='technician-list-create'),
    path('admin/technicians/<int:pk>/', views.technician_detail, name='technician-detail'),
    path('admin/technicians/<int:pk>/activate/', views.technician_activate, name='technician-activate'),
    path('admin/technicians/<int:pk>/deactivate/', views.technician_deactivate, name='technician-deactivate'),
]
