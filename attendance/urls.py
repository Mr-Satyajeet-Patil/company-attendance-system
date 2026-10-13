from django.urls import path
from . import views

urlpatterns = [
    # REST API endpoints
    path('api/kiosk/punch/', views.api_kiosk_punch, name='api_kiosk_punch'),
    path('api/dashboard/stats/', views.api_dashboard_stats, name='api_dashboard_stats'),
    path('api/records/', views.api_attendance_records, name='api_attendance_records'),
    path('api/leaves/', views.api_leaves, name='api_leaves'),
    path('api/export/csv/', views.api_export_csv, name='api_export_csv'),
    path('api/settings/', views.api_system_settings, name='api_system_settings'),

    # Legacy routes
    path('mark/', views.mark_attendance_page, name='mark_attendance_page'),
    path('recognize/', views.mark_attendance, name='mark_attendance'),
    path('dashboard/', views.attendance_dashboard, name='attendance_dashboard'),
    path('history/', views.attendance_history, name='attendance_history'),
    path('reports/', views.attendance_reports, name='attendance_reports'),
]