import React, { useState, useEffect } from 'react';
import './EditWorkoutProgramForm.css';

const EditWorkoutProgramForm = ({ program, onSave, onDelete, onClose }) => {
  const [editedProgram, setEditedProgram] = useState({
    name: '',
    workout_days: [],
  });

  useEffect(() => {
    if (program) {
      setEditedProgram({
        name: program.name,
        workout_days: program.days
          ? program.days.map((day) => ({
              day_name: day.day_name,
              exercises: day.exercises
                ? day.exercises.map((exercise) => ({
                    name: exercise.name || '',
                    sets: exercise.sets || 0,
                    recommended_reps: exercise.recommended_reps || 0,
                    recommended_weight: exercise.recommended_weight || 0,
                  }))
                : [],
            }))
          : [],
      });
    }
  }, [program]);

  const handleInputChange = (e, dayIndex, exerciseIndex = null) => {
    const { name, value } = e.target;
    if (exerciseIndex !== null) {
      const updatedProgram = { ...editedProgram };
      updatedProgram.workout_days[dayIndex].exercises[exerciseIndex][name] = value;
      setEditedProgram(updatedProgram);
    } else if (name === 'day_name') {
      const updatedDays = [...editedProgram.workout_days];
      updatedDays[dayIndex][name] = value;
      setEditedProgram({ ...editedProgram, workout_days: updatedDays });
    } else {
      setEditedProgram({ ...editedProgram, [name]: value });
    }
  };

  const addDay = () => {
    setEditedProgram({
      ...editedProgram,
      workout_days: [...editedProgram.workout_days, { day_name: '', exercises: [{ name: '', sets: 3 }] }],
    });
  };

  const addExercise = (dayIndex) => {
    const updatedProgram = { ...editedProgram };
    updatedProgram.workout_days[dayIndex].exercises.push({ name: '', sets: 3 });
    setEditedProgram(updatedProgram);
  };

  const deleteExercise = (dayIndex, exerciseIndex) => {
    const updatedProgram = { ...editedProgram };
    updatedProgram.workout_days[dayIndex].exercises.splice(exerciseIndex, 1);
    setEditedProgram(updatedProgram);
  };

  const deleteDay = (dayIndex) => {
    const updatedProgram = { ...editedProgram };
    updatedProgram.workout_days.splice(dayIndex, 1);
    setEditedProgram(updatedProgram);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedProgram);
  };

  const handleDelete = () => {
    onDelete(program.program_id);
  };

  return (
    <form onSubmit={handleSubmit} className="edit-workout-program-form">
      <h2>Edit Workout Program</h2>
      <label>
        Program Name
        <input
          type="text"
          name="name"
          value={editedProgram.name}
          onChange={handleInputChange}
        />
      </label>
      {editedProgram.workout_days.map((day, dayIndex) => (
        <div key={dayIndex} className="workout-day">
          <label>
            Day Name
            <input
              type="text"
              name="day_name"
              value={day.day_name}
              onChange={(e) => handleInputChange(e, dayIndex)}
            />
          </label>
          {day.exercises.map((exercise, exerciseIndex) => (
            <div key={exerciseIndex} className="workout-exercise">
              <label>
                Exercise Name
                <input
                  type="text"
                  name="name"
                  value={exercise.name}
                  onChange={(e) => handleInputChange(e, dayIndex, exerciseIndex)}
                />
              </label>
              <label>
                Sets
                <input
                  type="number"
                  name="sets"
                  value={exercise.sets}
                  onChange={(e) => handleInputChange(e, dayIndex, exerciseIndex)}
                />
              </label>
              <label>
                Target Reps
                <input
                  type="number"
                  name="recommended_reps"
                  value={exercise.recommended_reps}
                  onChange={(e) => handleInputChange(e, dayIndex, exerciseIndex)}
                />
              </label>
              <label>
                {exercise.is_calisthenics ? 'Added Weight' : 'Target Weight'}
                <input
                  type="number"
                  name="recommended_weight"
                  value={exercise.recommended_weight || ''}
                  onChange={(e) => handleInputChange(e, dayIndex, exerciseIndex)}
                />
              </label>
              <div className="exercise-option">
                <label>
                  <input
                    type="checkbox"
                    name="is_calisthenics"
                    checked={exercise.is_calisthenics}
                    onChange={(e) => {
                      const updatedProgram = { ...editedProgram };
                      updatedProgram.workout_days[dayIndex].exercises[exerciseIndex].is_calisthenics = e.target.checked;
                      setEditedProgram(updatedProgram);
                    }}
                  />
                  <span>Calisthenics</span>
                </label>
              </div>
              <button type="button" onClick={() => deleteExercise(dayIndex, exerciseIndex)}>
                Delete Exercise
              </button>
            </div>
          ))}
          <button type="button" onClick={() => addExercise(dayIndex)}>
            Add Exercise
          </button>
          <button type="button" onClick={() => deleteDay(dayIndex)}>
            Delete Day
          </button>
        </div>
      ))}
      <button type="button" onClick={addDay}>
        Add Day
      </button>
      <div className="form-actions">
        <button type="submit" className="save-button">
          Save Changes
        </button>
        <button type="button" onClick={handleDelete} className="delete-button">
          Delete Program
        </button>
        <button type="button" onClick={onClose} className="cancel-button">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EditWorkoutProgramForm;