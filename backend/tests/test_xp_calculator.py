from app.xp_calculator import (
    calculate_meditation_xp, calculate_running_xp, calculate_social_interaction_xp,
    calculate_learning_xp, calculate_reflection_xp, calculate_weight_tracking_xp
)
from datetime import datetime, timedelta

def test_calculate_meditation_xp():
    assert calculate_meditation_xp(15, 0) == 20  # First session
    assert calculate_meditation_xp(15, 20) == 15  # Subsequent session

def test_calculate_running_xp():
    assert calculate_running_xp(20, 1.0, 0) == 23  # First run
    assert calculate_running_xp(20, 1.0, 10) == 13  # Subsequent run

def test_calculate_social_interaction_xp():
    assert calculate_social_interaction_xp("presentation") == 40  # Presentation
    assert calculate_social_interaction_xp("give_compliment") == 5  # Compliment

def test_calculate_learning_xp():
    assert calculate_learning_xp("read", 30, 0) == 20  # First reading session
    assert calculate_learning_xp("take_class", 30, 20) == 30  # Subsequent class (5 XP)

def test_calculate_reflection_xp():
    assert calculate_reflection_xp(0) == 20  # First reflection
    assert calculate_reflection_xp(10) == 0  # Subsequent reflection

def test_calculate_weight_tracking_xp():
    daily_logs = [MockWeightLog(70, datetime(2023, 1, 1)), MockWeightLog(69, datetime(2023, 1, 2))]
    assert calculate_weight_tracking_xp(daily_logs, 75, 65) == 4  # Only 4 XP is rewarded for logging 2 weight entries

def test_calculate_weight_tracking_xp_progress():
    # Setup: User's goal is to lose weight (e.g., from 70lb to 65lb)
    starting_weight = 70
    goal_weight = 65

    # Create mock logs showing a progressive decrease in weight over two weeks
    daily_logs = [
        MockWeightLog(70, datetime.now() - timedelta(days=14)),  # Start of tracking
        MockWeightLog(69.7, datetime.now() - timedelta(days=12)),
        MockWeightLog(69.5, datetime.now() - timedelta(days=11)),
        MockWeightLog(69, datetime.now() - timedelta(days=9)),
        MockWeightLog(68.5, datetime.now() - timedelta(days=7)),   # Start of week 2
        MockWeightLog(68, datetime.now() - timedelta(days=6)),
        MockWeightLog(67.9, datetime.now() - timedelta(days=4)),
        MockWeightLog(68, datetime.now() - timedelta(days=3)),
        MockWeightLog(67.6, datetime.now() - timedelta(days=1)),   # Most recent entry
    ]

    # Call the function to calculate XP
    xp_earned = calculate_weight_tracking_xp(daily_logs, starting_weight, goal_weight)
    assert xp_earned >= 32  # (2 * weekly reward of 15 XP) + 2 XP for logging last entry

class MockWeightLog:
    def __init__(self, weight, date):
        self.weight = weight
        self.date = date