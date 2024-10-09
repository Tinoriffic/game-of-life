
### Getting a user's full workout program details
```
CREATE OR REPLACE VIEW user_workout_program_details AS
SELECT 
    wp.program_id,
    wp.user_id,
    wp.name AS program_name,
    wd.day_id,
    wd.day_name,
    pe.program_exercise_id,
    e.exercise_id,
    e.name AS exercise_name,
    pe.sets,
    pe.recommended_reps,
    pe.recommended_weight
FROM 
    workout_programs wp
JOIN 
    workout_days wd ON wp.program_id = wd.program_id
JOIN 
    program_exercises pe ON wd.day_id = pe.day_id
JOIN 
    exercises e ON pe.exercise_id = e.exercise_id;
```

### Getting a user's workout progress
```
CREATE OR REPLACE VIEW workout_progress_view AS
SELECT 
    ws.user_id,
    ws.session_id,
    ws.session_date,
    se.session_exercise_id,
    e.exercise_id,
    e.name AS exercise_name,
    wset.set_id,
    wset.set_number,
    wset.performed_weight,
    wset.performed_reps,
    (wset.performed_weight * wset.performed_reps) AS set_volume,
    se.total_volume,
    se.total_intensity_score
FROM 
    workout_sessions ws
JOIN 
    session_exercises se ON ws.session_id = se.session_id
JOIN 
    exercises e ON se.exercise_id = e.exercise_id
JOIN 
    workout_sets wset ON se.session_exercise_id = wset.session_exercise_id;
```