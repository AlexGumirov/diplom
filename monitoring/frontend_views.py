import json
from dataclasses import dataclass

from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login as auth_login
from django.db import transaction
from django.http import HttpResponseBadRequest, JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import AthleteProfile, DailyRecord, PhysicalData, PsychologicalData, SANAnswer, SANTest
from .serializers import PhysicalDataSerializer
from .services.calculations import calculate_record_scores
from .services.san import SAN_QUESTIONS, calculate_SAN_scores


@dataclass
class SANAnswerPayload:
    question_number: int
    value: int


def _get_profile(request):
    return AthleteProfile.objects.get_or_create(user=request.user)[0]


def _serialize_profile(profile):
    return {
        "id": profile.id,
        "username": profile.user.username,
        "display_name": profile.user.get_full_name() or profile.user.username,
        "age": profile.age,
        "gender": profile.get_gender_display() if profile.gender else "",
        "sport": profile.sport,
    }


def _serialize_record(record):
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


def _records_queryset(profile):
    return (
        DailyRecord.objects.filter(athlete_profile=profile)
        .select_related("physical_data", "psychological_data", "state_score")
        .order_by("-date")
    )


def _get_record_date(raw_date):
    if raw_date:
        parsed = parse_date(raw_date)
        if parsed is None:
            raise ValueError("Invalid date format. Use YYYY-MM-DD.")
        return parsed
    return timezone.localdate()


def _get_or_create_daily_record(profile, raw_date):
    record_date = _get_record_date(raw_date)
    daily_record, _ = DailyRecord.objects.get_or_create(
        athlete_profile=profile,
        date=record_date,
    )
    return daily_record


def _calculate_if_ready(daily_record):
    if hasattr(daily_record, "physical_data") and hasattr(daily_record, "psychological_data"):
        return calculate_record_scores(daily_record)
    return None


def _json_safe_errors(errors):
    return json.loads(json.dumps(errors, default=str))


def _build_delta(current, previous, threshold=0.3):
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
    if delta > threshold:
        status = "improvement"
    elif delta < -threshold:
        status = "deterioration"
    else:
        status = "stable"

    return {
        "status": status,
        "delta": delta,
        "previous_date": previous.date.isoformat(),
        "current_date": current.date.isoformat(),
    }


@ensure_csrf_cookie
def login_page(request):
    form = AuthenticationForm(request, data=request.POST or None)
    error_message = ""
    next_url = request.POST.get("next") or request.GET.get("next") or "/"

    if request.method == "POST":
        if form.is_valid():
            auth_login(request, form.get_user())
            return redirect(next_url)
        error_message = "Неверный логин или пароль."

    return render(
        request,
        "registration/login.html",
        {
            "title": "Вход в систему",
            "form": form,
            "error_message": error_message,
            "next": next_url,
        },
    )


@login_required(login_url="/login/")
@never_cache
@ensure_csrf_cookie
def spa_index(request):
    response = render(request, "monitoring/spa.html", {"title": "Athlete Monitor"})
    response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response


@login_required(login_url="/login/")
@require_GET
def app_bootstrap(request):
    profile = _get_profile(request)
    records = list(_records_queryset(profile))

    latest_with_score = next((record for record in records if getattr(record, "state_score", None)), None)
    previous_with_score = None
    if latest_with_score:
        latest_index = records.index(latest_with_score)
        previous_with_score = next(
            (
                record
                for record in records[latest_index + 1 :]
                if getattr(record, "state_score", None)
            ),
            None,
        )

    payload = {
        "profile": _serialize_profile(profile),
        "records": [_serialize_record(record) for record in records],
        "latest_delta": _build_delta(latest_with_score, previous_with_score),
        "questions": [
            {
                "number": question["number"],
                "left_text": question["left_text"],
                "right_text": question["right_text"],
            }
            for question in SAN_QUESTIONS
        ],
    }
    return JsonResponse(payload)


@login_required(login_url="/login/")
@require_POST
def save_physical_data(request):
    profile = _get_profile(request)

    try:
        payload = json.loads(request.body or "{}")
        daily_record = _get_or_create_daily_record(profile, payload.get("date"))
    except (json.JSONDecodeError, ValueError) as exc:
        return HttpResponseBadRequest(str(exc))

    physical_instance = PhysicalData.objects.filter(daily_record=daily_record).first()
    serializer = PhysicalDataSerializer(
        instance=physical_instance,
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

    if not serializer.is_valid():
        return JsonResponse({"errors": _json_safe_errors(serializer._errors)}, status=400)

    serializer.save(daily_record=daily_record)
    daily_record.refresh_from_db()
    scores = _calculate_if_ready(daily_record)

    return JsonResponse(
        {
            "record": _serialize_record(daily_record),
            "scores": scores,
        },
        status=201 if physical_instance is None else 200,
    )


@login_required(login_url="/login/")
@require_POST
def submit_san_test(request):
    profile = _get_profile(request)

    try:
        payload = json.loads(request.body or "{}")
        answers_payload = payload.get("answers", [])
        daily_record = _get_or_create_daily_record(profile, payload.get("date"))
    except (json.JSONDecodeError, ValueError) as exc:
        return HttpResponseBadRequest(str(exc))

    if len(answers_payload) != len(SAN_QUESTIONS):
        return JsonResponse(
            {"errors": {"answers": ["Exactly 30 SAN answers are required."]}},
            status=400,
        )

    normalized_answers = []
    seen_numbers = set()
    for item in answers_payload:
        try:
            question_number = int(item["question_number"])
            value = int(item["value"])
        except (KeyError, TypeError, ValueError):
            return JsonResponse(
                {"errors": {"answers": ["Each SAN answer must contain integer question_number and value."]}},
                status=400,
            )

        if question_number in seen_numbers:
            return JsonResponse(
                {"errors": {"answers": [f"Duplicate answer for question {question_number}."]}},
                status=400,
            )
        if not 1 <= question_number <= 30:
            return JsonResponse(
                {"errors": {"answers": [f"Question number {question_number} is out of range."]}},
                status=400,
            )
        if not 1 <= value <= 7:
            return JsonResponse(
                {"errors": {"answers": [f"Answer value for question {question_number} must be between 1 and 7."]}},
                status=400,
            )

        seen_numbers.add(question_number)
        normalized_answers.append(SANAnswerPayload(question_number=question_number, value=value))

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
                for answer in normalized_answers
            ]
        )

        answers = list(test.answers.all())
        scores = calculate_SAN_scores(answers)
        PsychologicalData.objects.update_or_create(
            daily_record=daily_record,
            defaults={
                "wellbeing": scores["wellbeing"],
                "activity": scores["activity"],
                "mood": scores["mood"],
            },
        )

        daily_record.refresh_from_db()
        overall_scores = _calculate_if_ready(daily_record)

    return JsonResponse(
        {
            "san_scores": scores,
            "record": _serialize_record(daily_record),
            "scores": overall_scores,
        },
        status=201,
    )


@login_required(login_url="/login/")
@require_POST
def save_full_record(request):
    """Compatibility endpoint for an old cached frontend bundle.

    The current UI saves physical data and SAN answers with two separate buttons.
    This endpoint is kept only so a browser with stale JS does not receive a 404.
    """
    profile = _get_profile(request)

    try:
        payload = json.loads(request.body or "{}")
        answers_payload = payload.get("answers", [])
        daily_record = _get_or_create_daily_record(profile, payload.get("date"))
    except (json.JSONDecodeError, ValueError) as exc:
        return HttpResponseBadRequest(str(exc))

    if len(answers_payload) != len(SAN_QUESTIONS):
        return JsonResponse(
            {"errors": {"answers": ["Exactly 30 SAN answers are required."]}},
            status=400,
        )

    normalized_answers = []
    seen_numbers = set()
    for item in answers_payload:
        try:
            question_number = int(item["question_number"])
            value = int(item["value"])
        except (KeyError, TypeError, ValueError):
            return JsonResponse(
                {"errors": {"answers": ["Each SAN answer must contain integer question_number and value."]}},
                status=400,
            )

        if question_number in seen_numbers:
            return JsonResponse(
                {"errors": {"answers": [f"Duplicate answer for question {question_number}."]}},
                status=400,
            )
        if not 1 <= question_number <= 30:
            return JsonResponse(
                {"errors": {"answers": [f"Question number {question_number} is out of range."]}},
                status=400,
            )
        if not 1 <= value <= 7:
            return JsonResponse(
                {"errors": {"answers": [f"Answer value for question {question_number} must be between 1 and 7."]}},
                status=400,
            )

        seen_numbers.add(question_number)
        normalized_answers.append(SANAnswerPayload(question_number=question_number, value=value))

    physical_instance = PhysicalData.objects.filter(daily_record=daily_record).first()
    serializer = PhysicalDataSerializer(
        instance=physical_instance,
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

    if not serializer.is_valid():
        return JsonResponse({"errors": _json_safe_errors(serializer._errors)}, status=400)

    with transaction.atomic():
        serializer.save(daily_record=daily_record)

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
                for answer in normalized_answers
            ]
        )

        answers = list(test.answers.all())
        san_scores = calculate_SAN_scores(answers)
        PsychologicalData.objects.update_or_create(
            daily_record=daily_record,
            defaults={
                "wellbeing": san_scores["wellbeing"],
                "activity": san_scores["activity"],
                "mood": san_scores["mood"],
            },
        )

        daily_record.refresh_from_db()
        scores = _calculate_if_ready(daily_record)

    return JsonResponse(
        {
            "san_scores": san_scores,
            "record": _serialize_record(daily_record),
            "scores": scores,
        },
        status=201 if physical_instance is None else 200,
    )
