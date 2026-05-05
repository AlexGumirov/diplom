SAN_QUESTIONS = [
    {"number": 1, "left_text": "Самочувствие хорошее", "right_text": "Самочувствие плохое"},
    {"number": 2, "left_text": "Чувствую себя сильным", "right_text": "Чувствую себя слабым"},
    {"number": 3, "left_text": "Пассивный", "right_text": "Активный"},
    {"number": 4, "left_text": "Малоподвижный", "right_text": "Подвижный"},
    {"number": 5, "left_text": "Веселый", "right_text": "Грустный"},
    {"number": 6, "left_text": "Хорошее настроение", "right_text": "Плохое настроение"},
    {"number": 7, "left_text": "Работоспособный", "right_text": "Разбитый"},
    {"number": 8, "left_text": "Полный сил", "right_text": "Обессиленный"},
    {"number": 9, "left_text": "Медлительный", "right_text": "Быстрый"},
    {"number": 10, "left_text": "Бездеятельный", "right_text": "Деятельный"},
    {"number": 11, "left_text": "Счастливый", "right_text": "Несчастный"},
    {"number": 12, "left_text": "Жизнерадостный", "right_text": "Мрачный"},
    {"number": 13, "left_text": "Напряженный", "right_text": "Расслабленный"},
    {"number": 14, "left_text": "Здоровый", "right_text": "Больной"},
    {"number": 15, "left_text": "Безучастный", "right_text": "Увлеченный"},
    {"number": 16, "left_text": "Равнодушный", "right_text": "Взволнованный"},
    {"number": 17, "left_text": "Восторженный", "right_text": "Унылый"},
    {"number": 18, "left_text": "Радостный", "right_text": "Печальный"},
    {"number": 19, "left_text": "Отдохнувший", "right_text": "Усталый"},
    {"number": 20, "left_text": "Свежий", "right_text": "Изнуренный"},
    {"number": 21, "left_text": "Сонливый", "right_text": "Возбужденный"},
    {"number": 22, "left_text": "Желание отдохнуть", "right_text": "Желание работать"},
    {"number": 23, "left_text": "Спокойный", "right_text": "Озабоченный"},
    {"number": 24, "left_text": "Оптимистичный", "right_text": "Пессимистичный"},
    {"number": 25, "left_text": "Выносливый", "right_text": "Утомляемый"},
    {"number": 26, "left_text": "Бодрый", "right_text": "Вялый"},
    {"number": 27, "left_text": "Соображать трудно", "right_text": "Соображать легко"},
    {"number": 28, "left_text": "Рассеянный", "right_text": "Внимательный"},
    {"number": 29, "left_text": "Полный надежд", "right_text": "Разочарованный"},
    {"number": 30, "left_text": "Довольный", "right_text": "Недовольный"},
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
