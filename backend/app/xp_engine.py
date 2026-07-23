"""
XP engine — one engine driven by bucket config. Two separate tracks:

  * Attribute XP (the 8 stats): earned only through habits.
      base_xp + detail_bonus (capped) x streak_multiplier,
      paid once per habit per day, per-attribute daily cap.
  * Player XP (overall level): earned through everything else —
      day-completes (scaled to habit load), partial days, measurement
      habits' flat bonus, streak milestones, challenge rewards.

Design goals: legible, capped, consistency-weighted. No punishment
mechanics — a broken streak is the loss.
"""
import math

# ---------------------------------------------------------------------------
# Tuning constants (the "numbers pass" lives here, in one place)
# ---------------------------------------------------------------------------

ATTRIBUTE_DAILY_CAP = 60        # per attribute per day; stacked same-bucket habits can't pump a stat
DETAIL_BONUS_CAP = 15           # optional detail is a bonus, never the point
BASE_XP_DEFAULT = 10

MEASUREMENT_PLAYER_XP = 5       # tiny flat bonus: stepping on the scale is a real action

DAY_COMPLETE_BASE = 10          # day-complete bonus scales with the day's habit load
DAY_COMPLETE_PER_HABIT = 6
DAY_COMPLETE_MAX = 52
PARTIAL_DAY_BONUS = 8           # the visible lesser acknowledgment
PARTIAL_DAY_RATIO = 2 / 3       # most-but-not-all threshold
PARTIAL_DAY_MIN_SCHEDULED = 3   # with 1-2 habits scheduled it's all or nothing

# Streak multipliers: enough to honor consistency, not enough to make a
# broken streak feel like ruin.
STREAK_MULTIPLIER_TIERS = [(100, 1.25), (30, 1.20), (7, 1.10)]

# Per-habit streak milestones -> flat player XP, paid once per habit per milestone.
STREAK_MILESTONES = {7: 25, 30: 50, 100: 100}

PLAYER_LEVEL_BASE_XP = 100      # player level curve: cost(n -> n+1) = 100 * n^1.35
PLAYER_LEVEL_EXPONENT = 1.35
PLAYER_LEVEL_MAX = 99


# ---------------------------------------------------------------------------
# Attribute XP track
# ---------------------------------------------------------------------------

def streak_multiplier(streak: int) -> float:
    """Small consistency multiplier: 1.1x at 7 days, 1.2x at 30, capped 1.25x at 100."""
    for threshold, multiplier in STREAK_MULTIPLIER_TIERS:
        if streak >= threshold:
            return multiplier
    return 1.0


def detail_bonus(detail_kind: str, duration_minutes: int = None, distance: float = None,
                 quantity: int = None, volume: float = None) -> int:
    """
    Bonus XP for optional detail, by bucket detail_kind. Always capped so the
    checkmark stays the point and grinding detail can't pump a stat.
    """
    duration_minutes = duration_minutes or 0
    distance = distance or 0.0
    quantity = quantity or 0
    volume = volume or 0.0

    bonus = 0
    if detail_kind == "duration":
        bonus = duration_minutes // 5                       # 1 XP / 5 min
    elif detail_kind == "distance_duration":
        bonus = math.floor(distance * 3) + duration_minutes // 10   # 3 XP / mile + 1 XP / 10 min
    elif detail_kind == "volume":
        bonus = int(volume // 1000)                         # 1 XP / 1000 lbs moved
    elif detail_kind == "quantity":
        bonus = quantity * 2                                # 2 XP / problem, rep, item...
    elif detail_kind == "pages":
        bonus = quantity // 5 + duration_minutes // 5       # 1 XP / 5 pages or 5 min
    # 'none' and 'note' earn no detail bonus (binary by nature)

    return int(max(0, min(bonus, DETAIL_BONUS_CAP)))


def attribute_xp(base_xp: int, detail_kind: str, streak: int, attribute_xp_earned_today: int,
                 duration_minutes: int = None, distance: float = None,
                 quantity: int = None, volume: float = None) -> dict:
    """
    Full attribute payout for one habit log. Returns the breakdown the
    feedback layer shows: base, detail, multiplier, capped total.
    """
    base = base_xp if base_xp is not None else BASE_XP_DEFAULT
    bonus = detail_bonus(detail_kind, duration_minutes, distance, quantity, volume)
    multiplier = streak_multiplier(streak)
    raw_total = round((base + bonus) * multiplier)

    cap_room = max(0, ATTRIBUTE_DAILY_CAP - max(0, attribute_xp_earned_today))
    total = min(raw_total, cap_room)

    return {
        "base": base,
        "detail_bonus": bonus,
        "multiplier": multiplier,
        "raw_total": raw_total,
        "total": total,
        "capped": total < raw_total,
    }


# ---------------------------------------------------------------------------
# Player XP track
# ---------------------------------------------------------------------------

def day_complete_bonus(scheduled_count: int) -> int:
    """Completing 7 scheduled habits pays more than completing 2."""
    if scheduled_count <= 0:
        return 0
    return min(DAY_COMPLETE_BASE + DAY_COMPLETE_PER_HABIT * scheduled_count, DAY_COMPLETE_MAX)


def day_status(scheduled_count: int, completed_count: int) -> str:
    """'complete' | 'partial' | 'none' for a day's scheduled-vs-completed counts."""
    if scheduled_count <= 0 or completed_count <= 0:
        return "none"
    if completed_count >= scheduled_count:
        return "complete"
    if (scheduled_count >= PARTIAL_DAY_MIN_SCHEDULED
            and completed_count / scheduled_count >= PARTIAL_DAY_RATIO):
        return "partial"
    return "none"


def day_target_player_xp(scheduled_count: int, completed_count: int) -> int:
    """Total player XP a day's state is worth (deltas are applied against what was already paid)."""
    status = day_status(scheduled_count, completed_count)
    if status == "complete":
        return day_complete_bonus(scheduled_count)
    if status == "partial":
        return PARTIAL_DAY_BONUS
    return 0


def streak_milestone_bonus(streak: int) -> int:
    """Player XP for hitting a per-habit streak milestone exactly (7/30/100)."""
    return STREAK_MILESTONES.get(streak, 0)


# ---------------------------------------------------------------------------
# Player level curve (replaces the buggy "XP TO NEXT: -22" math)
# ---------------------------------------------------------------------------

def xp_required_for_level(level: int) -> int:
    """XP needed to go from `level` to `level + 1`."""
    if level < 1:
        level = 1
    return round(PLAYER_LEVEL_BASE_XP * (level ** PLAYER_LEVEL_EXPONENT))


def player_level_from_xp(total_xp: int) -> dict:
    """
    Resolve total player XP into level + progress. By construction
    xp_to_next is always positive and xp_into_level is always >= 0.
    """
    total_xp = max(0, int(total_xp or 0))
    level = 1
    remaining = total_xp
    while level < PLAYER_LEVEL_MAX and remaining >= xp_required_for_level(level):
        remaining -= xp_required_for_level(level)
        level += 1

    required = xp_required_for_level(level)
    return {
        "level": level,
        "total_xp": total_xp,
        "xp_into_level": remaining,
        "xp_to_next": max(1, required - remaining),
        "level_progress": min(1.0, remaining / required) if required else 1.0,
    }


# ---------------------------------------------------------------------------
# Habit slots (focus over hoarding)
# ---------------------------------------------------------------------------

# Locked rungs (xp-tuning.md §slots): rungs widen as you climb so the last
# slots are a real grind. Measurement habits sit outside the count.
SLOT_RUNGS = ((1, 5), (2, 6), (3, 7), (5, 8), (8, 9), (10, 10))


def slots_for_level(player_level: int) -> int:
    """Active habit slots: start small, earn room to grow with player level."""
    slots = SLOT_RUNGS[0][1]
    for level, rung_slots in SLOT_RUNGS:
        if player_level >= level:
            slots = rung_slots
    return slots
