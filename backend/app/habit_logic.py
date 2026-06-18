"""
Cadence + streak logic, as pure functions over sets of log dates.

What makes streaks honest: not everything is daily. A Sunday rest day
shouldn't kill a gym streak.

  * daily      — streak = consecutive days
  * weekly     — N x per week; streak = consecutive weeks hitting the target
  * weekdays   — specific days; skipped (unscheduled) days don't break the streak

Streaks are always recomputed from logs, never stored — that's what lets a
backfilled missed day restore a streak with zero special-casing.
"""
from datetime import date, timedelta
from typing import Iterable, Optional, Set

CADENCE_DAILY = "daily"
CADENCE_WEEKLY = "weekly"
CADENCE_WEEKDAYS = "weekdays"


def week_start(d: date) -> date:
    """Monday of the week containing d."""
    return d - timedelta(days=d.weekday())


def is_scheduled_on(cadence_type: str, weekdays: Optional[Iterable[int]], d: date) -> bool:
    """
    Whether a habit is scheduled (counts toward day-complete) on a given date.
    Weekly-cadence habits live in the THIS WEEK section, not the daily list,
    so they are never 'scheduled' on a specific day.
    """
    if cadence_type == CADENCE_DAILY:
        return True
    if cadence_type == CADENCE_WEEKDAYS:
        return d.weekday() in set(weekdays or [])
    return False


# ---------------------------------------------------------------------------
# Current streaks (as of `today`, in the user's timezone)
# ---------------------------------------------------------------------------

def daily_streak(dates: Set[date], today: date) -> int:
    """Consecutive days. Today still pending doesn't break it; a missed yesterday does."""
    if today in dates:
        cursor = today
    elif (today - timedelta(days=1)) in dates:
        cursor = today - timedelta(days=1)
    else:
        return 0

    streak = 0
    while cursor in dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def weekdays_streak(dates: Set[date], weekdays: Iterable[int], today: date) -> int:
    """
    Consecutive *scheduled* days completed. Unscheduled days are skipped,
    and today still pending doesn't break the run.
    """
    scheduled = set(weekdays or [])
    if not scheduled:
        return 0

    cursor = today
    # Walk back to the most recent scheduled day.
    while cursor.weekday() not in scheduled:
        cursor -= timedelta(days=1)

    # Today (or the most recent scheduled day if today isn't scheduled) may
    # still be pending; if unlogged, start counting from the one before it.
    if cursor not in dates:
        if cursor != today:
            return 0  # a past scheduled day was missed
        cursor -= timedelta(days=1)
        while cursor.weekday() not in scheduled:
            cursor -= timedelta(days=1)

    streak = 0
    while cursor in dates:
        streak += 1
        cursor -= timedelta(days=1)
        while cursor.weekday() not in scheduled:
            cursor -= timedelta(days=1)
    return streak


def week_count(dates: Set[date], today: date) -> int:
    """Completions in the current week (Monday-start). Powers '2 of 3 this week'."""
    start = week_start(today)
    return sum(1 for d in dates if start <= d <= today)


def weekly_streak(dates: Set[date], times_per_week: int, today: date) -> int:
    """
    Consecutive weeks hitting the target. The in-progress week counts as soon
    as it hits the target, and doesn't break the streak while still pending.
    """
    target = max(1, times_per_week or 1)
    counts = {}
    for d in dates:
        anchor = week_start(d)
        counts[anchor] = counts.get(anchor, 0) + 1

    this_week = week_start(today)
    streak = 1 if counts.get(this_week, 0) >= target else 0

    cursor = this_week - timedelta(weeks=1)
    while counts.get(cursor, 0) >= target:
        streak += 1
        cursor -= timedelta(weeks=1)
    return streak


def current_streak(cadence_type: str, weekdays: Optional[Iterable[int]],
                   times_per_week: Optional[int], dates: Set[date], today: date) -> int:
    if cadence_type == CADENCE_WEEKLY:
        return weekly_streak(dates, times_per_week, today)
    if cadence_type == CADENCE_WEEKDAYS:
        return weekdays_streak(dates, weekdays, today)
    return daily_streak(dates, today)


# ---------------------------------------------------------------------------
# Best (all-time) streaks
# ---------------------------------------------------------------------------

def best_daily_streak(dates: Set[date]) -> int:
    best = run = 0
    prev = None
    for d in sorted(dates):
        run = run + 1 if prev is not None and d - prev == timedelta(days=1) else 1
        best = max(best, run)
        prev = d
    return best


def best_weekdays_streak(dates: Set[date], weekdays: Iterable[int]) -> int:
    scheduled = set(weekdays or [])
    if not scheduled:
        return 0
    relevant = sorted(d for d in dates if d.weekday() in scheduled)
    best = run = 0
    prev = None
    for d in relevant:
        if prev is None:
            run = 1
        else:
            # consecutive if no scheduled day was skipped between prev and d
            cursor = prev + timedelta(days=1)
            missed = False
            while cursor < d:
                if cursor.weekday() in scheduled:
                    missed = True
                    break
                cursor += timedelta(days=1)
            run = 1 if missed else run + 1
        best = max(best, run)
        prev = d
    return best


def best_weekly_streak(dates: Set[date], times_per_week: int) -> int:
    target = max(1, times_per_week or 1)
    counts = {}
    for d in dates:
        anchor = week_start(d)
        counts[anchor] = counts.get(anchor, 0) + 1

    best = run = 0
    prev = None
    for anchor in sorted(counts):
        if counts[anchor] < target:
            continue
        run = run + 1 if prev is not None and anchor - prev == timedelta(weeks=1) else 1
        best = max(best, run)
        prev = anchor
    return best


def best_streak(cadence_type: str, weekdays: Optional[Iterable[int]],
                times_per_week: Optional[int], dates: Set[date]) -> int:
    if cadence_type == CADENCE_WEEKLY:
        return best_weekly_streak(dates, times_per_week)
    if cadence_type == CADENCE_WEEKDAYS:
        return best_weekdays_streak(dates, weekdays)
    return best_daily_streak(dates)


# ---------------------------------------------------------------------------
# Day streak (consecutive day-completes) — the Today-header flame
# ---------------------------------------------------------------------------

def day_streak(complete_dates: Set[date], today: date) -> int:
    """Same shape as a daily habit streak, over day-complete dates."""
    return daily_streak(complete_dates, today)
