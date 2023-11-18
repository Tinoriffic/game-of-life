
### Getting a user's full workout program details
```
CREATE VIEW user_workout_program_details AS
SELECT 
    u.id AS user_id,
    wp.program_id,
    wp.name AS program_name,
    wd.day_id,
    wd.day_name,
    e.exercise_id,
    e.name AS exercise_name,
    wpe.program_exercise_id,
    wpe.sets,
    wpe.recommended_reps,
    wpe.recommended_weight
FROM users u
JOIN workout_programs wp ON u.id = wp.user_id
JOIN workout_days wd ON wp.program_id = wd.program_id
JOIN workout_program_exercises wpe ON wd.day_id = wpe.day_id
JOIN exercises e ON wpe.exercise_id = e.exercise_id;
```

### Getting a user's workout progress
```
CREATE VIEW workout_progress_view AS
SELECT 
    ws.user_id,
    wse.session_id, 
    wse.program_exercise_id, 
    wpe.exercise_id, 
    e.name AS exercise_name,
    wse.set_number, 
    wse.performed_reps, 
    wse.performed_weight, 
    ws.session_date,
    (wse.performed_reps * wse.performed_weight) AS volume
FROM workout_session_exercises wse
JOIN workout_program_exercises wpe ON wse.program_exercise_id = wpe.program_exercise_id
JOIN exercises e ON wpe.exercise_id = e.exercise_id
JOIN workout_sessions ws ON wse.session_id = ws.session_id;
```