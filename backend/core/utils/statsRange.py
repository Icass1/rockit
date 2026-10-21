from datetime import datetime, timedelta, timezone


def parse_range(
    range_value: str,
    custom_start: datetime | None = None,
    custom_end: datetime | None = None,
) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    end_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(
        days=1
    )

    if range_value == "7d":
        start_date = end_of_today - timedelta(days=7)
        end_date = end_of_today
    elif range_value == "30d":
        start_date = end_of_today - timedelta(days=30)
        end_date = end_of_today
    elif range_value == "1y":
        start_date = end_of_today - timedelta(days=365)
        end_date = end_of_today
    elif range_value == "custom" and custom_start and custom_end:
        start_date = custom_start
        end_date = custom_end
    elif range_value == "all":
        start_date = now
        end_date = end_of_today
    else:
        start_date = end_of_today - timedelta(days=7)
        end_date = end_of_today

    return start_date, end_date


def get_group_by(
    range_value: str,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> str:
    if range_value == "7d":
        return "day"
    elif range_value == "30d":
        return "week"
    elif range_value == "1y":
        return "month"
    elif range_value == "all":
        return "month"
    elif range_value == "custom" and start_date and end_date:
        days = (end_date - start_date).days
        if days <= 1:
            return "hour"
        elif days <= 31:
            return "day"
        elif days <= 90:
            return "week"
        else:
            return "month"
    return "week"
