from datetime import datetime, timedelta, date
import math

def calculate_meditation_xp(duration:int, daily_xp_earned: int) -> int:
    """
    Calculate XP for the meditation activity.
    Reward 10 XP for the first meditation session of the day, then 5 XP for every 5 minutes.
    """
    xp = 0
    if daily_xp_earned == 0:
        xp += 5
    xp += (duration // 5) * 5
    return xp

def calculate_workout_xp(daily_xp_earned: int, workout_data: list) -> int:
    """
    Calculate XP for the workout activities.
    
    Args:
        daily_xp_earned (int): XP already earned today
        workout_data (list): List of dicts containing exercise data
            [{'exercise_id': int, 'volume': float, 'intensity': float}, ...]
    
    Returns:
        int: XP earned from this workout
    """
    # Base XP for logging a workout
    xp = 15 if daily_xp_earned == 0 else 0
    
    # Add XP based on total volume and intensity
    total_volume = sum(exercise['volume'] for exercise in workout_data)
    total_intensity = sum(exercise['intensity'] for exercise in workout_data)
    
    # Volume XP: 1 XP per 100 lbs, max 50
    volume_xp = min(int(total_volume / 100), 50)
    
    # Intensity XP: 1 XP per 20 intensity points, max 35
    intensity_xp = min(int(total_intensity / 20), 35)
    
    xp += volume_xp + intensity_xp
    
    # Cap total XP at 100 per workout
    return min(xp, 100)

def calculate_running_xp(duration: int, distance: float, daily_xp_earned: int) -> int:
    """
    Calculate XP for running.
    Reward 10 XP for the first run session of the day, then 5 XP for every 10 minutes and 5 XP for every 1/2 mile.
    """
    xp = 0
    if daily_xp_earned == 0:
        xp += 10
    xp += (duration // 10) * 5
    xp += math.ceil((distance * 0.5) * 5)
    return xp

def calculate_social_interaction_xp(interaction_type: str) -> int:
    """
    Calculate XP for different types of social interactions.
    """
    interaction_xp_map = {
        "social_gathering": 12,
        "presentation": 40,
        "approach_stranger": 30,
        "give_compliment": 5,
        "tell_story": 10,
        "make_laugh": 8
    }
    return interaction_xp_map.get(interaction_type, 0)

def calculate_learning_xp(activity_type: str, duration: int, daily_xp_earned: int) -> int:
    """
    Calculate XP for learning activities like reading or taking a course.
    Daily XP reward differs based on the activity.
    """
    xp = 0
    # TO DO: Considering modifying so that you can earn daily XP for reading AND taking a course
    if daily_xp_earned == 0:
            xp += 5
    if activity_type == "take_class":
        xp += (duration // 5) * 5
    elif activity_type == "read":
        xp += (duration // 10) * 5
    return xp

def calculate_reflection_xp(daily_xp_earned: int) -> int:
    """
    Calculate XP for reflection activities like journaling.
    Fixed daily XP reward of 20 XP.
    """
    if daily_xp_earned == 0:
        return 20
    return 0

def calculate_weight_tracking_xp(daily_logs, starting_weight, goal_weight):
    """
    Calculate XP for weight tracking based on the actual days logged.
    Fixed daily XP reward of 2 XP.
    Weekly reward of 15 XP if progress is made towards the goal_weight
    For the first week, compare the average weight to the starting weight.
    From the second week onwards, compare the average to the previous week's average.
    """
    if not daily_logs:
        return 0
    
    base_xp = 2 * len(daily_logs)  # 2 XP per day for logging

    # Process logs to get weekly averages
    current_week_avg = calculate_average_weight([log.weight for log in daily_logs if is_current_week(log.date)])
    previous_week_avg = calculate_average_weight([log.weight for log in daily_logs if is_previous_week(log.date)])

    # Check progress towards the goal
    if goal_weight is None:
        # As long as user doesn't have a weight goal, they don't earn XP for tracking
        return 0

    progress_xp = 0
    if current_week_avg is not None:
        if previous_week_avg is None:
            # Compare with starting weight for the first week
            if is_progress_made(current_week_avg, starting_weight, goal_weight):
                progress_xp = 15
        else:
            # Compare with previous week's average from the second week
            if is_progress_made(current_week_avg, previous_week_avg, goal_weight):
                progress_xp = 15

    return base_xp + progress_xp

def calculate_average_weight(weights):
    return sum(weights) / len(weights) if weights else None

def is_current_week(log_date):
    """
    Check if the log date falls in the current week.
    """
    if isinstance(log_date, datetime):
        log_date = log_date.date()

    current_week_start = date.today() - timedelta(days=date.today().weekday())
    return current_week_start <= log_date <= current_week_start + timedelta(days=6)

def is_previous_week(log_date):
    """
    Check if the log date falls in the previous week.
    """
    if isinstance(log_date, datetime):
        log_date = log_date.date()

    previous_week_start = date.today() - timedelta(days=date.today().weekday() + 7)
    previous_week_end = previous_week_start + timedelta(days=6)
    return previous_week_start <= log_date <= previous_week_end

def is_progress_made(current_avg, comparison_avg, goal_weight):
    """
    Determine if progress has been made towards the goal weight.
    """
    if goal_weight > comparison_avg:
        return current_avg > comparison_avg  # Goal is to gain weight
    return current_avg < comparison_avg  # Goal is to lose weight