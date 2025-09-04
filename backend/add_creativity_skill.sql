-- Add Creativity skill to all existing users who don't already have it
INSERT INTO skills (user_id, name, level, xp, daily_xp_earned, date_created, date_updated)
SELECT 
    u.id as user_id,
    'Creativity' as name,
    1 as level,
    0 as xp,
    0 as daily_xp_earned,
    NOW() as date_created,
    NOW() as date_updated
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM skills s 
    WHERE s.user_id = u.id 
    AND s.name = 'Creativity'
);