from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils import timezone
from django.shortcuts import get_object_or_404, redirect, render

from .forms import SANAnswerForm
from .models import AthleteProfile, DailyRecord, PsychologicalData, SANAnswer, SANTest
from .services.san import (
    SAN_LABELS,
    SAN_QUESTIONS,
    calculate_SAN_scores,
    get_question,
    interpret_SAN_score,
)

PAGE_TITLES = {
    "dashboard": "Панель состояния",
    "athletes": "Спортсмены",
    "records": "Дневные записи",
    "physical": "Физические данные",
    "psychological": "Психологические данные",
    "analysis": "Аналитика",
    "san": "Тест САН",
}


@ensure_csrf_cookie
def dashboard(request):
    return render(
        request,
        "monitoring/dashboard.html",
        {"page": "dashboard", "title": PAGE_TITLES["dashboard"]},
    )


@ensure_csrf_cookie
def athletes(request):
    return render(
        request,
        "monitoring/athletes.html",
        {"page": "athletes", "title": PAGE_TITLES["athletes"]},
    )


@ensure_csrf_cookie
def records(request):
    return render(
        request,
        "monitoring/records.html",
        {"page": "records", "title": PAGE_TITLES["records"]},
    )


@ensure_csrf_cookie
def physical(request):
    return render(
        request,
        "monitoring/physical.html",
        {"page": "physical", "title": PAGE_TITLES["physical"]},
    )


@ensure_csrf_cookie
def psychological(request):
    return render(
        request,
        "monitoring/psychological.html",
        {"page": "psychological", "title": PAGE_TITLES["psychological"]},
    )


@ensure_csrf_cookie
def analysis(request):
    return render(
        request,
        "monitoring/analysis.html",
        {"page": "analysis", "title": PAGE_TITLES["analysis"]},
    )


@login_required(login_url="/admin/login/")
def san_start(request):
    profile, _ = AthleteProfile.objects.get_or_create(user=request.user)
    daily_record, _ = DailyRecord.objects.get_or_create(
        athlete_profile=profile,
        date=timezone.localdate(),
    )
    test = SANTest.objects.create(athlete_profile=profile, daily_record=daily_record)
    return redirect("san-test", test_id=test.id)


@login_required(login_url="/admin/login/")
def san_test(request, test_id):
    test = get_object_or_404(SANTest, id=test_id, athlete_profile__user=request.user)
    answered_numbers = set(test.answers.values_list("question_number", flat=True))
    next_number = next(
        (question["number"] for question in SAN_QUESTIONS if question["number"] not in answered_numbers),
        None,
    )

    if next_number is None:
        return redirect("san-result", test_id=test.id)

    question = get_question(next_number)
    progress = round((len(answered_numbers) / len(SAN_QUESTIONS)) * 100)

    if request.method == "POST":
        form = SANAnswerForm(request.POST)
        if form.is_valid():
            SANAnswer.objects.update_or_create(
                test=test,
                question_number=next_number,
                defaults={"value": form.cleaned_data["value"] + 4},
            )
            if next_number == len(SAN_QUESTIONS):
                return redirect("san-result", test_id=test.id)
            return redirect("san-test", test_id=test.id)
    else:
        form = SANAnswerForm()

    return render(
        request,
        "monitoring/test.html",
        {
            "page": "san",
            "title": PAGE_TITLES["san"],
            "test": test,
            "form": form,
            "question": question,
            "question_count": len(SAN_QUESTIONS),
            "progress": progress,
            "scale": [
                {"label": "3", "value": 3},
                {"label": "2", "value": 2},
                {"label": "1", "value": 1},
                {"label": "0", "value": 0},
                {"label": "1", "value": -1},
                {"label": "2", "value": -2},
                {"label": "3", "value": -3},
            ],
        },
    )


@login_required(login_url="/admin/login/")
def san_result(request, test_id):
    test = get_object_or_404(SANTest, id=test_id, athlete_profile__user=request.user)
    answers = list(test.answers.all())

    if len(answers) < len(SAN_QUESTIONS):
        return redirect("san-test", test_id=test.id)

    scores = calculate_SAN_scores(answers)
    PsychologicalData.objects.update_or_create(
        daily_record=test.daily_record,
        defaults={
            "wellbeing": round(scores["wellbeing"]),
            "activity": round(scores["activity"]),
            "mood": round(scores["mood"]),
        },
    )
    result_items = [
        {
            "label": SAN_LABELS[key],
            "score": value,
            "interpretation": interpret_SAN_score(value),
        }
        for key, value in scores.items()
    ]

    return render(
        request,
        "monitoring/result.html",
        {
            "page": "san",
            "title": "Результаты САН",
            "test": test,
            "result_items": result_items,
        },
    )
