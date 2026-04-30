SAN_QUESTIONS = [
    {"number": 1, "left_text": "Самочувствие хорошее", "right_text": "Самочувствие плохое"},
    {"number": 2, "left_text": "Чувствую себя сильным", "right_text": "Чувствую себя слабым"},
    {"number": 3, "left_text": "Активный", "right_text": "Пассивный"},
    {"number": 4, "left_text": "Подвижный", "right_text": "Малоподвижный"},
    {"number": 5, "left_text": "Веселый", "right_text": "Грустный"},
    {"number": 6, "left_text": "Хорошее настроение", "right_text": "Плохое настроение"},
    {"number": 7, "left_text": "Работоспособный", "right_text": "Разбитый"},
    {"number": 8, "left_text": "Полный сил", "right_text": "Обессиленный"},
    {"number": 9, "left_text": "Быстрый", "right_text": "Медлительный"},
    {"number": 10, "left_text": "Деятельный", "right_text": "Бездеятельный"},
    {"number": 11, "left_text": "Счастливый", "right_text": "Несчастный"},
    {"number": 12, "left_text": "Жизнерадостный", "right_text": "Мрачный"},
    {"number": 13, "left_text": "Напряженный", "right_text": "Расслабленный"},
    {"number": 14, "left_text": "Здоровый", "right_text": "Больной"},
    {"number": 15, "left_text": "Увлеченный", "right_text": "Безразличный"},
    {"number": 16, "left_text": "Заинтересованный", "right_text": "Равнодушный"},
    {"number": 17, "left_text": "Восторженный", "right_text": "Унылый"},
    {"number": 18, "left_text": "Радостный", "right_text": "Печальный"},
    {"number": 19, "left_text": "Отдохнувший", "right_text": "Усталый"},
    {"number": 20, "left_text": "Свежий", "right_text": "Изнуренный"},
    {"number": 21, "left_text": "Энергичный", "right_text": "Вялый"},
    {"number": 22, "left_text": "Бодрый", "right_text": "Сонливый"},
    {"number": 23, "left_text": "Спокойный", "right_text": "Взволнованный"},
    {"number": 24, "left_text": "Оптимистичный", "right_text": "Пессимистичный"},
    {"number": 25, "left_text": "Выносливый", "right_text": "Утомленный"},
    {"number": 26, "left_text": "Полный энергии", "right_text": "Истощенный"},
    {"number": 27, "left_text": "Собранный", "right_text": "Рассеянный"},
    {"number": 28, "left_text": "Готов действовать", "right_text": "Не готов действовать"},
    {"number": 29, "left_text": "Довольный", "right_text": "Недовольный"},
    {"number": 30, "left_text": "Приятное настроение", "right_text": "Неприятное настроение"},
]

SAN_GROUPS = {
    "wellbeing": [1, 2, 7, 8, 13, 14, 19, 20, 25, 26],
    "activity": [3, 4, 9, 10, 15, 16, 21, 22, 27, 28],
    "mood": [5, 6, 11, 12, 17, 18, 23, 24, 29, 30],
}

SAN_LABELS = {
    "wellbeing": "Самочувствие",
    "activity": "Активность",
    "mood": "Настроение",
}


def raw_to_san_value(value):
    return int(value) + 4


def calculate_SAN_scores(answers):
    values_by_question = {answer.question_number: answer.value for answer in answers}

    scores = {}
    for group, question_numbers in SAN_GROUPS.items():
        group_values = [values_by_question[number] for number in question_numbers]
        scores[group] = round(sum(group_values) / 10, 2)
    return scores


def interpret_SAN_score(score):
    if score < 4:
        return "плохое состояние"
    if score <= 5.5:
        return "нормальное состояние"
    return "хорошее состояние"


def get_question(number):
    return SAN_QUESTIONS[number - 1]
