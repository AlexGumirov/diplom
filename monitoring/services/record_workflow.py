from dataclasses import dataclass
import json

from django.db import IntegrityError
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from monitoring.models import AthleteProfile, DailyRecord, PsychologicalData, SANAnswer, SANTest
from monitoring.serializers import PhysicalDataSerializer
from monitoring.services.calculations import calculate_record_scores
from monitoring.services.san import SAN_QUESTIONS, calculate_SAN_scores


@dataclass(frozen=True)
class SANAnswerPayload:
    question_number: int
    value: int


class CompleteRecordValidationError(Exception):
    def __init__(self, errors):
        super().__init__("Complete record validation failed.")
        self.errors = errors


def get_or_create_profile(user):
    return AthleteProfile.objects.get_or_create(user=user)[0]


def get_records_for_profile(profile):
    return (
        DailyRecord.objects.filter(athlete_profile=profile)
        .select_related("physical_data", "psychological_data", "state_score")
        .order_by("-date")
    )


def get_record_date(raw_date):
    if raw_date:
        parsed = parse_date(raw_date)
        if parsed is None:
            raise ValueError("Некорректная дата. Используйте формат ГГГГ-ММ-ДД.")
        record_date = parsed
    else:
        record_date = timezone.localdate()

    if record_date > timezone.localdate():
        raise ValueError("Нельзя создавать запись на будущую дату.")

    return record_date


def get_or_create_daily_record(profile, raw_date):
    return DailyRecord.objects.get_or_create(
        athlete_profile=profile,
        date=get_record_date(raw_date),
    )[0]


def get_new_record_date(profile, raw_date):
    record_date = get_record_date(raw_date)
    if DailyRecord.objects.filter(athlete_profile=profile, date=record_date).exists():
        raise CompleteRecordValidationError(
            {"date": ["За выбранную дату уже есть запись в дневнике."]}
        )
    return record_date


def calculate_if_ready(daily_record):
    if hasattr(daily_record, "physical_data") and hasattr(daily_record, "psychological_data"):
        return calculate_record_scores(daily_record)
    return None


def json_safe_errors(errors):
    return json.loads(json.dumps(errors, default=str))


def build_delta(current, previous):
    if current is None or previous is None:
        return {
            "status": "insufficient_data",
            "delta": None,
            "message": "Not enough data for comparison.",
        }

    current_total = getattr(getattr(current, "state_score", None), "total_score", None)
    previous_total = getattr(getattr(previous, "state_score", None), "total_score", None)
    if current_total is None or previous_total is None:
        return {
            "status": "insufficient_data",
            "delta": None,
            "message": "Not enough data for comparison.",
        }

    delta = round(current_total - previous_total, 2)
    if delta > 0:
        status = "improvement"
    elif delta < 0:
        status = "deterioration"
    else:
        status = "stable"

    return {
        "status": status,
        "delta": delta,
        "previous_date": previous.date.isoformat(),
        "current_date": current.date.isoformat(),
    }


def validate_san_answers(answers_payload):
    if len(answers_payload) != len(SAN_QUESTIONS):
        return None, {"answers": ["Exactly 30 SAN answers are required."]}

    answers = []
    seen_numbers = set()
    for item in answers_payload:
        try:
            question_number = int(item["question_number"])
            value = int(item["value"])
        except (KeyError, TypeError, ValueError):
            return None, {"answers": ["Each SAN answer must contain integer question_number and value."]}

        if question_number in seen_numbers:
            return None, {"answers": [f"Duplicate answer for question {question_number}."]}
        if not 1 <= question_number <= 30:
            return None, {"answers": [f"Question number {question_number} is out of range."]}
        if not 1 <= value <= 7:
            return None, {"answers": [f"Answer value for question {question_number} must be between 1 and 7."]}

        seen_numbers.add(question_number)
        answers.append(SANAnswerPayload(question_number=question_number, value=value))

    return answers, None


def build_physical_serializer(daily_record, payload, request, instance=None):
    return PhysicalDataSerializer(
        instance=instance,
        data={
            "daily_record": daily_record.id,
            "sleep_hours": payload.get("sleep_hours"),
            "meals": payload.get("meals"),
            "heart_rate_rest": payload.get("heart_rate_rest"),
            "heart_rate_load": payload.get("heart_rate_load"),
            "recovery_time": payload.get("recovery_time"),
            "fatigue": payload.get("fatigue"),
            "rpe": payload.get("rpe"),
        },
        context={"request": request},
    )


def save_san_results(profile, daily_record, answers):
    with transaction.atomic():
        PsychologicalData.objects.filter(daily_record=daily_record).delete()
        SANTest.objects.filter(daily_record=daily_record, athlete_profile=profile).delete()

        test = SANTest.objects.create(athlete_profile=profile, daily_record=daily_record)
        SANAnswer.objects.bulk_create(
            [
                SANAnswer(
                    test=test,
                    question_number=answer.question_number,
                    value=answer.value,
                )
                for answer in answers
            ]
        )

        scores = calculate_SAN_scores(list(test.answers.all()))
        PsychologicalData.objects.update_or_create(
            daily_record=daily_record,
            defaults={
                "wellbeing": scores["wellbeing"],
                "activity": scores["activity"],
                "mood": scores["mood"],
            },
        )

        daily_record.refresh_from_db()
        overall_scores = calculate_if_ready(daily_record)

    return scores, overall_scores


def save_complete_record(profile, payload, request):
    physical_payload = payload.get("physical_data") or {}
    answers_payload = payload.get("answers", [])
    answers, san_errors = validate_san_answers(answers_payload)
    if san_errors:
        raise CompleteRecordValidationError(san_errors)

    record_date = get_new_record_date(profile, payload.get("date"))
    notes = str(payload.get("notes", "")).strip()

    try:
        with transaction.atomic():
            daily_record = DailyRecord.objects.create(
                athlete_profile=profile,
                date=record_date,
                notes=notes,
            )
            serializer = build_physical_serializer(
                daily_record=daily_record,
                payload=physical_payload,
                request=request,
            )
            if not serializer.is_valid():
                raise CompleteRecordValidationError(json_safe_errors(serializer._errors))

            serializer.save(daily_record=daily_record)
            san_scores, overall_scores = save_san_results(
                profile=profile,
                daily_record=daily_record,
                answers=answers,
            )
            daily_record.refresh_from_db()
    except IntegrityError as exc:
        raise CompleteRecordValidationError(
            {"date": ["За выбранную дату уже есть запись в дневнике."]}
        ) from exc

    return daily_record, san_scores, overall_scores
