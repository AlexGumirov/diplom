from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("monitoring", "0003_profile_state_score_schema"),
    ]

    operations = [
        migrations.AlterField(
            model_name="psychologicaldata",
            name="activity",
            field=models.FloatField(),
        ),
        migrations.AlterField(
            model_name="psychologicaldata",
            name="mood",
            field=models.FloatField(),
        ),
        migrations.AlterField(
            model_name="psychologicaldata",
            name="wellbeing",
            field=models.FloatField(),
        ),
    ]
