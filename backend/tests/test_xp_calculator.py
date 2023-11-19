from app.xp_calculator import (
    calculate_meditation_xp, calculate_running_xp, calculate_social_interaction_xp,
    calculate_learning_xp, calculate_reflection_xp, calculate_weight_tracking_xp
)

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