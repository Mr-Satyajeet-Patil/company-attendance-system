import os
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from django.views.static import serve


def serve_react(request):
    """
    Serves the modern React frontend SPA built with Vite.
    Falls back to legacy template view if dist is not built.
    """
    index_path = settings.BASE_DIR / 'frontend' / 'dist' / 'index.html'
    if index_path.exists():
        with open(index_path, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')

    from attendance.views import mark_attendance_page
    return mark_attendance_page(request)


urlpatterns = [
    path('admin/', admin.site.urls),

    # React SPA Static Assets (CSS / JS chunks)
    re_path(
        r'^assets/(?P<path>.*)$',
        serve,
        {'document_root': settings.BASE_DIR / 'frontend' / 'dist' / 'assets'}
    ),

    # Modern REST API Endpoints
    path('', include('attendance.urls')),
    path('employees/', include('employees.urls')),

    # Direct API prefixes
    path('api/attendance/', include('attendance.urls')),
    path('api/employees/', include('employees.urls')),

    # React SPA Views
    path('', serve_react, name='react_home'),
    path('kiosk/', serve_react, name='react_kiosk'),
    path('app/', serve_react, name='react_app'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)