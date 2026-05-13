from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("monitoring", "0005_limit_profile_gender_choices"),
    ]

    operations = [
        migrations.AddField(
            model_name="dailyrecord",
            name="notes",
            field=models.TextField(blank=True),
        ),
    ]
