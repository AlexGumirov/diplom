from django.contrib import admin

from .models import (
    AthleteProfile,
    DailyRecord,
    PhysicalData,
    PsychologicalData,
    SANAnswer,
    SANTest,
    StateScore,
)


@admin.register(AthleteProfile)
class AthleteProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "age", "gender", "sport")
    list_filter = ("gender", "sport", "user")
    search_fields = ("user__username", "user__first_name", "user__last_name", "sport")


@admin.register(DailyRecord)
class DailyRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "athlete_profile",
        "date",
        "created_at",
    )
    list_filter = ("date", "athlete_profile__user")
    search_fields = (
        "athlete_profile__user__username",
        "athlete_profile__user__first_name",
        "athlete_profile__user__last_name",
    )


@admin.register(PhysicalData)
class PhysicalDataAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "daily_record",
        "sleep_hours",
        "meals",
        "heart_rate_rest",
        "heart_rate_load",
        "recovery_time",
        "fatigue",
        "rpe",
    )
    list_filter = ("daily_record__date", "daily_record__athlete_profile__user")


@admin.register(PsychologicalData)
class PsychologicalDataAdmin(admin.ModelAdmin):
    list_display = ("id", "daily_record", "wellbeing", "activity", "mood")
    list_filter = ("daily_record__date", "daily_record__athlete_profile__user")


class SANAnswerInline(admin.TabularInline):
    model = SANAnswer
    extra = 0
    readonly_fields = ("san_value",)


@admin.register(SANTest)
class SANTestAdmin(admin.ModelAdmin):
    list_display = ("id", "athlete_profile", "daily_record", "created_at")
    list_filter = ("created_at", "athlete_profile__user", "daily_record__date")
    search_fields = ("athlete_profile__user__username",)
    inlines = [SANAnswerInline]


@admin.register(SANAnswer)
class SANAnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "test", "question_number", "value", "san_value")
    list_filter = ("question_number",)


@admin.register(StateScore)
class StateScoreAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "daily_record",
        "physical_score",
        "psychological_score",
        "total_score",
    )
    list_filter = ("daily_record__date", "daily_record__athlete_profile__user")
