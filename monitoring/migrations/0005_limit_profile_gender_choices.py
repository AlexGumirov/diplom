from django.db import migrations, models


def clear_unsupported_gender(apps, schema_editor):
    AthleteProfile = apps.get_model("monitoring", "AthleteProfile")
    AthleteProfile.objects.filter(gender="other").update(gender="")


class Migration(migrations.Migration):

    dependencies = [
        ("monitoring", "0004_alter_psychologicaldata_scores"),
    ]

    operations = [
        migrations.RunPython(clear_unsupported_gender, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="athleteprofile",
            name="gender",
            field=models.CharField(
                blank=True,
                choices=[("male", "Male"), ("female", "Female")],
                max_length=16,
            ),
        ),
    ]
