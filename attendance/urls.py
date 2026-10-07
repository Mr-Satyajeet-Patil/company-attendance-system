from django.urls import path
from . import views

urlpatterns = [

    path(
        'mark/',
        views.mark_attendance_page,
        name='mark_attendance_page'
    ),

    path(
        'recognize/',
        views.mark_attendance,
        name='mark_attendance'
    ),

]