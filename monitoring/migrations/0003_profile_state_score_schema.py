import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.utils import timezone


def migrate_existing_data(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Athlete = apps.get_model("monitoring", "Athlete")
    AthleteProfile = apps.get_model("monitoring", "AthleteProfile")
    DailyRecord = apps.get_model("monitoring", "DailyRecord")
    SANTest = apps.get_model("monitoring", "SANTest")
    SANAnswer = apps.get_model("monitoring", "SANAnswer")
    StateScore = apps.get_model("monitoring", "StateScore")

    profile_by_old_athlete_id = {}
    legacy_athlete_by_user_id = {}
    for athlete in Athlete.objects.all():
        username = f"athlete_{athlete.id}"
        user, _ = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": athlete.name,
                "is_staff": False,
                "is_superuser": False,
            },
        )
        profile, _ = AthleteProfile.objects.get_or_create(user=user)
        profile_by_old_athlete_id[athlete.id] = profile
        legacy_athlete_by_user_id[user.id] = athlete

    for record in DailyRecord.objects.all():
        profile = profile_by_old_athlete_id.get(record.athlete_id)
        if profile is None:
            continue

        record.athlete_profile = profile
        record.created_at = timezone.now()
        record.save(update_fields=["athlete_profile", "created_at"])

        if (
            record.physical_score is not None
            or record.psychological_score is not None
            or record.total_score is not None
        ):
            StateScore.objects.update_or_create(
                daily_record=record,
                defaults={
                    "physical_score": record.physical_score or 0,
                    "psychological_score": record.psychological_score or 0,
                    "total_score": record.total_score or 0,
                },
            )

    for test in SANTest.objects.all():
        profile, _ = AthleteProfile.objects.get_or_create(user=test.user)
        legacy_athlete = legacy_athlete_by_user_id.get(test.user_id)
        if legacy_athlete is None:
            display_name = (
                f"{test.user.first_name} {test.user.last_name}".strip()
                or test.user.username
            )
            legacy_athlete, _ = Athlete.objects.get_or_create(name=display_name)
            legacy_athlete_by_user_id[test.user_id] = legacy_athlete

        test_date = timezone.localdate(test.date) if test.date else timezone.localdate()
        daily_record, _ = DailyRecord.objects.get_or_create(
            athlete=legacy_athlete,
            athlete_profile=profile,
            date=test_date,
            defaults={"created_at": test.date or timezone.now()},
        )
        test.athlete_profile = profile
        test.daily_record = daily_record
        test.created_at = test.date or timezone.now()
        test.save(update_fields=["athlete_profile", "daily_record", "created_at"])

    for answer in SANAnswer.objects.all():
        if -3 <= answer.value <= 3:
            answer.value = answer.value + 4
            answer.save(update_fields=["value"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("monitoring", "0002_santest_sananswer"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AthleteProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("age", models.PositiveSmallIntegerField(blank=True, null=True)),
                (
                    "gender",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("male", "Male"),
                            ("female", "Female"),
                            ("other", "Other"),
                        ],
                        max_length=16,
                    ),
                ),
                ("sport", models.CharField(blank=True, max_length=120)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="athlete_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["user__username"]},
        ),
        migrations.AddField(
            model_name="dailyrecord",
            name="athlete_profile",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="daily_records",
                to="monitoring.athleteprofile",
            ),
        ),
        migrations.AddField(
            model_name="dailyrecord",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="santest",
            name="athlete_profile",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="san_tests",
                to="monitoring.athleteprofile",
            ),
        ),
        migrations.AddField(
            model_name="santest",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="santest",
            name="daily_record",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="san_tests",
                to="monitoring.dailyrecord",
            ),
        ),
        migrations.CreateModel(
            name="StateScore",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("physical_score", models.FloatField()),
                ("psychological_score", models.FloatField()),
                ("total_score", models.FloatField()),
                (
                    "daily_record",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="state_score",
                        to="monitoring.dailyrecord",
                    ),
                ),
            ],
        ),
        migrations.RemoveConstraint(
            model_name="sananswer",
            name="san_answer_value_between_minus_3_and_3",
        ),
        migrations.RunPython(migrate_existing_data, noop_reverse),
        migrations.RemoveConstraint(
            model_name="dailyrecord",
            name="unique_daily_record_per_athlete",
        ),
        migrations.RemoveField(model_name="dailyrecord", name="athlete"),
        migrations.RemoveField(model_name="dailyrecord", name="physical_score"),
        migrations.RemoveField(model_name="dailyrecord", name="psychological_score"),
        migrations.RemoveField(model_name="dailyrecord", name="total_score"),
        migrations.RemoveField(model_name="santest", name="date"),
        migrations.RemoveField(model_name="santest", name="user"),
        migrations.AlterField(
            model_name="dailyrecord",
            name="athlete_profile",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="daily_records",
                to="monitoring.athleteprofile",
            ),
        ),
        migrations.AlterField(
            model_name="dailyrecord",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name="santest",
            name="athlete_profile",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="san_tests",
                to="monitoring.athleteprofile",
            ),
        ),
        migrations.AlterField(
            model_name="santest",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name="santest",
            name="daily_record",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="san_tests",
                to="monitoring.dailyrecord",
            ),
        ),
        migrations.AlterModelOptions(
            name="santest",
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="dailyrecord",
            constraint=models.UniqueConstraint(
                fields=("athlete_profile", "date"),
                name="unique_daily_record_per_profile_date",
            ),
        ),
        migrations.AddConstraint(
            model_name="sananswer",
            constraint=models.CheckConstraint(
                condition=models.Q(("value__gte", 1), ("value__lte", 7)),
                name="san_answer_value_between_1_and_7",
            ),
        ),
        migrations.DeleteModel(name="Athlete"),
    ]
