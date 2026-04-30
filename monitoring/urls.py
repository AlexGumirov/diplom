from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AnalysisViewSet,
    AthleteProfileViewSet,
    DailyRecordViewSet,
    PhysicalDataViewSet,
    PsychologicalDataViewSet,
    StateScoreViewSet,
)


router = DefaultRouter()
router.register("athletes", AthleteProfileViewSet, basename="athlete-profile")
router.register("daily-records", DailyRecordViewSet, basename="daily-record")
router.register("physical-data", PhysicalDataViewSet, basename="physical-data")
router.register("psychological-data", PsychologicalDataViewSet, basename="psychological-data")
router.register("state-scores", StateScoreViewSet, basename="state-score")
router.register("analysis", AnalysisViewSet, basename="analysis")

urlpatterns = [
    path("", include(router.urls)),
]
