import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../../axios';
import './EditWorkoutProgramForm.css';

const EditWorkoutProgramForm = ({ program, onSave, onArchive, onUnarchive, onClose }) => {
  const [editedProgram, setEditedProgram] = useState({
    name: '',
    workout_days: [],
  });
  const [exercisesLibrary, setExercisesLibrary] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [showCreateExerciseForm, setShowCreateExerciseForm] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    description: '',
    // Add other necessary fields
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
                    exercise_id: exercise.exercise_id || null,
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

  // Fetch exercises from the global library
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const response = await axiosInstance.get('/exercises');
        setExercisesLibrary(response.data);
      } catch (error) {
        console.error('Failed to fetch exercises', error);
      }
    };
    fetchExercises();
  }, []);

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
      workout_days: [
        ...editedProgram.workout_days,
        { day_name: '', exercises: [] },
      ],
    });
  };

  const addExercise = (dayIndex) => {
    const updatedProgram = { ...editedProgram };
    updatedProgram.workout_days[dayIndex].exercises.push({
      exercise_id: null,
      name: '',
      sets: 3,
      recommended_reps: 0,
      recommended_weight: 0,
    });
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

  const handleArchiveToggle = () => {
    if (program.status === 'archived') {
      onUnarchive(program.program_id);
    } else {
      onArchive(program.program_id);
    }
  };

  // Search functionality
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    const filtered = exercisesLibrary.filter((exercise) =>
      exercise.name.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setFilteredExercises(filtered);
  };

  // Add selected exercise to the program
  const handleSelectExercise = (dayIndex, exerciseIndex, exercise) => {
    const updatedProgram = { ...editedProgram };
    updatedProgram.workout_days[dayIndex].exercises[exerciseIndex] = {
      exercise_id: exercise.exercise_id,
      name: exercise.name,
      sets: 3,
      recommended_reps: 0,
      recommended_weight: 0,
    };
    setEditedProgram(updatedProgram);
    setSearchTerm('');
    setFilteredExercises([]);
  };

  // Handle creating a new exercise
  const handleCreateExercise = async () => {
    try {
      const response = await axiosInstance.post('/exercises', newExercise);
      // Add the new exercise to the library and select it
      setExercisesLibrary([...exercisesLibrary, response.data]);
      setShowCreateExerciseForm(false);
      setNewExercise({
        name: '',
        description: '',
        // Reset other fields
      });
    } catch (error) {
      console.error('Failed to create new exercise', error);
    }
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
              {!exercise.exercise_id ? (
                <>
                  <label>
                    Search Exercise
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </label>
                  {filteredExercises.length > 0 && (
                    <ul className="exercise-search-results">
                      {filteredExercises.map((ex) => (
                        <li
                          key={ex.exercise_id}
                          onClick={() =>
                            handleSelectExercise(dayIndex, exerciseIndex, ex)
                          }
                        >
                          {ex.name}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCreateExerciseForm(true)}
                  >
                    Create New Exercise
                  </button>
                </>
              ) : (
                <>
                  <p>
                    <strong>Exercise:</strong> {exercise.name}
                  </p>
                  <label>
                    Sets
                    <input
                      type="number"
                      name="sets"
                      value={exercise.sets}
                      onChange={(e) =>
                        handleInputChange(e, dayIndex, exerciseIndex)
                      }
                    />
                  </label>
                  <label>
                    Target Reps
                    <input
                      type="number"
                      name="recommended_reps"
                      value={exercise.recommended_reps}
                      onChange={(e) =>
                        handleInputChange(e, dayIndex, exerciseIndex)
                      }
                    />
                  </label>
                  <label>
                    Target Weight
                    <input
                      type="number"
                      name="recommended_weight"
                      value={exercise.recommended_weight || ''}
                      onChange={(e) =>
                        handleInputChange(e, dayIndex, exerciseIndex)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => deleteExercise(dayIndex, exerciseIndex)}
                    className="delete-button"
                  >
                    Delete Exercise
                  </button>
                </>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addExercise(dayIndex)}>
            Add Exercise
          </button>
          <button
            type="button"
            onClick={() => deleteDay(dayIndex)}
            className="delete-button"
          >
            Delete Day
          </button>
        </div>
      ))}
      <button type="button" onClick={addDay}>
        Add Day
      </button>

      {showCreateExerciseForm && (
        <div className="create-exercise-form">
          <h3>Create New Exercise</h3>
          <label>
            Name
            <input
              type="text"
              name="name"
              value={newExercise.name}
              onChange={(e) =>
                setNewExercise({ ...newExercise, name: e.target.value })
              }
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              value={newExercise.description}
              onChange={(e) =>
                setNewExercise({ ...newExercise, description: e.target.value })
              }
            />
          </label>
          {/* Add other necessary fields like category, muscle group, etc. */}
          <button type="button" onClick={handleCreateExercise}>
            Save Exercise
          </button>
          <button
            type="button"
            onClick={() => setShowCreateExerciseForm(false)}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="save-button">
          Save Changes
        </button>
        <button
          type="button"
          onClick={handleArchiveToggle}
          className={
            program.status === 'archived' ? 'unarchive-button' : 'archive-button'
          }
        >
          {program.status === 'archived' ? 'Unarchive Program' : 'Archive Program'}
        </button>
        <button type="button" onClick={onClose} className="cancel-button">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EditWorkoutProgramForm;
