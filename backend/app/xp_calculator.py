from datetime import datetime, timedelta

def calculate_meditation_xp(duration:int, daily_xp_earned: int) -> int:
    """
    Calculate XP for the meditation activity.
    Reward 10 XP for the first meditation session of the day, then 5 XP for every 5 minutes.
    """
    xp = 0
    if daily_xp_earned == 0:
        xp += 10
    xp += (duration // 5) * 5
    return xp

def calculate_workout_xp(daily_xp_earned: int) -> int:
    """
    Calculate XP for workout activity.
    Reward 15 XP for logging a workout session
    TO DO: reward additional 10 XP/exercise where volume exceeded previous average (i.e. avg of 3 sessions) workout volume
    """
    xp = 0
    if daily_xp_earned == 0:
        xp += 15
    return xp

def calculate_running_xp(duration: int, distance: float, daily_xp_earned: int) -> int:
    """
    Calculate XP for running.
    Reward 10 XP for the first run session of the day, then 5 XP for every 10 minutes and 5 XP for every 1/2 mile.
    """
    xp = 0
    if daily_xp_earned == 0:
        xp += 10
    xp += (duration // 10) * 5
    xp += int(distance / 0.5) * 5
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
    # TO DO: Modify so that you can earn daily XP for reading AND taking a course
    if daily_xp_earned == 0:
        if activity_type == "read":
            xp += 5
        elif activity_type == "take_class":
            xp += 15
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
    :param daily_logs: List of tuples (date, weight) for the current and previous week.
    :param starting_weight: User's weight at the start of tracking.
    :param goal_weight: User's weight goal.
    :return: XP earned for weight tracking.
    """
    if not daily_logs:
        return 0

    # Process logs to get weekly averages
    current_week_logs = [log for log in daily_logs if is_current_week(log[0])]
    previous_week_logs = [log for log in daily_logs if is_previous_week(log[0])]

    current_week_avg = calculate_average_weight(current_week_logs)
    previous_week_avg = calculate_average_weight(previous_week_logs)

    # TO DO: Modify the logic so that you get a daily reward by logging a weight entry
    base_xp = 2 * len(current_week_logs)  # 2 XP per day for logging

    if not previous_week_logs:
        # For the first week, compare with the starting weight
        is_progress = compare_progress(current_week_avg, starting_weight, goal_weight)
    else:
        # From the second week, compare with the previous week's average
        is_progress = compare_progress(current_week_avg, previous_week_avg, goal_weight)

    progress_xp = 15 if is_progress else 0
    return base_xp + progress_xp

def calculate_average_weight(logs):
    if not logs:
        return 0
    total_weight = sum(weight for _, weight in logs)
    return total_weight / len(logs)

def is_current_week(log_date, start_date):
    """
    Check if the log date falls in the current week.
    :param log_date: The date of the weight log entry.
    :param start_date: The user's weight tracking start date.
    :return: True if the log date is in the current week, False otherwise.
    """
    current_week_start = start_date + timedelta(days=((datetime.utcnow().date() - start_date).days // 7) * 7)
    current_week_end = current_week_start + timedelta(days=7)
    return current_week_start <= log_date < current_week_end

def is_previous_week(log_date, start_date):
    """
    Check if the log date falls in the previous week.
    :param log_date: The date of the weight log entry.
    :param start_date: The user's weight tracking start date.
    :return: True if the log date is in the previous week, False otherwise.
    """
    previous_week_start = start_date + timedelta(days=((datetime.utcnow().date() - start_date).days // 7 - 1) * 7)
    previous_week_end = previous_week_start + timedelta(days=7)
    return previous_week_start <= log_date < previous_week_end

def compare_progress(current_avg, comparison_avg, goal_weight):
    return (current_avg < comparison_avg and goal_weight < comparison_avg) or \
           (current_avg > comparison_avg and goal_weight > comparison_avg)