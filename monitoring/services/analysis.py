import pandas as pd
from sklearn.ensemble import IsolationForest

from monitoring.services.normalization import (
    normalize_fatigue,
    normalize_heart_rate_load,
    normalize_heart_rate_rest,
    normalize_meals,
    normalize_recovery,
    normalize_rpe,
    normalize_san,
    normalize_sleep,
)


ANALYSIS_FEATURES = [
    "sleep_hours",
    "meals",
    "heart_rate_rest",
    "heart_rate_load",
    "recovery_time",
    "fatigue",
    "rpe",
    "wellbeing",
    "activity",
    "mood",
    "physical_score",
    "psychological_score",
    "total_score",
]

ANOMALY_FEATURES = [
    "sleep_norm",
    "meals_norm",
    "heart_rate_rest_norm",
    "heart_rate_load_norm",
    "recovery_norm",
    "fatigue_norm",
    "rpe_norm",
    "wellbeing_norm",
    "activity_norm",
    "mood_norm",
]

ANOMALY_RAW_FEATURES = [
    "sleep_hours",
    "meals",
    "heart_rate_rest",
    "heart_rate_load",
    "recovery_time",
    "fatigue",
    "rpe",
    "wellbeing",
    "activity",
    "mood",
]

ANOMALY_NORMALIZED_BY_RAW = {
    "sleep_hours": "sleep_norm",
    "meals": "meals_norm",
    "heart_rate_rest": "heart_rate_rest_norm",
    "heart_rate_load": "heart_rate_load_norm",
    "recovery_time": "recovery_norm",
    "fatigue": "fatigue_norm",
    "rpe": "rpe_norm",
    "wellbeing": "wellbeing_norm",
    "activity": "activity_norm",
    "mood": "mood_norm",
}

PHYSICAL_CORRELATION_FEATURES = [
    "sleep_hours",
    "meals",
    "heart_rate_rest",
    "heart_rate_load",
    "recovery_time",
    "fatigue",
    "rpe",
]

PSYCHOLOGICAL_CORRELATION_FEATURES = [
    "wellbeing",
    "activity",
    "mood",
]

CORRELATION_FEATURES = PHYSICAL_CORRELATION_FEATURES + PSYCHOLOGICAL_CORRELATION_FEATURES

ANALYSIS_LABELS = {
    "sleep_hours": "Сон",
    "meals": "Приемы пищи",
    "heart_rate_rest": "ЧСС в покое",
    "heart_rate_load": "ЧСС при нагрузке",
    "recovery_time": "Восстановление",
    "fatigue": "Усталость",
    "rpe": "RPE",
    "wellbeing": "Самочувствие",
    "activity": "Активность",
    "mood": "Настроение",
    "physical_score": "Физика",
    "psychological_score": "Психология",
    "total_score": "Общее состояние",
}
ANOMALY_LABELS = {
    "sleep_hours": "Сон",
    "meals": "Приемы пищи",
    "heart_rate_rest": "ЧСС в покое",
    "heart_rate_load": "ЧСС при нагрузке",
    "recovery_time": "Восстановление",
    "fatigue": "Усталость",
    "rpe": "RPE",
    "wellbeing": "Самочувствие",
    "activity": "Активность",
    "mood": "Настроение",
}
ANOMALY_UNITS = {
    "sleep_hours": "ч",
    "meals": "",
    "heart_rate_rest": "уд/мин",
    "heart_rate_load": "уд/мин",
    "recovery_time": "мин",
    "fatigue": "балла",
    "rpe": "балла",
    "wellbeing": "балла",
    "activity": "балла",
    "mood": "балла",
}
ANOMALY_MIN_THRESHOLDS = {
    "sleep_hours": 1.0,
    "meals": 1.0,
    "heart_rate_rest": 5.0,
    "heart_rate_load": 10.0,
    "recovery_time": 0.5,
    "fatigue": 2.0,
    "rpe": 2.0,
    "wellbeing": 1.0,
    "activity": 1.0,
    "mood": 1.0,
}
CORRELATION_LABELS = ANALYSIS_LABELS
MIN_CORRELATION_RECORDS = 7
MIN_ANOMALY_RECORDS = 7


def _score_status(delta):
    if delta > 0:
        return "improvement"
    if delta < 0:
        return "deterioration"
    return "stable"


def _score(record, score_field="total_score"):
    return getattr(getattr(record, "state_score", None), score_field, None)


def _date_iso(record):
    value = record.date
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def delta_analysis(current, previous):
    current_score = _score(current)
    previous_score = _score(previous)

    if previous is None or previous_score is None or current_score is None:
        return {
            "status": "insufficient_data",
            "delta": None,
            "message": "Not enough data for comparison.",
        }

    delta = round(current_score - previous_score, 2)
    return {
        "status": _score_status(delta),
        "delta": delta,
        "previous_date": previous.date,
        "current_date": current.date,
    }


def delta_between_neighbors(records, score_field="total_score"):
    """Returns delta_G_t = G_t - G_(t-1) for neighboring scored records."""
    scored_records = [record for record in records if _score(record, score_field) is not None]
    deltas = []

    for previous, current in zip(scored_records, scored_records[1:]):
        previous_score = _score(previous, score_field)
        current_score = _score(current, score_field)
        delta = round(current_score - previous_score, 2)
        deltas.append(
            {
                "from_date": _date_iso(previous),
                "to_date": _date_iso(current),
                "previous_score": previous_score,
                "current_score": current_score,
                "delta": delta,
                "status": _score_status(delta),
            }
        )

    return deltas


def aggregated_delta(records, score_field="total_score"):
    """Returns aggregated delta_G_n as the sum of neighboring differences."""
    scored_records = [record for record in records if _score(record, score_field) is not None]

    if len(scored_records) < 2:
        return {
            "status": "insufficient_data",
            "total_delta": None,
            "message": "Not enough data for aggregated delta analysis.",
        }

    neighbor_deltas = delta_between_neighbors(scored_records, score_field)
    total_delta = round(sum(item["delta"] for item in neighbor_deltas), 2)
    first_record = scored_records[0]
    last_record = scored_records[-1]

    return {
        "period_start": _date_iso(first_record),
        "period_end": _date_iso(last_record),
        "days_count": len(scored_records),
        "first_score": _score(first_record, score_field),
        "last_score": _score(last_record, score_field),
        "total_delta": total_delta,
        "status": _score_status(total_delta),
    }


def anomaly_detection(data):
    """Returns Isolation Forest labels: 1 is normal, -1 is anomaly."""
    dataframe = pd.DataFrame(data)
    if dataframe.empty:
        return []

    dataframe = _normalized_anomaly_dataframe(dataframe.to_dict("records"))
    if len(dataframe) < 2:
        return [{"index": int(index), "is_anomaly": False, "score": None} for index in dataframe.index]

    model = IsolationForest(contamination="auto", random_state=42)
    labels = model.fit_predict(dataframe)
    scores = model.decision_function(dataframe)

    return [
        {
            "index": int(index),
            "is_anomaly": bool(label == -1),
            "score": round(float(score), 4),
        }
        for index, label, score in zip(dataframe.index, labels, scores)
    ]


def correlation_analysis(dataframe):
    if not isinstance(dataframe, pd.DataFrame):
        dataframe = pd.DataFrame(dataframe)

    if dataframe.empty:
        return {}

    features = [column for column in ANALYSIS_FEATURES if column in dataframe.columns]
    correlations = dataframe[features].corr(numeric_only=True).round(3)
    return correlations.fillna(0).to_dict()


def _correlation_strength(value):
    absolute = abs(value)
    if absolute < 0.3:
        return "weak", "слабая связь"
    if absolute < 0.7:
        return "moderate", "умеренная связь"
    return "strong", "сильная связь"


def _correlation_direction(value):
    if value > 0:
        return "positive", "прямая связь"
    if value < 0:
        return "negative", "обратная связь"
    return "none", "связи нет"


def _get_related(record, name):
    try:
        return getattr(record, name)
    except AttributeError:
        return None


def _record_to_correlation_row(record):
    physical = _get_related(record, "physical_data")
    psychological = _get_related(record, "psychological_data")
    state_score = _get_related(record, "state_score")

    if physical is None or psychological is None or state_score is None:
        return None

    return {
        "date": _date_iso(record),
        "sleep_hours": getattr(physical, "sleep_hours", None),
        "meals": getattr(physical, "meals", None),
        "heart_rate_rest": getattr(physical, "heart_rate_rest", None),
        "heart_rate_load": getattr(physical, "heart_rate_load", None),
        "recovery_time": getattr(physical, "recovery_time", None),
        "fatigue": getattr(physical, "fatigue", None),
        "rpe": getattr(physical, "rpe", None),
        "wellbeing": getattr(psychological, "wellbeing", None),
        "activity": getattr(psychological, "activity", None),
        "mood": getattr(psychological, "mood", None),
        "physical_score": getattr(state_score, "physical_score", None),
        "psychological_score": getattr(state_score, "psychological_score", None),
        "total_score": getattr(state_score, "total_score", None),
    }


def _normalized_anomaly_row(row):
    return {
        "date": row.get("date"),
        "sleep_norm": normalize_sleep(row.get("sleep_hours")),
        "meals_norm": normalize_meals(row.get("meals")),
        "heart_rate_rest_norm": normalize_heart_rate_rest(row.get("heart_rate_rest")),
        "heart_rate_load_norm": normalize_heart_rate_load(row.get("heart_rate_load")),
        "recovery_norm": normalize_recovery(row.get("recovery_time")),
        "fatigue_norm": normalize_fatigue(row.get("fatigue")),
        "rpe_norm": normalize_rpe(row.get("rpe")),
        "wellbeing_norm": normalize_san(row.get("wellbeing")),
        "activity_norm": normalize_san(row.get("activity")),
        "mood_norm": normalize_san(row.get("mood")),
    }


def _normalized_anomaly_dataframe(rows):
    normalized_rows = [_normalized_anomaly_row(row) for row in rows]
    dataframe = pd.DataFrame(normalized_rows)
    if dataframe.empty:
        return dataframe
    return dataframe[ANOMALY_FEATURES].dropna()


def _complete_analysis_rows(records):
    rows = [
        row
        for row in (
            _record_to_correlation_row(record)
            for record in sorted(records, key=lambda item: item.date)
        )
        if row is not None
    ]
    return [
        row
        for row in rows
        if all(row.get(feature) is not None for feature in ANALYSIS_FEATURES)
    ]


def build_correlation_report(records, top_n=3):
    rows = _complete_analysis_rows(records)
    records_count = len(rows)

    base_response = {
        "records_count": records_count,
        "method": "pearson",
        "min_required_records": MIN_CORRELATION_RECORDS,
        "items": [],
    }

    if records_count < MIN_CORRELATION_RECORDS:
        return {
            **base_response,
            "status": "insufficient_data",
            "message": "Недостаточно данных для корреляционного анализа. Нужно минимум 7 записей.",
        }

    dataframe = pd.DataFrame(rows)
    correlations = dataframe[CORRELATION_FEATURES].corr(method="pearson", numeric_only=True)
    best_by_psychological_feature = {}

    for left_key in PHYSICAL_CORRELATION_FEATURES:
        for right_key in PSYCHOLOGICAL_CORRELATION_FEATURES:
            value = correlations.loc[left_key, right_key]
            if pd.isna(value) or abs(value) < 0.3:
                continue

            correlation = round(float(value), 2)
            abs_correlation = round(abs(correlation), 2)
            strength, strength_label = _correlation_strength(correlation)
            direction, direction_label = _correlation_direction(correlation)
            left_label = CORRELATION_LABELS[left_key]
            right_label = CORRELATION_LABELS[right_key]

            item = {
                "left_key": left_key,
                "left_label": left_label,
                "right_key": right_key,
                "right_label": right_label,
                "correlation": correlation,
                "abs_correlation": abs_correlation,
                "strength": strength,
                "strength_label": strength_label,
                "direction": direction,
                "direction_label": direction_label,
                "message": (
                    "У спортсмена наблюдается "
                    f"{strength_label.replace(' связь', '')} {direction_label} "
                    f"между показателями «{left_label}» и «{right_label}»."
                ),
            }
            current_best = best_by_psychological_feature.get(right_key)
            if current_best is None or item["abs_correlation"] > current_best["abs_correlation"]:
                best_by_psychological_feature[right_key] = item

    items = [
        best_by_psychological_feature[key]
        for key in PSYCHOLOGICAL_CORRELATION_FEATURES
        if key in best_by_psychological_feature
    ]
    safe_top_n = max(0, int(top_n))

    return {
        **base_response,
        "status": "ok",
        "items": items[:safe_top_n],
    }


def _anomaly_direction(difference):
    if difference > 0:
        return "above", "выше"
    return "below", "ниже"


def _round_metric(value):
    return round(float(value), 2)


def _format_number(value):
    rounded = _round_metric(value)
    return str(int(rounded)) if rounded.is_integer() else str(rounded)


def _pluralize_ru(value, forms):
    absolute = abs(float(value))
    if not absolute.is_integer():
        return forms[1]

    number = int(absolute) % 100
    if 11 <= number <= 14:
        return forms[2]

    last_digit = number % 10
    if last_digit == 1:
        return forms[0]
    if 2 <= last_digit <= 4:
        return forms[1]
    return forms[2]


def _message_unit(key, value):
    if key == "sleep_hours":
        return _pluralize_ru(value, ("час", "часа", "часов"))
    if key == "meals":
        return _pluralize_ru(value, ("прием пищи", "приема пищи", "приемов пищи"))
    if key in {"fatigue", "rpe", "wellbeing", "activity", "mood"}:
        return _pluralize_ru(value, ("балл", "балла", "баллов"))
    return ANOMALY_UNITS[key]


def _format_difference_for_message(key, abs_difference):
    value = _format_number(abs_difference)
    unit = _message_unit(key, abs_difference)
    return f"{value} {unit}".strip()


def _anomaly_message(key, direction, abs_difference):
    amount = _format_difference_for_message(key, abs_difference)
    direction_label = "выше" if direction == "above" else "ниже"

    if key == "sleep_hours":
        return (
            f"Продолжительность сна {direction_label} среднего значения спортсмена "
            f"на {amount}."
        )
    if key == "heart_rate_rest":
        return (
            f"ЧСС в покое {direction_label} привычного уровня спортсмена "
            f"на {amount}."
        )
    if key == "heart_rate_load":
        return (
            f"ЧСС при нагрузке {direction_label} привычного уровня спортсмена "
            f"на {amount}."
        )
    if key == "recovery_time":
        return (
            f"Время восстановления {direction_label} привычного уровня спортсмена "
            f"на {amount}."
        )
    if key == "meals":
        return (
            f"Количество приемов пищи {direction_label} среднего значения спортсмена "
            f"на {amount}."
        )
    if key == "fatigue":
        if direction == "above":
            return f"Уровень усталости превышает среднее значение спортсмена на {amount}."
        return f"Уровень усталости ниже среднего значения спортсмена на {amount}."
    if key == "rpe":
        if direction == "above":
            return (
                f"Субъективная тяжесть нагрузки превышает среднее значение спортсмена "
                f"на {amount}."
            )
        return (
            f"Субъективная тяжесть нагрузки ниже среднего значения спортсмена "
            f"на {amount}."
        )
    if key == "wellbeing":
        return (
            f"Самочувствие {direction_label} среднего значения спортсмена "
            f"на {amount}."
        )
    if key == "activity":
        return (
            f"Активность {direction_label} среднего значения спортсмена "
            f"на {amount}."
        )
    return (
        f"Настроение {direction_label} среднего значения спортсмена "
        f"на {amount}."
    )


def _isolation_forest_summary(is_anomaly):
    if is_anomaly:
        return "Последняя запись существенно отличается от обычного состояния спортсмена."
    return "Последняя запись соответствует типичному состоянию спортсмена."


def build_anomaly_report(records, athlete_name="спортсмена"):
    rows = _complete_analysis_rows(records)
    records_count = len(rows)
    base_response = {
        "records_count": records_count,
        "min_required_records": MIN_ANOMALY_RECORDS,
        "items": [],
    }

    if records_count < MIN_ANOMALY_RECORDS:
        return {
            **base_response,
            "status": "insufficient_data",
            "message": "Недостаточно данных для анализа критических отклонений. Нужно минимум 7 записей.",
        }

    raw_frame = pd.DataFrame(rows)
    normalized_frame = pd.DataFrame([_normalized_anomaly_row(row) for row in rows])
    feature_frame = normalized_frame[ANOMALY_FEATURES]
    model = IsolationForest(contamination="auto", random_state=42)
    model.fit(feature_frame)

    latest_features = feature_frame.tail(1)
    latest_raw_record = raw_frame.iloc[-1]
    latest_normalized_record = normalized_frame.iloc[-1]
    is_anomaly = bool(model.predict(latest_features)[0] == -1)
    anomaly_score = _round_metric(model.decision_function(latest_features)[0])
    raw_means = raw_frame[ANOMALY_RAW_FEATURES].mean(numeric_only=True)
    raw_deviations = raw_frame[ANOMALY_RAW_FEATURES].std(numeric_only=True)
    normalized_means = feature_frame.mean(numeric_only=True)
    items = []

    for key in ANOMALY_RAW_FEATURES:
        std_value = float(raw_deviations[key])
        if pd.isna(std_value):
            continue

        raw_current_value = float(latest_raw_record[key])
        raw_mean_value = float(raw_means[key])
        raw_difference = raw_current_value - raw_mean_value
        min_threshold = ANOMALY_MIN_THRESHOLDS[key]
        critical_threshold = max(2 * std_value, min_threshold)
        if abs(raw_difference) < critical_threshold:
            continue

        direction, direction_label = _anomaly_direction(raw_difference)
        rounded_difference = _round_metric(raw_difference)
        abs_difference = _round_metric(abs(raw_difference))
        label = ANOMALY_LABELS[key]
        normalized_key = ANOMALY_NORMALIZED_BY_RAW[key]
        items.append(
            {
                "key": key,
                "label": label,
                "raw_current_value": _round_metric(raw_current_value),
                "raw_mean_value": _round_metric(raw_mean_value),
                "raw_difference": rounded_difference,
                "normalized_current_value": _round_metric(latest_normalized_record[normalized_key]),
                "normalized_mean_value": _round_metric(normalized_means[normalized_key]),
                "unit": ANOMALY_UNITS[key],
                "abs_difference": abs_difference,
                "direction": direction,
                "direction_label": direction_label,
                "severity": "high",
                "message": _anomaly_message(key, direction, abs_difference),
            }
        )

    model_summary = _isolation_forest_summary(is_anomaly)
    if not items:
        return {
            **base_response,
            "status": "ok",
            "method": "Isolation Forest",
            "is_anomaly": is_anomaly,
            "anomaly_score": anomaly_score,
            "last_record_date": latest_raw_record["date"],
            "model_summary": model_summary,
            "message": "Показатели находятся в пределах привычного диапазона спортсмена.",
        }

    return {
        **base_response,
        "status": "warning",
        "method": "Isolation Forest",
        "is_anomaly": is_anomaly,
        "anomaly_score": anomaly_score,
        "last_record_date": latest_raw_record["date"],
        "model_summary": model_summary,
        "message": "Обнаружены показатели, значительно отличающиеся от привычного состояния спортсмена.",
        "items": items,
    }
