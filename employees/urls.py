
from django.urls import path
from . import views

urlpatterns = [
    path('', views.employee_list, name='employee_list'),
    path(
        'register-face/<int:employee_id>/',
        views.register_face,
        name='register_face'
    ),
]