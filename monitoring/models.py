from django.conf import settings
from django.db import models


class AthleteProfile(models.Model):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name="athlete_profile",
        on_delete=models.CASCADE,
    )
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    gender = models.CharField(
        max_length=16,
        choices=GENDER_CHOICES,
        blank=True,
    )
    sport = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["user__username"]

    def __str__(self):
        name = self.user.get_full_name() or self.user.username
        return f"{name} ({self.sport or 'sport not set'})"


class DailyRecord(models.Model):
    athlete_profile = models.ForeignKey(
        AthleteProfile,
        related_name="daily_records",
        on_delete=models.CASCADE,
    )
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(
                fields=["athlete_profile", "date"],
                name="unique_daily_record_per_profile_date",
            )
        ]

    def __str__(self):
        return f"{self.athlete_profile} - {self.date}"


class PhysicalData(models.Model):
    daily_record = models.OneToOneField(
        DailyRecord,
        related_name="physical_data",
        on_delete=models.CASCADE,
    )
    sleep_hours = models.FloatField()
    meals = models.PositiveSmallIntegerField()
    heart_rate_rest = models.PositiveSmallIntegerField()
    heart_rate_load = models.PositiveSmallIntegerField()
    recovery_time = models.FloatField(
        help_text="Recovery time in minutes as float, e.g. 2.5 for 2:30."
    )
    fatigue = models.PositiveSmallIntegerField()
    rpe = models.PositiveSmallIntegerField()

    def __str__(self):
        return f"Physical data for {self.daily_record}"


class PsychologicalData(models.Model):
    daily_record = models.OneToOneField(
        DailyRecord,
        related_name="psychological_data",
        on_delete=models.CASCADE,
    )
    wellbeing = models.FloatField()
    activity = models.FloatField()
    mood = models.FloatField()

    def __str__(self):
        return f"Psychological data for {self.daily_record}"


class SANTest(models.Model):
    athlete_profile = models.ForeignKey(
        AthleteProfile,
        related_name="san_tests",
        on_delete=models.CASCADE,
    )
    daily_record = models.ForeignKey(
        DailyRecord,
        related_name="san_tests",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"SAN test #{self.pk} for {self.athlete_profile}"


class SANAnswer(models.Model):
    test = models.ForeignKey(
        SANTest,
        related_name="answers",
        on_delete=models.CASCADE,
    )
    question_number = models.PositiveSmallIntegerField()
    value = models.SmallIntegerField()

    class Meta:
        ordering = ["question_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["test", "question_number"],
                name="unique_san_answer_per_question",
            ),
            models.CheckConstraint(
                check=models.Q(value__gte=1, value__lte=7),
                name="san_answer_value_between_1_and_7",
            ),
            models.CheckConstraint(
                check=models.Q(question_number__gte=1, question_number__lte=30),
                name="san_question_number_between_1_and_30",
            ),
        ]

    @property
    def san_value(self):
        return self.value

    def __str__(self):
        return f"Question {self.question_number}: {self.value}"


class StateScore(models.Model):
    daily_record = models.OneToOneField(
        DailyRecord,
        related_name="state_score",
        on_delete=models.CASCADE,
    )
    physical_score = models.FloatField()
    psychological_score = models.FloatField()
    total_score = models.FloatField()

    def __str__(self):
        return f"State score for {self.daily_record}"
