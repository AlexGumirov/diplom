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


def weighted_average(values):
    weighted_sum = sum(score * weight for score, weight in values)
    total_weight = sum(weight for _, weight in values)
    return round(weighted_sum / total_weight, 2)


def calculate_physical_score(physical_data):
    """Calculates a physical condition score on a 1-10 scale."""
    values = [
        (normalize_sleep(physical_data.sleep_hours), 0.18),
        (normalize_meals(physical_data.meals), 0.10),
        (normalize_heart_rate_rest(physical_data.heart_rate_rest), 0.16),
        (normalize_heart_rate_load(physical_data.heart_rate_load), 0.14),
        (normalize_recovery(physical_data.recovery_time), 0.16),
        (normalize_fatigue(physical_data.fatigue), 0.13),
        (normalize_rpe(physical_data.rpe), 0.13),
    ]
    return weighted_average(values)


def calculate_psychological_score(psychological_data):
    """Calculates SAN psychological score on a 1-10 scale."""
    values = [
        (normalize_san(psychological_data.wellbeing), 1),
        (normalize_san(psychological_data.activity), 1),
        (normalize_san(psychological_data.mood), 1),
    ]
    return weighted_average(values)


def calculate_total_score(physical_score, psychological_score):
    return weighted_average([(physical_score, 0.6), (psychological_score, 0.4)])


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
