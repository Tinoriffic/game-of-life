-- Add temporary 1-day test challenge for development
-- Run this to add the test challenge

INSERT INTO challenges (
    id, title, description, duration_days, target_stats, 
    completion_xp_bonus, badge_id, activity_type, validation_rules, 
    icon, is_active
) VALUES (
    999,
    'Daily Tester',
    'A 1-day test challenge for development and testing purposes.',
    1,
    '[{"stat": "Intelligence", "xp": 10}]'::jsonb,
    25,
    NULL,
    NULL,
    NULL,
    '🧪',
    true
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    duration_days = EXCLUDED.duration_days,
    target_stats = EXCLUDED.target_stats,
    completion_xp_bonus = EXCLUDED.completion_xp_bonus,
    is_active = EXCLUDED.is_active;