from .services.san import SAN_QUESTIONS

GENDER_LABELS = {
    "male": "Мужской",
    "female": "Женский",
}


def serialize_profile(profile):
    return {
        "id": profile.id,
        "username": profile.user.username,
        "display_name": profile.user.get_full_name() or profile.user.username,
        "age": profile.age,
        "gender": GENDER_LABELS.get(profile.gender, ""),
        "gender_value": profile.gender,
        "sport": profile.sport,
    }


def serialize_record(record):
    state_score = getattr(record, "state_score", None)
    physical_data = getattr(record, "physical_data", None)
    psychological_data = getattr(record, "psychological_data", None)

    return {
        "id": record.id,
        "date": record.date.isoformat(),
        "created_at": record.created_at.isoformat(),
        "physical_score": getattr(state_score, "physical_score", None),
        "psychological_score": getattr(state_score, "psychological_score", None),
        "total_score": getattr(state_score, "total_score", None),
        "physical_data": (
            {
                "sleep_hours": physical_data.sleep_hours,
                "meals": physical_data.meals,
                "heart_rate_rest": physical_data.heart_rate_rest,
                "heart_rate_load": physical_data.heart_rate_load,
                "recovery_time": physical_data.recovery_time,
                "fatigue": physical_data.fatigue,
                "rpe": physical_data.rpe,
            }
            if physical_data
            else None
        ),
        "psychological_data": (
            {
                "wellbeing": psychological_data.wellbeing,
                "activity": psychological_data.activity,
                "mood": psychological_data.mood,
            }
            if psychological_data
            else None
        ),
    }


def serialize_san_questions():
    return [
        {
            "number": question["number"],
            "left_text": question["left_text"],
            "right_text": question["right_text"],
        }
        for question in SAN_QUESTIONS
    ]
