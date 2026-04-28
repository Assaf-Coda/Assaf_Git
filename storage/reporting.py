from datetime import date, datetime, timedelta
from typing import Iterable, List, Mapping

GB_PER_TB = 1024.0


def _coerce_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            raise ValueError("Empty date value")
        try:
            return datetime.strptime(text[:10], "%Y-%m-%d").date()
        except ValueError:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    raise ValueError(f"Unsupported date value: {value!r}")


def _coerce_float(value):
    if value is None or value == "":
        return 0.0
    return float(value)


def normalize_usage_rows(rows: Iterable[Mapping]) -> List[dict]:
    normalized = []
    for row in rows:
        row_date = _coerce_date(row.get("date") or row.get("endTime") or row.get("end_time"))
        active_storage_tb = _coerce_float(row.get("active_storage_tb") if row.get("active_storage_tb") is not None else row.get("activeStorage"))
        deleted_storage_tb = _coerce_float(row.get("deleted_storage_tb") if row.get("deleted_storage_tb") is not None else row.get("deletedStorage"))

        normalized.append(
            {
                "date": row_date,
                "active_storage_tb": active_storage_tb,
                "deleted_storage_tb": deleted_storage_tb,
                "raw": dict(row),
            }
        )

    normalized.sort(key=lambda item: item["date"])
    return normalized


def build_usage_report(rows: Iterable[Mapping], start_date, end_date, account=None, preset_applied=False):
    start = _coerce_date(start_date)
    end = _coerce_date(end_date)
    if end < start:
        raise ValueError("end_date must be on or after start_date")

    normalized_rows = normalize_usage_rows(rows)
    filtered_rows = [row for row in normalized_rows if start <= row["date"] <= end]

    monthly_totals = {}
    daily_rows = []

    for row in filtered_rows:
        month_key = row["date"].strftime("%Y-%m")
        active_gb = row["active_storage_tb"] * GB_PER_TB
        deleted_gb = row["deleted_storage_tb"] * GB_PER_TB
        bucket = monthly_totals.setdefault(
            month_key,
            {
                "active_gb": 0.0,
                "deleted_gb": 0.0,
            },
        )
        bucket["active_gb"] += active_gb
        bucket["deleted_gb"] += deleted_gb
        daily_rows.append(
            {
                "date": row["date"].isoformat(),
                "active_storage_gb": round(active_gb, 6),
                "deleted_storage_gb": round(deleted_gb, 6),
                "active_storage_tb": round(row["active_storage_tb"], 6),
                "deleted_storage_tb": round(row["deleted_storage_tb"], 6),
            }
        )

    monthly_rows = []
    totals = {
        "active_gb": 0.0,
        "deleted_gb": 0.0,
        "active_tb": 0.0,
        "active_plus_deleted_gb": 0.0,
        "days": len(filtered_rows),
    }

    for month, values in sorted(monthly_totals.items()):
        active_gb = values["active_gb"]
        deleted_gb = values["deleted_gb"]
        active_tb = active_gb / GB_PER_TB
        combined_gb = active_gb + deleted_gb
        monthly_rows.append(
            {
                "month": month,
                "active_gb": round(active_gb, 6),
                "deleted_gb": round(deleted_gb, 6),
                "active_tb": round(active_tb, 6),
                "active_plus_deleted_gb": round(combined_gb, 6),
            }
        )
        totals["active_gb"] += active_gb
        totals["deleted_gb"] += deleted_gb
        totals["active_tb"] += active_tb
        totals["active_plus_deleted_gb"] += combined_gb

    return {
        "account": account or {},
        "range": {
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "preset_applied": preset_applied,
        },
        "daily_rows": daily_rows,
        "monthly_rows": monthly_rows,
        "totals": {
            "active_gb": round(totals["active_gb"], 6),
            "deleted_gb": round(totals["deleted_gb"], 6),
            "active_tb": round(totals["active_tb"], 6),
            "active_plus_deleted_gb": round(totals["active_plus_deleted_gb"], 6),
            "days": totals["days"],
        },
    }


def get_recent_quarter_window(today=None):
    today = _coerce_date(today or date.today())
    candidate_ends = [
        date(today.year - 1, 12, 20),
        date(today.year, 3, 20),
        date(today.year, 6, 20),
        date(today.year, 9, 20),
        date(today.year, 12, 20),
    ]
    end = max(candidate for candidate in candidate_ends if candidate < today)
    start = _quarter_start_from_end(end)
    return {"start_date": start.isoformat(), "end_date": end.isoformat(), "preset_applied": True}


def _quarter_start_from_end(end):
    previous_quarter_month = end.month - 3
    year = end.year
    if previous_quarter_month <= 0:
        previous_quarter_month += 12
        year -= 1
    previous_end = date(year, previous_quarter_month, 20)
    return previous_end + timedelta(days=1)
