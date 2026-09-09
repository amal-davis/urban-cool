"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('bookings.urls')),
    # accounts.urls' own paths each carry their full prefix (auth/... or
    # customer/...) — see that file's header comment for why it's mounted
    # at bare 'api/' rather than 'api/auth/'.
    path('api/', include('accounts.urls')),
]

# Dev-only: serves MEDIA_ROOT at MEDIA_URL (booking complaint photos — see
# bookings/models.py's BookingImage). static() itself is already a no-op
# when DEBUG is False, but the guard is kept explicit rather than relying on
# that — a real deployment serves media through the webserver/object storage
# instead, never through Django.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
