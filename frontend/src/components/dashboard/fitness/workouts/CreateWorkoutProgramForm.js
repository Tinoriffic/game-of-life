import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../../axios';
import { useUser } from '../../../player/UserContext';
import Select from 'react-select';
import CreateExerciseForm from './CreateExerciseForm';
import './CreateWorkoutProgramForm.css';

const initialProgramState = {
  name: '',
  workout_days: [
    {
      day_name: '',
      exercises: [],
    },
  ],
};

const CreateWorkoutProgramForm = ({ onSave, onClose }) => {
  const [program, setProgram] = useState(initialProgramState);
  const [exercisesLibrary, setExercisesLibrary] = useState([]);
  const { user } = useUser();
  const [showCreateExerciseForm, setShowCreateExerciseForm] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (user && user.id) {
      // Fetches exercises from the global library
      const fetchExercises = async () => {
        try {
          const response = await axiosInstance.get(`/exercises?user_id=${user.id}`);
          setExercisesLibrary(response.data);
        } catch (error) {
          console.error('Failed to fetch exercises', error);
        }
      };
      fetchExercises();
    }
  }, [user.id]);

  const handleInputChange = (e, dayIndex, exerciseIndex = null) => {
    const { name, value } = e.target;
    if (exerciseIndex !== null) {
      const updatedProgram = { ...program };
      updatedProgram.workout_days[dayIndex].exercises[exerciseIndex][name] = value;
      setProgram(updatedProgram);
    } else if (name === 'day_name') {
      const updatedDays = [...program.workout_days];
      updatedDays[dayIndex][name] = value;
      setProgram({ ...program, workout_days: updatedDays });
    } else {
      setProgram({ ...program, [name]: value });
    }
  };

  const addDay = () => {
    setProgram({
      ...program,
      workout_days: [
        ...program.workout_days,
        { day_name: '', exercises: [] },
      ],
    });
  };

  const addExercise = (dayIndex) => {
    const updatedProgram = { ...program };
    updatedProgram.workout_days[dayIndex].exercises.push({
      exercise_id: null,
      name: '',
      sets: 3,
      recommended_reps: 0,
      recommended_weight: 0,
      selectedOption: null,
    });
    setProgram(updatedProgram);
  };

  const deleteExercise = (dayIndex, exerciseIndex) => {
    const updatedProgram = { ...program };
    updatedProgram.workout_days[dayIndex].exercises.splice(exerciseIndex, 1);
    setProgram(updatedProgram);
  };

  const deleteDay = (dayIndex) => {
    const updatedProgram = { ...program };
    updatedProgram.workout_days.splice(dayIndex, 1);
    setProgram(updatedProgram);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(program);
    setProgram(initialProgramState);
  };

  // Prepare options for react-select
  const exerciseOptions = exercisesLibrary.map((exercise) => ({
    value: exercise.exercise_id,
    label: exercise.name,
    exercise: exercise, // Include the whole exercise object for later use
  }));

  const handleSelectExercise = (selectedOption, dayIndex, exerciseIndex) => {
    const updatedProgram = { ...program };
    const exercise = updatedProgram.workout_days[dayIndex].exercises[exerciseIndex];
    if (selectedOption) {
      exercise.exercise_id = selectedOption.value;
      exercise.name = selectedOption.label;
      exercise.selectedOption = selectedOption;
    } else {
      // Handle clearing the selection
      exercise.exercise_id = null;
      exercise.name = '';
      exercise.selectedOption = null;
    }
    setProgram(updatedProgram);
  };

  const handleCreateExercise = async (exerciseData) => {
    try {
      const response = await axiosInstance.post(`/exercises?user_id=${user.id}`, exerciseData);
      // Add the new exercise to the library
      setExercisesLibrary([...exercisesLibrary, response.data]);
      //setShowCreateExerciseForm(false);
    } catch (error) {
      console.error('Failed to create new exercise', error);
      //throw error;
    }
  };

  // Custom styles for react-select
  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: '#333',
      borderColor: '#555',
      color: '#f8f8f2',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#1d1f20',
      color: '#f8f8f2',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? '#4caf50'
        : state.isFocused
        ? '#333'
        : '#1d1f20',
      color: '#f8f8f2',
      cursor: 'pointer',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#f8f8f2',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#888',
    }),
    input: (provided) => ({
      ...provided,
      color: '#f8f8f2',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: '#555',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: '#f8f8f2',
      '&:hover': {
        color: '#f8f8f2',
      },
    }),
    menuList: (provided) => ({
      ...provided,
      backgroundColor: '#1d1f20',
    }),
  };

  return (
    <form onSubmit={handleSubmit} className="create-workout-program-form">
      <label>
        Program Name
        <input
          type="text"
          name="name"
          value={program.name}
          onChange={handleInputChange}
        />
      </label>
      {program.workout_days.map((day, dayIndex) => (
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
                    Select Exercise
                    <Select
                      options={exerciseOptions}
                      onChange={(selectedOption) =>
                        handleSelectExercise(selectedOption, dayIndex, exerciseIndex)
                      }
                      value={exercise.selectedOption}
                      isSearchable
                      isClearable
                      placeholder="Search or select an exercise..."
                      styles={customStyles} // Apply custom styles here
                    />
                  </label>
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
          <button type="button" onClick={() => addExercise(dayIndex)} className="add-button">
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
      <button type="button" onClick={addDay} className="add-button">
        Add Day
      </button>

      {showCreateExerciseForm && (
      <div className="modal-backdrop">
        <div className="modal-content">
          <CreateExerciseForm 
            onSave={(exerciseData) => {
              handleCreateExercise(exerciseData);
              setShowCreateExerciseForm(false);
            }}
            onCancel={() => setShowCreateExerciseForm(false)}
            userId={user.id}
          />
        </div>
      </div>
    )}

      <div className="form-actions">
        <button type="submit" className="save-button">
          Save Program
        </button>
        <button
          type="button"
          onClick={onClose}
          className="cancel-button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default CreateWorkoutProgramForm;
