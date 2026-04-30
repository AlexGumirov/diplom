from django.urls import path

from . import frontend_views


urlpatterns = [
    path("", frontend_views.dashboard, name="dashboard"),
    path("athletes/", frontend_views.athletes, name="athletes-page"),
    path("records/", frontend_views.records, name="records-page"),
    path("physical/", frontend_views.physical, name="physical-page"),
    path("psychological/", frontend_views.psychological, name="psychological-page"),
    path("analysis/", frontend_views.analysis, name="analysis-page"),
    path("san/start/", frontend_views.san_start, name="san-start"),
    path("san/<int:test_id>/", frontend_views.san_test, name="san-test"),
    path("san/<int:test_id>/result/", frontend_views.san_result, name="san-result"),
]
