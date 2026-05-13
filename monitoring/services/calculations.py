from .normalization import (
    normalize_fatigue,
    normalize_heart_rate_load,
    normalize_heart_rate_rest,
    normalize_meals,
    normalize_recovery,
    normalize_rpe,
    normalize_san,
    normalize_sleep,
)


def average(values):
    return round(sum(values) / len(values), 2)


def calculate_physical_score(physical_data):
    """Calculates a physical condition score on a 1-10 scale."""
    values = [
        normalize_sleep(physical_data.sleep_hours),
        normalize_meals(physical_data.meals),
        normalize_heart_rate_rest(physical_data.heart_rate_rest),
        normalize_heart_rate_load(physical_data.heart_rate_load),
        normalize_recovery(physical_data.recovery_time),
        normalize_fatigue(physical_data.fatigue),
        normalize_rpe(physical_data.rpe),
    ]
    return average(values)


def calculate_psychological_score(psychological_data):
    """Calculates SAN psychological score on a 1-10 scale."""
    values = [
        normalize_san(psychological_data.wellbeing),
        normalize_san(psychological_data.activity),
        normalize_san(psychological_data.mood),
    ]
    return average(values)


def calculate_total_score(physical_score, psychological_score):
    return average([physical_score, psychological_score])


def calculate_record_scores(daily_record):
    physical_score = calculate_physical_score(daily_record.physical_data)
    psychological_score = calculate_psychological_score(daily_record.psychological_data)
    total_score = calculate_total_score(physical_score, psychological_score)

    from monitoring.models import StateScore

    StateScore.objects.update_or_create(
        daily_record=daily_record,
        defaults={
            "physical_score": physical_score,
            "psychological_score": psychological_score,
            "total_score": total_score,
        },
    )

    return {
        "physical_score": physical_score,
        "psychological_score": psychological_score,
        "total_score": total_score,
    }
