from django.urls import path
from django.contrib.auth.views import LogoutView

from . import frontend_views


urlpatterns = [
    path("login/", frontend_views.login_page, name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("", frontend_views.spa_index, name="app-home"),
    path("profile/", frontend_views.spa_index, name="app-profile"),
    path("psychology/", frontend_views.spa_index, name="app-psychology"),
    path("physics/", frontend_views.spa_index, name="app-physics"),
    path("overall/", frontend_views.spa_index, name="app-overall"),
    path("data-entry/", frontend_views.spa_index, name="app-data-entry"),
    path("profile/edit/", frontend_views.spa_index, name="app-profile-edit"),
    path("statistics/", frontend_views.spa_index, name="app-statistics"),
    path("diary/", frontend_views.spa_index, name="app-diary"),
    path("app-api/bootstrap/", frontend_views.app_bootstrap, name="app-bootstrap"),
    path("app-api/delta-analysis/", frontend_views.app_delta_analysis, name="app-delta-analysis"),
    path("app-api/correlations/", frontend_views.app_correlations, name="app-correlations"),
    path("app-api/physical/", frontend_views.save_physical_data, name="app-save-physical"),
    path("app-api/san/", frontend_views.submit_san_test, name="app-submit-san"),
]
