import pandas as pd
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    AthleteProfile,
    DailyRecord,
    PhysicalData,
    PsychologicalData,
    StateScore,
)
from .serializers import (
    AthleteProfileSerializer,
    DailyRecordSerializer,
    PhysicalDataSerializer,
    PsychologicalDataSerializer,
    StateScoreSerializer,
)
from .services.analysis import (
    aggregated_delta,
    anomaly_detection,
    build_anomaly_report,
    build_correlation_report,
    correlation_analysis,
    delta_analysis,
    delta_between_neighbors,
)
from .services.calculations import calculate_record_scores


class CurrentUserDataMixin:
    permission_classes = [permissions.IsAuthenticated]

    def get_profile(self):
        profile, _ = AthleteProfile.objects.get_or_create(user=self.request.user)
        return profile


class AthleteProfileViewSet(CurrentUserDataMixin, viewsets.ModelViewSet):
    serializer_class = AthleteProfileSerializer

    def get_queryset(self):
        return AthleteProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DailyRecordViewSet(CurrentUserDataMixin, viewsets.ModelViewSet):
    serializer_class = DailyRecordSerializer

    def get_queryset(self):
        return (
            DailyRecord.objects.filter(athlete_profile__user=self.request.user)
            .select_related(
                "athlete_profile",
                "athlete_profile__user",
                "physical_data",
                "psychological_data",
                "state_score",
            )
            .all()
        )

    def perform_create(self, serializer):
        profile = serializer.validated_data.get("athlete_profile") or self.get_profile()
        serializer.save(athlete_profile=profile)

    @action(detail=True, methods=["post"])
    def calculate(self, request, pk=None):
        daily_record = self.get_object()
        if not hasattr(daily_record, "physical_data") or not hasattr(
            daily_record, "psychological_data"
        ):
            return Response(
                {"detail": "Physical and psychological data are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scores = calculate_record_scores(daily_record)
        return Response(scores)

    @action(detail=True, methods=["get"])
    def delta(self, request, pk=None):
        current = self.get_object()
        previous = (
            DailyRecord.objects.filter(
                athlete_profile=current.athlete_profile,
                date__lt=current.date,
                state_score__isnull=False,
            )
            .select_related("state_score")
            .order_by("-date")
            .first()
        )
        return Response(delta_analysis(current, previous))


class PhysicalDataViewSet(CurrentUserDataMixin, viewsets.ModelViewSet):
    serializer_class = PhysicalDataSerializer

    def get_queryset(self):
        return PhysicalData.objects.filter(
            daily_record__athlete_profile__user=self.request.user
        ).select_related("daily_record", "daily_record__athlete_profile")


class PsychologicalDataViewSet(CurrentUserDataMixin, viewsets.ModelViewSet):
    serializer_class = PsychologicalDataSerializer

    def get_queryset(self):
        return PsychologicalData.objects.filter(
            daily_record__athlete_profile__user=self.request.user
        ).select_related("daily_record", "daily_record__athlete_profile")


class StateScoreViewSet(CurrentUserDataMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = StateScoreSerializer

    def get_queryset(self):
        return StateScore.objects.filter(
            daily_record__athlete_profile__user=self.request.user
        ).select_related("daily_record", "daily_record__athlete_profile")


class AnalysisViewSet(CurrentUserDataMixin, viewsets.ViewSet):
    """Analytical endpoints for athlete dynamics and risk detection."""

    correlation_periods = {"7", "14", "31", "all"}

    def list(self, request):
        athlete_id = request.query_params.get("athlete_id")
        period = request.query_params.get("period", "all")
        metric = request.query_params.get("metric", "overall")
        score_fields = {
            "overall": "total_score",
            "physical": "physical_score",
            "psychological": "psychological_score",
        }
        if not athlete_id:
            return Response(
                {"detail": "athlete_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if period not in {"7", "14", "31", "all", "neighbors"}:
            return Response(
                {"detail": "period must be one of: 7, 14, 31, all, neighbors."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if metric not in score_fields:
            return Response(
                {"detail": "metric must be one of: overall, physical, psychological."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        records = (
            DailyRecord.objects.filter(
                athlete_profile_id=athlete_id,
                athlete_profile__user=request.user,
            )
            .select_related("physical_data", "psychological_data", "state_score")
            .order_by("date")
        )

        rows = [self._record_to_row(record) for record in records]
        dataframe = pd.DataFrame(rows)
        anomalies = anomaly_detection(rows)
        correlations = correlation_analysis(dataframe)
        score_field = score_fields[metric]
        scored_records = [
            record
            for record in records
            if getattr(getattr(record, "state_score", None), score_field, None) is not None
        ]
        period_records = scored_records if period in {"all", "neighbors"} else scored_records[-int(period) :]

        delta = None
        if len(records) >= 2:
            delta = delta_analysis(records[len(records) - 1], records[len(records) - 2])

        response = {
            "athlete_id": int(athlete_id),
            "records_count": len(rows),
            "period": period,
            "metric": metric,
            "delta": delta,
            "aggregated_delta": aggregated_delta(period_records, score_field),
            "anomalies": anomalies,
            "correlations": correlations,
        }
        if period == "neighbors":
            response["neighbor_deltas"] = delta_between_neighbors(period_records, score_field)

        return Response(response)

    @action(detail=False, methods=["get"])
    def correlations(self, request):
        period = request.query_params.get("period", "7")
        if period not in self.correlation_periods:
            return Response(
                {"detail": "period must be one of: 7, 14, 31, all."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            top_n = int(request.query_params.get("top_n", 3))
        except ValueError:
            return Response(
                {"detail": "top_n must be a positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        records = list(
            DailyRecord.objects.filter(athlete_profile__user=request.user)
            .select_related("physical_data", "psychological_data", "state_score")
            .order_by("date")
        )
        complete_records = [
            record
            for record in records
            if getattr(record, "physical_data", None) is not None
            and getattr(record, "psychological_data", None) is not None
            and getattr(record, "state_score", None) is not None
        ]
        period_records = complete_records if period == "all" else complete_records[-int(period) :]

        return Response(build_correlation_report(period_records, top_n=top_n))

    @action(detail=False, methods=["get"])
    def anomalies(self, request):
        profile = self.get_profile()
        records = list(
            DailyRecord.objects.filter(athlete_profile=profile)
            .select_related("physical_data", "psychological_data", "state_score")
            .order_by("date")
        )
        athlete_name = profile.user.get_full_name() or profile.user.username
        return Response(build_anomaly_report(records, athlete_name=athlete_name))

    def _record_to_row(self, record):
        physical = getattr(record, "physical_data", None)
        psychological = getattr(record, "psychological_data", None)

        return {
            "record_id": record.id,
            "date": record.date.isoformat(),
            "sleep_hours": getattr(physical, "sleep_hours", None),
            "meals": getattr(physical, "meals", None),
            "heart_rate_rest": getattr(physical, "heart_rate_rest", None),
            "heart_rate_load": getattr(physical, "heart_rate_load", None),
            "recovery_time": getattr(physical, "recovery_time", None),
            "fatigue": getattr(physical, "fatigue", None),
            "rpe": getattr(physical, "rpe", None),
            "wellbeing": getattr(psychological, "wellbeing", None),
            "activity": getattr(psychological, "activity", None),
            "mood": getattr(psychological, "mood", None),
            "physical_score": getattr(getattr(record, "state_score", None), "physical_score", None),
            "psychological_score": getattr(
                getattr(record, "state_score", None), "psychological_score", None
            ),
            "total_score": getattr(getattr(record, "state_score", None), "total_score", None),
        }
