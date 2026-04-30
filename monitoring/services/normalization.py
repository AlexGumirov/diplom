NORMALIZED_MIN = 1.0
NORMALIZED_MAX = 10.0


def _to_float(value):
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _clamp(value, min_val=NORMALIZED_MIN, max_val=NORMALIZED_MAX):
    return max(min_val, min(max_val, value))


def _round_score(value):
    return round(_clamp(value), 2)


def normalize_direct(value, min_val, max_val):
    """
    Прямая нормализация: чем больше исходное значение, тем лучше состояние.
    Формула: X_norm = 1 + 9 * (X - X_min) / (X_max - X_min).
    Используется для показателей, рост которых положительно влияет на оценку.
    """
    value = _to_float(value)
    min_val = _to_float(min_val)
    max_val = _to_float(max_val)
    if value is None or min_val is None or max_val is None or max_val == min_val:
        return None

    value = _clamp(value, min_val, max_val)
    normalized = 1 + 9 * (value - min_val) / (max_val - min_val)
    return _round_score(normalized)


def normalize_inverse(value, min_val, max_val):
    """
    Обратная нормализация: чем меньше исходное значение, тем лучше состояние.
    Формула: X_norm = 1 + 9 * (X_max - X) / (X_max - X_min).
    Используется для показателей, увеличение которых ухудшает состояние.
    """
    value = _to_float(value)
    min_val = _to_float(min_val)
    max_val = _to_float(max_val)
    if value is None or min_val is None or max_val is None or max_val == min_val:
        return None

    value = _clamp(value, min_val, max_val)
    normalized = 1 + 9 * (max_val - value) / (max_val - min_val)
    return _round_score(normalized)


def normalize_optimal(value, optimal, deviation):
    """
    Нормализация с оптимумом: лучшая оценка достигается около оптимального значения.
    Формула: X_norm = 10 - 9 * abs(X - X_opt) / D.
    Используется для показателей, где вредны и недостаток, и избыток.
    """
    value = _to_float(value)
    optimal = _to_float(optimal)
    deviation = _to_float(deviation)
    if value is None or optimal is None or deviation is None or deviation == 0:
        return None

    normalized = 10 - 9 * abs(value - optimal) / deviation
    return _round_score(normalized)


def normalize_sleep(value):
    """
    Сон нормализуется по оптимуму 8 часов и допустимому отклонению 4 часа.
    Такой подход отражает, что недостаток и чрезмерная длительность сна ухудшают состояние.
    """
    return normalize_optimal(value, optimal=8, deviation=4)


def normalize_meals(value):
    """
    Количество приемов пищи нормализуется напрямую в диапазоне 0-5.
    Чем регулярнее питание в течение дня, тем выше оценка состояния.
    """
    return normalize_direct(value, min_val=0, max_val=5)


def normalize_heart_rate_rest(value):
    """
    ЧСС в покое нормализуется обратно в диапазоне 50-90.
    Более низкая ЧСС в допустимом диапазоне обычно соответствует лучшему восстановлению.
    """
    return normalize_inverse(value, min_val=50, max_val=90)


def normalize_heart_rate_load(value):
    """
    ЧСС при нагрузке нормализуется напрямую в диапазоне 90-220.
    В текущей математической модели большее значение трактуется как большая тренировочная активность.
    """
    return normalize_direct(value, min_val=90, max_val=220)


def normalize_recovery(value):
    """
    Время восстановления нормализуется обратно в диапазоне 1-5 минут.
    Чем быстрее спортсмен восстанавливается после нагрузки, тем выше оценка.
    """
    return normalize_inverse(value, min_val=1, max_val=5)


def normalize_fatigue(value):
    """
    Усталость нормализуется обратно в диапазоне 1-10.
    Чем выше субъективная усталость, тем ниже итоговая нормализованная оценка.
    """
    return normalize_inverse(value, min_val=1, max_val=10)


def normalize_rpe(value):
    """
    RPE нормализуется обратно в диапазоне 1-10.
    Чем тяжелее субъективно воспринимается нагрузка, тем ниже текущая оценка состояния.
    """
    return normalize_inverse(value, min_val=1, max_val=10)


def normalize_san(value):
    """
    Показатели САН нормализуются напрямую из диапазона 1-7 в диапазон 1-10.
    Более высокая оценка самочувствия, активности или настроения означает лучшее состояние.
    """
    return normalize_direct(value, min_val=1, max_val=7)


def normalize_all(data_dict):
    """
    Принимает словарь исходных значений и возвращает словарь нормализованных значений.
    Неизвестные ключи игнорируются, а некорректные или пустые значения возвращаются как None.
    """
    normalizers = {
        "sleep_hours": normalize_sleep,
        "meals": normalize_meals,
        "heart_rate_rest": normalize_heart_rate_rest,
        "heart_rate_load": normalize_heart_rate_load,
        "recovery_time": normalize_recovery,
        "fatigue": normalize_fatigue,
        "rpe": normalize_rpe,
        "wellbeing": normalize_san,
        "activity": normalize_san,
        "mood": normalize_san,
    }

    return {
        key: normalizer(data_dict.get(key))
        for key, normalizer in normalizers.items()
        if key in data_dict
    }


def normalize_heart_rate(value, min_value=50, max_value=90, reverse=True):
    """
    Совместимость со старым кодом расчетов.
    При reverse=True используется обратная нормализация, иначе прямая.
    """
    if reverse:
        return normalize_inverse(value, min_value, max_value)
    return normalize_direct(value, min_value, max_value)


def normalize_psychological(value):
    """
    Совместимость со старым названием функции для психологических показателей САН.
    """
    return normalize_san(value)
