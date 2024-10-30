import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import axiosInstance from '../../../../axios';
import CreateExerciseForm from './CreateExerciseForm';
import './EditWorkoutProgramForm.css';

const EditWorkoutProgramForm = ({ program, onSave, onArchive, onUnarchive, onClose }) => {
  const [editedProgram, setEditedProgram] = useState({
    name: '',
    workout_days: [],
  });
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [error, setError] = useState('');
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

  useEffect(() => {
    fetchExerciseLibrary();
  }, []);

  useEffect(() => {
    if (program && program.workout_days && exerciseLibrary.length > 0) {
      setEditedProgram({
        name: program.name,
        status: program.status,
        workout_days: program.workout_days.map(day => ({
          day_name: day.day_name,
          exercises: day.exercises.map(exercise => {
            // Find the exercise in our library
            const libraryExercise = exerciseLibrary.find(e => e.exercise_id === exercise.exercise_id);
            return {
              exercise_id: exercise.exercise_id,
              name: libraryExercise?.name || 'Exercise Not Found',
              sets: exercise.sets,
              recommended_reps: exercise.recommended_reps,
              recommended_weight: exercise.recommended_weight
            }
          })
        }))
      });
    }
  }, [program, exerciseLibrary]); // Add exerciseLibrary to dependencies

  const fetchExerciseLibrary = async () => {
    try {
      const response = await axiosInstance.get('/exercises');
      setExerciseLibrary(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching exercise library:', err)
      setError('Failed to load exercise library. Please try again.');
      setExerciseLibrary([]);
    }
  };

  const handleInputChange = (e, dayIndex, exerciseIndex = null) => {
    const { name, value } = e.target;
    const updatedProgram = { ...editedProgram };

    if (exerciseIndex !== null) {
      updatedProgram.workout_days[dayIndex].exercises[exerciseIndex][name] = value;
    } else if (name === 'day_name') {
      updatedProgram.workout_days[dayIndex][name] = value;
    } else {
      updatedProgram[name] = value;
    }

    setEditedProgram(updatedProgram);
  };

  const addDay = () => {
    if (!editedProgram.name.trim()) {
      setError('Please enter a program name first');
      return;
    }
    setEditedProgram({
      ...editedProgram,
      workout_days: [...editedProgram.workout_days, { day_name: '', exercises: [] }],
    });
  };

  const deleteDay = (dayIndex) => {
    if (editedProgram.workout_days.length <= 1) {
      setError('Programs must have at least one workout day');
      return;
    }

    const updatedProgram = { ...editedProgram };
    updatedProgram.workout_days.splice(dayIndex, 1);
    setEditedProgram(updatedProgram);
  };

  const addExercise = (dayIndex) => {
    setSelectedDayIndex(dayIndex);
    setShowCreateExercise(true);
  };

  const deleteExercise = (dayIndex, exerciseIndex) => {
    const updatedProgram = { ...editedProgram };
    updatedProgram.workout_days[dayIndex].exercises.splice(exerciseIndex, 1);
    setEditedProgram(updatedProgram);
  };

  const handleExerciseSelect = (selectedOption, dayIndex) => {
    if (!selectedOption) return;

    console.log('Selected Exercise:', selectedOption);
    const updatedProgram = { ...editedProgram };
    updatedProgram.workout_days[dayIndex].exercises.push({
      exercise_id: selectedOption.value,
      name: selectedOption.label,
      sets: 3,
      recommended_reps: 12,
      recommended_weight: 0
    });
    setEditedProgram(updatedProgram);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!editedProgram.name.trim()) {
      setError('Program name is required');
      return;
    }

    if (editedProgram.workout_days.length === 0) {
      setError('At least one workout day is required');
      return;
    }

    for (const day of editedProgram.workout_days) {
      if (!day.day_name.trim()) {
        setError('All workout days must have a name');
        return;
      }
    }

    try {
      // Format the data to match the API expectations
      const formattedProgram = {
        name: editedProgram.name,
        status: program.status,
        workout_days: editedProgram.workout_days.map(day => ({
          day_name: day.day_name,
          exercises: day.exercises.map(exercise => ({
            exercise_id: exercise.exercise_id,
            sets: Number(exercise.sets),
            recommended_reps: Number(exercise.recommended_reps),
            recommended_weight: Number(exercise.recommended_weight)
          }))
        }))
      };
  
      console.log('Submitting program data:', formattedProgram); // Debug log
      await onSave(formattedProgram);
      setError('');
    } catch (err) {
      console.error('Error details:', err.response?.data); // Debug log
      if (err.response?.data?.detail) {
        // Handle array of validation errors
        if (Array.isArray(err.response.data.detail)) {
          setError(err.response.data.detail.map(error => error.msg).join(', '));
        } else {
          setError(err.response.data.detail);
        }
      } else {
        setError('Failed to save workout program');
      }
    }
  };

  const handleCreateExercise = async (exerciseData) => {
    try {
      const response = await axiosInstance.post('/exercises', exerciseData);
      await fetchExerciseLibrary(); // Refresh the library
      setShowCreateExercise(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create exercise');
    }
  };

  const exerciseOptions = Array.isArray(exerciseLibrary) 
    ? exerciseLibrary.map(exercise => ({
        value: exercise.exercise_id,
        label: exercise.name,
        category: exercise.category,
        muscleGroup: exercise.muscle_group,
        equipment: exercise.equipment
      }))
    : [];

  return (
    <div className="edit-workout-form">
      <h2>Edit Workout Program</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Program Name</label>
          <input
            type="text"
            name="name"
            value={editedProgram.name}
            onChange={(e) => handleInputChange(e)}
            className="form-input"
          />
        </div>

        {editedProgram.workout_days.map((day, dayIndex) => (
          <div key={dayIndex} className="workout-day">
            <div className="form-group">
              <label>Day Name</label>
              <input
                type="text"
                name="day_name"
                value={day.day_name}
                onChange={(e) => handleInputChange(e, dayIndex)}
                className="form-input"
              />
            </div>

            <div className="exercises-section">
              <h3>Exercises</h3>
              {day.exercises.map((exercise, exerciseIndex) => (
                <div key={exerciseIndex} className="exercise-item">
                  <div className="exercise-header">
                    <h4 className="exercise-name">{exercise.name || 'Unnamed Exercise'}</h4>
                    <button
                      type="button"
                      onClick={() => deleteExercise(dayIndex, exerciseIndex)}
                      className="delete-button"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="exercise-inputs">
                    <div className="input-group">
                      <label>Number of Sets</label>
                      <input
                        type="number"
                        name="sets"
                        value={exercise.sets}
                        onChange={(e) => handleInputChange(e, dayIndex, exerciseIndex)}
                        className="form-input"
                      />
                    </div>
                    <div className="input-group">
                      <label>Target Reps</label>
                      <input
                        type="number"
                        name="recommended_reps"
                        value={exercise.recommended_reps}
                        onChange={(e) => handleInputChange(e, dayIndex, exerciseIndex)}
                        className="form-input"
                      />
                    </div>
                    <div className="input-group">
                      <label>Target Weight (lbs)</label>
                      <input
                        type="number"
                        name="recommended_weight"
                        value={exercise.recommended_weight}
                        onChange={(e) => handleInputChange(e, dayIndex, exerciseIndex)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="add-exercise-section">
                <div className="exercise-select-container">
                  <label>Add Exercise</label>
                  <Select
                    options={exerciseOptions}
                    onChange={(option) => handleExerciseSelect(option, dayIndex)}
                    className="exercise-select"
                    placeholder="Add an exercise..."
                    isSearchable
                    isClearable
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        backgroundColor: '#333',
                        borderColor: '#555',
                        color: '#f8f8f2',
                        minHeight: '38px'
                      }),
                      menu: (provided) => ({
                        ...provided,
                        backgroundColor: '#282a36',
                        border: '1px solid #44475a'
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isSelected ? '#44475a' : state.isFocused ? '#383a59' : '#282a36',
                        color: '#f8f8f2',
                        cursor: 'pointer',
                        ':active': {
                          backgroundColor: '#44475a'
                        }
                      }),
                      singleValue: (provided) => ({
                        ...provided,
                        color: '#f8f8f2'
                      }),
                      input: (provided) => ({
                        ...provided,
                        color: '#f8f8f2'
                      }),
                      placeholder: (provided) => ({
                        ...provided,
                        color: '#6272a4'
                      }),
                      dropdownIndicator: (provided) => ({
                        ...provided,
                        color: '#6272a4',
                        ':hover': {
                          color: '#f8f8f2'
                        }
                      })
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateExercise(true)}
                  className="create-exercise-button"
                >
                  Create New Exercise
                </button>
              </div>
            </div>

            {editedProgram.workout_days.length > 1 && (
              <button
                type="button"
                onClick={() => deleteDay(dayIndex)}
                className="delete-button"
              >
                Delete Day
              </button>
            )}
          </div>
        ))}

        <div className="form-actions">
          <button type="button" onClick={addDay} className="add-button">
            Add Day
          </button>
          <button type="submit" className="save-button">
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => onArchive(program.program_id)}
            className={program.status === 'archived' ? 'unarchive-button' : 'archive-button'}
          >
            {program.status === 'archived' ? 'Unarchive Program' : 'Archive Program'}
          </button>
          <button type="button" onClick={onClose} className="cancel-button">
            Cancel
          </button>
        </div>
      </form>

      {showCreateExercise && (
        <div className="modal">
          <div className="modal-content">
            <CreateExerciseForm
              onSave={handleCreateExercise}
              onCancel={() => setShowCreateExercise(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EditWorkoutProgramForm;