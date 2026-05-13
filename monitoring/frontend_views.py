import json

from django.contrib.auth import login as auth_login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.http import HttpResponseBadRequest, JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import PhysicalData
from .presenters import serialize_profile, serialize_record, serialize_san_questions
from .serializers import AthleteProfileSerializer
from .services.analysis import (
    aggregated_delta,
    build_anomaly_report,
    build_correlation_report,
    delta_between_neighbors,
)
from .services.record_workflow import (
    CompleteRecordValidationError,
    build_delta,
    build_physical_serializer,
    calculate_if_ready,
    get_or_create_daily_record,
    get_or_create_profile,
    get_records_for_profile,
    json_safe_errors,
    save_complete_record,
    save_san_results,
    validate_san_answers,
)

PERIOD_VALUES = {"7", "14", "31", "all", "neighbors"}
CORRELATION_PERIOD_VALUES = {"7", "14", "31", "all"}
DELTA_METRICS = {
    "overall": "total_score",
    "physical": "physical_score",
    "psychological": "psychological_score",
}


def _read_json_body(request):
    try:
        return json.loads(request.body or "{}")
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid JSON body.") from exc


def _scored_records_ascending(records, score_field="total_score"):
    return [
        record
        for record in sorted(records, key=lambda item: item.date)
        if getattr(getattr(record, "state_score", None), score_field, None) is not None
    ]


def _records_for_period(records, period, score_field="total_score"):
    scored_records = _scored_records_ascending(records, score_field)
    if period in {"all", "neighbors"}:
        return scored_records
    return scored_records[-int(period) :]


def _complete_records_ascending(records):
    complete_records = []
    for record in sorted(records, key=lambda item: item.date):
        if (
            getattr(record, "physical_data", None) is not None
            and getattr(record, "psychological_data", None) is not None
            and getattr(record, "state_score", None) is not None
        ):
            complete_records.append(record)
    return complete_records


def _records_for_correlation_period(records, period):
    complete_records = _complete_records_ascending(records)
    if period == "all":
        return complete_records
    return complete_records[-int(period) :]


def _build_period_delta_payload(records, period, score_field="total_score"):
    period_records = _records_for_period(records, period, score_field)
    payload = {
        "period": period,
        "aggregated": aggregated_delta(period_records, score_field),
    }
    if period == "neighbors":
        payload["neighbors"] = delta_between_neighbors(period_records, score_field)
    return payload


def _build_delta_analysis_payload(records):
    return {
        metric: {
            period: _build_period_delta_payload(records, period, score_field)
            for period in ("7", "14", "31", "all", "neighbors")
        }
        for metric, score_field in DELTA_METRICS.items()
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
    profile = get_or_create_profile(request.user)
    records = list(get_records_for_profile(profile))
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

    return JsonResponse(
        {
            "profile": serialize_profile(profile),
            "records": [serialize_record(record) for record in records],
            "latest_delta": build_delta(latest_with_score, previous_with_score),
            "delta_analysis": _build_delta_analysis_payload(records),
            "questions": serialize_san_questions(),
        }
    )


@login_required(login_url="/login/")
@require_GET
def app_delta_analysis(request):
    period = request.GET.get("period", "7")
    metric = request.GET.get("metric", "overall")
    if period not in PERIOD_VALUES:
        return JsonResponse(
            {"errors": {"period": ["Use one of: 7, 14, 31, all, neighbors."]}},
            status=400,
        )
    if metric not in DELTA_METRICS:
        return JsonResponse(
            {"errors": {"metric": ["Use one of: overall, physical, psychological."]}},
            status=400,
        )

    profile = get_or_create_profile(request.user)
    records = list(get_records_for_profile(profile))
    return JsonResponse(_build_period_delta_payload(records, period, DELTA_METRICS[metric]))


@login_required(login_url="/login/")
@require_GET
def app_correlations(request):
    period = request.GET.get("period", "7")
    if period not in CORRELATION_PERIOD_VALUES:
        return JsonResponse(
            {"errors": {"period": ["Use one of: 7, 14, 31, all."]}},
            status=400,
        )

    try:
        top_n = int(request.GET.get("top_n", "3"))
    except ValueError:
        return JsonResponse(
            {"errors": {"top_n": ["Use a positive integer."]}},
            status=400,
        )

    profile = get_or_create_profile(request.user)
    records = list(get_records_for_profile(profile))
    period_records = _records_for_correlation_period(records, period)
    return JsonResponse(build_correlation_report(period_records, top_n=top_n))


@login_required(login_url="/login/")
@require_GET
def app_anomalies(request):
    profile = get_or_create_profile(request.user)
    records = list(get_records_for_profile(profile))
    athlete_name = profile.user.get_full_name() or profile.user.username
    return JsonResponse(build_anomaly_report(records, athlete_name=athlete_name))


@login_required(login_url="/login/")
@require_POST
def update_profile(request):
    profile = get_or_create_profile(request.user)

    try:
        payload = _read_json_body(request)
    except ValueError as exc:
        return HttpResponseBadRequest(str(exc))

    display_name = str(payload.get("display_name", "")).strip()
    if display_name:
        name_parts = display_name.split(maxsplit=1)
        request.user.first_name = name_parts[0]
        request.user.last_name = name_parts[1] if len(name_parts) > 1 else ""
    else:
        request.user.first_name = ""
        request.user.last_name = ""

    raw_age = payload.get("age")
    age = None if raw_age == "" else raw_age
    serializer = AthleteProfileSerializer(
        profile,
        data={
            "age": age,
            "gender": payload.get("gender", ""),
            "sport": payload.get("sport", ""),
        },
        partial=True,
    )

    if not serializer.is_valid():
        return JsonResponse({"errors": json_safe_errors(serializer._errors)}, status=400)

    request.user.save(update_fields=["first_name", "last_name"])
    serializer.save()
    profile.refresh_from_db()
    return JsonResponse({"profile": serialize_profile(profile)})


@login_required(login_url="/login/")
@require_POST
def save_physical_data(request):
    profile = get_or_create_profile(request.user)

    try:
        payload = _read_json_body(request)
        daily_record = get_or_create_daily_record(profile, payload.get("date"))
    except ValueError as exc:
        return HttpResponseBadRequest(str(exc))

    physical_instance = PhysicalData.objects.filter(daily_record=daily_record).first()
    serializer = build_physical_serializer(
        daily_record=daily_record,
        payload=payload,
        request=request,
        instance=physical_instance,
    )

    if not serializer.is_valid():
        return JsonResponse({"errors": json_safe_errors(serializer._errors)}, status=400)

    serializer.save(daily_record=daily_record)
    daily_record.refresh_from_db()

    return JsonResponse(
        {
            "record": serialize_record(daily_record),
            "scores": calculate_if_ready(daily_record),
        },
        status=201 if physical_instance is None else 200,
    )


@login_required(login_url="/login/")
@require_POST
def save_complete_daily_record(request):
    profile = get_or_create_profile(request.user)

    try:
        payload = _read_json_body(request)
        daily_record, san_scores, overall_scores = save_complete_record(
            profile=profile,
            payload=payload,
            request=request,
        )
    except ValueError as exc:
        return JsonResponse({"errors": {"date": [str(exc)]}}, status=400)
    except CompleteRecordValidationError as exc:
        return JsonResponse({"errors": exc.errors}, status=400)

    return JsonResponse(
        {
            "message": "Данные сохранены.",
            "san_scores": san_scores,
            "record": serialize_record(daily_record),
            "scores": overall_scores,
        },
        status=201,
    )


@login_required(login_url="/login/")
@require_POST
def submit_san_test(request):
    profile = get_or_create_profile(request.user)

    try:
        payload = _read_json_body(request)
        daily_record = get_or_create_daily_record(profile, payload.get("date"))
    except ValueError as exc:
        return HttpResponseBadRequest(str(exc))

    answers, errors = validate_san_answers(payload.get("answers", []))
    if errors:
        return JsonResponse({"errors": errors}, status=400)

    san_scores, overall_scores = save_san_results(
        profile=profile,
        daily_record=daily_record,
        answers=answers,
    )

    return JsonResponse(
        {
            "san_scores": san_scores,
            "record": serialize_record(daily_record),
            "scores": overall_scores,
        },
        status=201,
    )
