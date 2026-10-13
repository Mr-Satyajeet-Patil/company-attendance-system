from django.urls import path
from . import views

urlpatterns = [
    # REST API endpoints
    path('api/list/', views.api_employees, name='api_employees'),
    path('api/<int:employee_id>/', views.api_employee_detail, name='api_employee_detail'),
    path('api/<int:employee_id>/register-faces/', views.api_register_multi_face, name='api_register_multi_face'),
    path('api/departments/', views.api_departments, name='api_departments'),
    path('api/shifts/', views.api_shifts, name='api_shifts'),

    # Legacy routes
    path('', views.employee_list, name='employee_list'),
    path('register-face/<int:employee_id>/', views.register_face, name='register_face'),
]