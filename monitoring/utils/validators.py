from rest_framework import serializers


def validate_range(value, minimum, maximum, field_name):
    if value < minimum or value > maximum:
        raise serializers.ValidationError(
            f"{field_name} must be in range {minimum}-{maximum}."
        )
    return value


def parse_recovery_time(value):
    """Accepts float minutes or a 'mm:ss' string and returns float minutes."""
    if isinstance(value, str):
        value = value.strip()
        parts = value.split(":")
        if len(parts) != 2:
            try:
                return float(value)
            except ValueError as exc:
                raise serializers.ValidationError(
                    "recovery_time must be a float or a string in mm:ss format."
                ) from exc
        try:
            minutes = int(parts[0])
            seconds = int(parts[1])
        except ValueError as exc:
            raise serializers.ValidationError(
                "recovery_time must contain numeric minutes and seconds."
            ) from exc
        if seconds < 0 or seconds >= 60:
            raise serializers.ValidationError("Seconds must be in range 0-59.")
        return minutes + seconds / 60

    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise serializers.ValidationError("recovery_time must be numeric.") from exc
