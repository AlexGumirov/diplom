import pandas as pd
from sklearn.ensemble import IsolationForest


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


def delta_analysis(current, previous, threshold=0.3):
    current_score = getattr(getattr(current, "state_score", None), "total_score", None)
    previous_score = getattr(getattr(previous, "state_score", None), "total_score", None)

    if previous is None or previous_score is None or current_score is None:
        return {
            "status": "insufficient_data",
            "delta": None,
            "message": "Not enough data for comparison.",
        }

    delta = round(current_score - previous_score, 2)
    if delta > threshold:
        status = "improvement"
    elif delta < -threshold:
        status = "deterioration"
    else:
        status = "stable"

    return {
        "status": status,
        "delta": delta,
        "previous_date": previous.date,
        "current_date": current.date,
    }


def anomaly_detection(data):
    """Returns Isolation Forest labels: 1 is normal, -1 is anomaly."""
    dataframe = pd.DataFrame(data)
    if dataframe.empty:
        return []

    features = [column for column in ANALYSIS_FEATURES if column in dataframe.columns]
    dataframe = dataframe[features].dropna()
    if len(dataframe) < 2:
        return [{"index": int(index), "is_anomaly": False, "score": None} for index in dataframe.index]

    contamination = min(0.2, max(0.05, 1 / len(dataframe)))
    model = IsolationForest(contamination=contamination, random_state=42)
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
