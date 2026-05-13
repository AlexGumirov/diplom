from types import SimpleNamespace

from django.test import SimpleTestCase
from rest_framework import serializers

from monitoring.serializers import PhysicalDataSerializer
from monitoring.services.analysis import (
    aggregated_delta,
    build_correlation_report,
    delta_between_neighbors,
)
from monitoring.services.calculations import (
    calculate_physical_score,
    calculate_psychological_score,
    calculate_total_score,
)
from monitoring.services.normalization import (
    normalize_heart_rate_load,
    normalize_sleep,
)
from monitoring.services.san import (
    SAN_GROUPS,
    SAN_QUESTIONS,
    SAN_REVERSE_QUESTIONS,
    calculate_SAN_scores,
    normalize_san_answer_value,
)


class NormalizationTests(SimpleTestCase):
    def test_sleep_uses_direct_normalization_from_0_to_12(self):
        self.assertEqual(normalize_sleep(0), 1.0)
        self.assertEqual(normalize_sleep(6), 5.5)
        self.assertEqual(normalize_sleep(12), 10.0)

    def test_heart_rate_load_uses_inverse_normalization(self):
        self.assertEqual(normalize_heart_rate_load(90), 10.0)
        self.assertEqual(normalize_heart_rate_load(155), 5.5)
        self.assertEqual(normalize_heart_rate_load(220), 1.0)


class CalculationTests(SimpleTestCase):
    def test_physical_score_is_average_of_normalized_values(self):
        physical_data = SimpleNamespace(
            sleep_hours=12,
            meals=5,
            heart_rate_rest=50,
            heart_rate_load=90,
            recovery_time=1,
            fatigue=1,
            rpe=1,
        )

        self.assertEqual(calculate_physical_score(physical_data), 10.0)

    def test_psychological_score_is_average_of_normalized_values(self):
        psychological_data = SimpleNamespace(wellbeing=7, activity=4, mood=1)

        self.assertEqual(calculate_psychological_score(psychological_data), 5.5)

    def test_total_score_is_average_of_physical_and_psychological_scores(self):
        self.assertEqual(calculate_total_score(10, 5.5), 7.75)


class SANTests(SimpleTestCase):
    def test_san_uses_30_questions_and_10_questions_per_group(self):
        self.assertEqual(len(SAN_QUESTIONS), 30)
        self.assertEqual(set(SAN_GROUPS), {"wellbeing", "activity", "mood"})
        for question_numbers in SAN_GROUPS.values():
            self.assertEqual(len(question_numbers), 10)

    def test_reverse_questions_are_inverted(self):
        self.assertEqual(normalize_san_answer_value(3, 1), 7)
        self.assertEqual(normalize_san_answer_value(3, 7), 1)
        self.assertEqual(normalize_san_answer_value(1, 7), 7)

    def test_san_scores_apply_reverse_questions_before_averaging(self):
        good_answers = [
            SimpleNamespace(
                question_number=question["number"],
                value=1 if question["number"] in SAN_REVERSE_QUESTIONS else 7,
            )
            for question in SAN_QUESTIONS
        ]
        bad_answers = [
            SimpleNamespace(
                question_number=question["number"],
                value=7 if question["number"] in SAN_REVERSE_QUESTIONS else 1,
            )
            for question in SAN_QUESTIONS
        ]

        self.assertEqual(
            calculate_SAN_scores(good_answers),
            {"wellbeing": 7.0, "activity": 7.0, "mood": 7.0},
        )
        self.assertEqual(
            calculate_SAN_scores(bad_answers),
            {"wellbeing": 1.0, "activity": 1.0, "mood": 1.0},
        )


class SerializerValidationTests(SimpleTestCase):
    def test_sleep_hours_allows_vkr_range_0_to_12(self):
        serializer = PhysicalDataSerializer()

        self.assertEqual(serializer.validate_sleep_hours(12), 12)
        with self.assertRaises(serializers.ValidationError):
            serializer.validate_sleep_hours(12.1)


class DeltaAnalysisTests(SimpleTestCase):
    def test_delta_between_neighbors_returns_neighbor_differences(self):
        records = [
            SimpleNamespace(date="2026-05-01", state_score=SimpleNamespace(total_score=6.8)),
            SimpleNamespace(date="2026-05-02", state_score=SimpleNamespace(total_score=7.2)),
            SimpleNamespace(date="2026-05-03", state_score=SimpleNamespace(total_score=7.2)),
            SimpleNamespace(date="2026-05-04", state_score=SimpleNamespace(total_score=6.9)),
        ]

        self.assertEqual(
            delta_between_neighbors(records),
            [
                {
                    "from_date": "2026-05-01",
                    "to_date": "2026-05-02",
                    "previous_score": 6.8,
                    "current_score": 7.2,
                    "delta": 0.4,
                    "status": "improvement",
                },
                {
                    "from_date": "2026-05-02",
                    "to_date": "2026-05-03",
                    "previous_score": 7.2,
                    "current_score": 7.2,
                    "delta": 0.0,
                    "status": "stable",
                },
                {
                    "from_date": "2026-05-03",
                    "to_date": "2026-05-04",
                    "previous_score": 7.2,
                    "current_score": 6.9,
                    "delta": -0.3,
                    "status": "deterioration",
                },
            ],
        )

    def test_aggregated_delta_sums_neighbor_differences(self):
        records = [
            SimpleNamespace(date="2026-05-01", state_score=SimpleNamespace(total_score=6.8)),
            SimpleNamespace(date="2026-05-02", state_score=SimpleNamespace(total_score=7.2)),
            SimpleNamespace(date="2026-05-03", state_score=SimpleNamespace(total_score=6.9)),
        ]

        self.assertEqual(
            aggregated_delta(records),
            {
                "period_start": "2026-05-01",
                "period_end": "2026-05-03",
                "days_count": 3,
                "first_score": 6.8,
                "last_score": 6.9,
                "total_delta": 0.1,
                "status": "improvement",
            },
        )

    def test_aggregated_delta_requires_two_scored_records(self):
        records = [SimpleNamespace(date="2026-05-01", state_score=SimpleNamespace(total_score=6.8))]

        self.assertEqual(aggregated_delta(records)["status"], "insufficient_data")
        self.assertIsNone(aggregated_delta(records)["total_delta"])

    def test_delta_analysis_can_use_physical_or_psychological_scores(self):
        records = [
            SimpleNamespace(
                date="2026-05-01",
                state_score=SimpleNamespace(total_score=8.0, physical_score=4.0, psychological_score=7.0),
            ),
            SimpleNamespace(
                date="2026-05-02",
                state_score=SimpleNamespace(total_score=8.0, physical_score=6.0, psychological_score=5.0),
            ),
        ]

        self.assertEqual(aggregated_delta(records, "physical_score")["total_delta"], 2.0)
        self.assertEqual(aggregated_delta(records, "psychological_score")["total_delta"], -2.0)
        self.assertEqual(aggregated_delta(records, "total_score")["total_delta"], 0.0)


def make_correlation_record(
    index,
    sleep_hours=8,
    meals=3,
    heart_rate_rest=60,
    heart_rate_load=140,
    recovery_time=2,
    fatigue=5,
    rpe=5,
    wellbeing=4,
    activity=4,
    mood=4,
):
    return SimpleNamespace(
        date=f"2026-05-{index:02d}",
        physical_data=SimpleNamespace(
            sleep_hours=sleep_hours,
            meals=meals,
            heart_rate_rest=heart_rate_rest,
            heart_rate_load=heart_rate_load,
            recovery_time=recovery_time,
            fatigue=fatigue,
            rpe=rpe,
        ),
        psychological_data=SimpleNamespace(
            wellbeing=wellbeing,
            activity=activity,
            mood=mood,
        ),
        state_score=SimpleNamespace(
            physical_score=6,
            psychological_score=6,
            total_score=6,
        ),
    )


class CorrelationAnalysisTests(SimpleTestCase):
    def test_correlation_report_requires_seven_complete_records(self):
        records = [make_correlation_record(index) for index in range(1, 7)]

        report = build_correlation_report(records)

        self.assertEqual(report["status"], "insufficient_data")
        self.assertEqual(report["records_count"], 6)
        self.assertEqual(report["items"], [])

    def test_correlation_report_returns_strong_positive_direction(self):
        records = [
            make_correlation_record(index=index, sleep_hours=index, activity=index)
            for index in range(1, 8)
        ]

        report = build_correlation_report(records, top_n=20)
        pair = next(
            item
            for item in report["items"]
            if {item["left_key"], item["right_key"]} == {"sleep_hours", "activity"}
        )

        self.assertEqual(report["status"], "ok")
        self.assertEqual(pair["direction"], "positive")
        self.assertEqual(pair["strength"], "strong")
        self.assertEqual(pair["correlation"], 1.0)

    def test_correlation_report_returns_strong_negative_direction(self):
        records = [
            make_correlation_record(index=index, fatigue=index, mood=8 - index)
            for index in range(1, 8)
        ]

        report = build_correlation_report(records, top_n=20)
        pair = next(
            item
            for item in report["items"]
            if {item["left_key"], item["right_key"]} == {"fatigue", "mood"}
        )

        self.assertEqual(pair["direction"], "negative")
        self.assertEqual(pair["strength"], "strong")
        self.assertEqual(pair["correlation"], -1.0)

    def test_correlation_report_does_not_return_self_correlations(self):
        records = [
            make_correlation_record(index=index, sleep_hours=index, activity=index)
            for index in range(1, 8)
        ]

        report = build_correlation_report(records, top_n=20)

        for item in report["items"]:
            self.assertNotEqual(item["left_key"], item["right_key"])

    def test_correlation_report_does_not_return_duplicate_pairs(self):
        records = [
            make_correlation_record(index=index, sleep_hours=index, activity=index)
            for index in range(1, 8)
        ]

        report = build_correlation_report(records, top_n=20)
        pairs = [
            frozenset((item["left_key"], item["right_key"]))
            for item in report["items"]
        ]

        self.assertEqual(len(pairs), len(set(pairs)))

    def test_correlation_report_returns_only_one_physical_pair_per_psychological_scale(self):
        records = [
            make_correlation_record(
                index=index,
                sleep_hours=index,
                meals=index,
                fatigue=index,
                wellbeing=index,
                activity=index,
                mood=8 - index,
            )
            for index in range(1, 8)
        ]
        physical_keys = {
            "sleep_hours",
            "meals",
            "heart_rate_rest",
            "heart_rate_load",
            "recovery_time",
            "fatigue",
            "rpe",
        }
        psychological_keys = {"wellbeing", "activity", "mood"}

        report = build_correlation_report(records, top_n=20)
        psychological_targets = [item["right_key"] for item in report["items"]]

        self.assertEqual(psychological_targets, ["wellbeing", "activity", "mood"])
        for item in report["items"]:
            self.assertIn(item["left_key"], physical_keys)
            self.assertIn(item["right_key"], psychological_keys)
            self.assertNotIn(item["left_key"], {"physical_score", "psychological_score", "total_score"})
            self.assertNotIn(item["right_key"], {"physical_score", "psychological_score", "total_score"})

    def test_correlation_report_uses_pearson_coefficient(self):
        records = [
            make_correlation_record(
                index=index,
                sleep_hours=index,
                wellbeing=2 * index + 10,
                activity=4,
                mood=4,
            )
            for index in range(1, 8)
        ]

        report = build_correlation_report(records, top_n=20)
        pair = next(
            item
            for item in report["items"]
            if item["left_key"] == "sleep_hours" and item["right_key"] == "wellbeing"
        )

        self.assertEqual(pair["correlation"], 1.0)
        self.assertEqual(pair["abs_correlation"], 1.0)

    def test_correlation_report_filters_weak_correlations(self):
        weak_activity_values = [2, 6, 3, 5, 4, 1, 7]
        records = [
            make_correlation_record(
                index=index,
                sleep_hours=index,
                activity=weak_activity_values[index - 1],
            )
            for index in range(1, 8)
        ]

        report = build_correlation_report(records, top_n=20)

        self.assertEqual(report["items"], [])
