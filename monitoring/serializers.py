from rest_framework import serializers

from .models import (
    AthleteProfile,
    DailyRecord,
    PhysicalData,
    PsychologicalData,
    StateScore,
)
from .utils.validators import parse_recovery_time, validate_range


class AthleteProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = AthleteProfile
        fields = ["id", "user", "username", "name", "age", "gender", "sport"]
        read_only_fields = ["user", "username", "name"]

    def get_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class PhysicalDataSerializer(serializers.ModelSerializer):
    recovery_time = serializers.FloatField()

    class Meta:
        model = PhysicalData
        fields = [
            "id",
            "daily_record",
            "sleep_hours",
            "meals",
            "heart_rate_rest",
            "heart_rate_load",
            "recovery_time",
            "fatigue",
            "rpe",
        ]

    def to_internal_value(self, data):
        mutable_data = data.copy()
        if "recovery_time" in mutable_data:
            mutable_data["recovery_time"] = parse_recovery_time(
                mutable_data["recovery_time"]
            )
        return super().to_internal_value(mutable_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["recovery_time"] = instance.recovery_time
        return representation

    def validate_sleep_hours(self, value):
        return validate_range(value, 0, 12, "sleep_hours")

    def validate_meals(self, value):
        return validate_range(value, 0, 5, "meals")

    def validate_heart_rate_rest(self, value):
        return validate_range(value, 50, 90, "heart_rate_rest")

    def validate_heart_rate_load(self, value):
        return validate_range(value, 90, 220, "heart_rate_load")

    def validate_recovery_time(self, value):
        return validate_range(value, 1, 5, "recovery_time")

    def validate_fatigue(self, value):
        return validate_range(value, 1, 10, "fatigue")

    def validate_rpe(self, value):
        return validate_range(value, 1, 10, "rpe")

    def validate_daily_record(self, value):
        request = self.context.get("request")
        if request and value.athlete_profile.user != request.user:
            raise serializers.ValidationError("You can use only your own daily records.")
        return value


class PsychologicalDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = PsychologicalData
        fields = ["id", "daily_record", "wellbeing", "activity", "mood"]

    def validate_wellbeing(self, value):
        return validate_range(float(value), 1, 7, "wellbeing")

    def validate_activity(self, value):
        return validate_range(float(value), 1, 7, "activity")

    def validate_mood(self, value):
        return validate_range(float(value), 1, 7, "mood")

    def validate_daily_record(self, value):
        request = self.context.get("request")
        if request and value.athlete_profile.user != request.user:
            raise serializers.ValidationError("You can use only your own daily records.")
        return value


class StateScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = StateScore
        fields = [
            "id",
            "daily_record",
            "physical_score",
            "psychological_score",
            "total_score",
        ]
        read_only_fields = ["physical_score", "psychological_score", "total_score"]


class DailyRecordSerializer(serializers.ModelSerializer):
    physical_data = PhysicalDataSerializer(read_only=True)
    psychological_data = PsychologicalDataSerializer(read_only=True)
    state_score = StateScoreSerializer(read_only=True)
    physical_score = serializers.FloatField(source="state_score.physical_score", read_only=True)
    psychological_score = serializers.FloatField(
        source="state_score.psychological_score", read_only=True
    )
    total_score = serializers.FloatField(source="state_score.total_score", read_only=True)
    athlete = serializers.IntegerField(source="athlete_profile_id", read_only=True)

    class Meta:
        model = DailyRecord
        fields = [
            "id",
            "athlete_profile",
            "athlete",
            "date",
            "created_at",
            "physical_score",
            "psychological_score",
            "total_score",
            "physical_data",
            "psychological_data",
            "state_score",
        ]
        read_only_fields = [
            "created_at",
            "physical_data",
            "psychological_data",
            "state_score",
        ]

    def validate_athlete_profile(self, value):
        request = self.context.get("request")
        if request and value.user != request.user:
            raise serializers.ValidationError("You can create records only for yourself.")
        return value
