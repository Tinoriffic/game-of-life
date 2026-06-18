"""
Tests for app.xp_engine. Values are pinned to the engine's tuning constants
(ATTRIBUTE_DAILY_CAP, the streak tiers, the level curve, etc.) so the numbers
pass and the engine can't silently drift apart.
"""
from app.xp_engine import (
    streak_multiplier, detail_bonus, attribute_xp,
    day_complete_bonus, day_status, day_target_player_xp, streak_milestone_bonus,
    xp_required_for_level, player_level_from_xp, slots_for_level,
    ATTRIBUTE_DAILY_CAP, DETAIL_BONUS_CAP, PARTIAL_DAY_BONUS,
)


# --- streak multiplier ---
def test_streak_multiplier_thresholds():
    assert streak_multiplier(0) == 1.00
    assert streak_multiplier(6) == 1.00
    assert streak_multiplier(7) == 1.10
    assert streak_multiplier(29) == 1.10
    assert streak_multiplier(30) == 1.20
    assert streak_multiplier(99) == 1.20
    assert streak_multiplier(100) == 1.25
    assert streak_multiplier(5000) == 1.25


# --- detail bonus (by bucket detail_kind, always capped) ---
def test_detail_bonus_duration():
    assert detail_bonus("duration", duration_minutes=25) == 5      # 25 // 5
    assert detail_bonus("duration", duration_minutes=200) == DETAIL_BONUS_CAP  # 40 -> capped


def test_detail_bonus_distance_duration_and_cap():
    assert detail_bonus("distance_duration", distance=3.1, duration_minutes=28) == 11  # floor(9.3)=9 + 2
    assert detail_bonus("distance_duration", distance=20, duration_minutes=120) == DETAIL_BONUS_CAP  # 72 -> capped


def test_detail_bonus_volume_and_quantity_and_pages():
    assert detail_bonus("volume", volume=9000) == 9         # 9000 // 1000
    assert detail_bonus("volume", volume=600) == 0          # under 1000
    assert detail_bonus("quantity", quantity=5) == 10       # 5 * 2
    assert detail_bonus("quantity", quantity=10) == DETAIL_BONUS_CAP  # 20 -> capped
    assert detail_bonus("pages", quantity=30, duration_minutes=30) == 12  # 6 + 6


def test_detail_bonus_none_and_missing():
    assert detail_bonus("none", duration_minutes=99) == 0
    assert detail_bonus("note", quantity=5) == 0
    assert detail_bonus("distance_duration") == 0  # all detail args default to 0


# --- attribute xp per log (full payout breakdown) ---
def test_attribute_xp_worked_example():
    # base 12, volume 9000 (bonus 9), streak 9 (1.10x) -> round(23.1) = 23
    out = attribute_xp(12, "volume", 9, 0, volume=9000)
    assert out["detail_bonus"] == 9
    assert out["multiplier"] == 1.10
    assert out["raw_total"] == 23
    assert out["total"] == 23
    assert out["capped"] is False

    # base 10, no detail, streak 4 (1.0x) -> 10
    assert attribute_xp(10, "none", 4, 0)["total"] == 10

    # base defaults to 10 when None is passed
    assert attribute_xp(None, "none", 0, 0)["base"] == 10


def test_attribute_xp_respects_daily_cap():
    # base 50, already earned 40 today -> only 20 room remains
    out = attribute_xp(50, "none", 0, 40)
    assert out["raw_total"] == 50
    assert out["total"] == 20
    assert out["capped"] is True
    # already at cap -> 0
    assert attribute_xp(50, "none", 0, ATTRIBUTE_DAILY_CAP)["total"] == 0


# --- day-complete / partial player xp ---
def test_day_complete_scales_with_load():
    assert day_complete_bonus(0) == 0
    assert day_complete_bonus(3) == 28   # 10 + 6*3
    assert day_complete_bonus(6) == 46   # 10 + 6*6
    assert day_complete_bonus(7) == 52   # 10 + 6*7 -> capped at 52
    assert day_complete_bonus(20) == 52  # capped


def test_day_status():
    assert day_status(0, 0) == "none"
    assert day_status(6, 0) == "none"
    assert day_status(6, 6) == "complete"
    assert day_status(6, 4) == "partial"   # 4/6 >= 2/3
    assert day_status(6, 3) == "none"      # 1/2 < 2/3
    assert day_status(3, 2) == "partial"   # 2/3 == 2/3
    assert day_status(2, 1) == "none"      # under the min-scheduled floor


def test_day_target_player_xp():
    assert day_target_player_xp(6, 6) == day_complete_bonus(6)
    assert day_target_player_xp(6, 4) == PARTIAL_DAY_BONUS
    assert day_target_player_xp(2, 1) == 0


def test_day_complete_beats_partial():
    # Finishing the set must out-pay the partial acknowledgment (anti-hoarding).
    assert day_complete_bonus(6) > PARTIAL_DAY_BONUS


def test_streak_milestones():
    assert streak_milestone_bonus(7) == 25
    assert streak_milestone_bonus(30) == 50
    assert streak_milestone_bonus(100) == 100
    assert streak_milestone_bonus(8) == 0


# --- player level curve ---
def test_xp_required_for_level():
    assert xp_required_for_level(1) == 100         # 100 * 1^1.35
    assert xp_required_for_level(0) == 100         # clamped to level 1
    assert xp_required_for_level(2) == 255         # round(100 * 2^1.35)


def test_player_level_from_xp_basics():
    p0 = player_level_from_xp(0)
    assert (p0["level"], p0["xp_into_level"], p0["xp_to_next"]) == (1, 0, 100)

    p50 = player_level_from_xp(50)
    assert (p50["level"], p50["xp_into_level"], p50["xp_to_next"]) == (1, 50, 50)

    # exactly enough to clear level 1 rolls into level 2
    p100 = player_level_from_xp(100)
    assert (p100["level"], p100["xp_into_level"], p100["xp_to_next"]) == (2, 0, 255)


def test_xp_to_next_never_negative():
    # Guards the old "XP TO NEXT: -22" bug across the whole range.
    for xp in range(0, 6000, 7):
        prog = player_level_from_xp(xp)
        assert prog["xp_to_next"] >= 1
        assert prog["xp_into_level"] >= 0
        assert 0.0 <= prog["level_progress"] <= 1.0


# --- habit slots ---
def test_slots_for_level():
    assert slots_for_level(1) == 6
    assert slots_for_level(3) == 6
    assert slots_for_level(4) == 7    # +1 every 3 levels
    assert slots_for_level(7) == 8
    assert slots_for_level(10) == 9
    assert slots_for_level(19) == 12
    assert slots_for_level(99) == 12  # capped
