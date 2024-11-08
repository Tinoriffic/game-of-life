import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../../axios';
import './LogWorkoutEntry.css';
import { useUser } from '../../../player/UserContext';

const LogWorkoutEntry = ({ program, onClose }) => {
  const [workoutDays, setWorkoutDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loggedExercises, setLoggedExercises] = useState([]);
  const { user } = useUser();

  useEffect(() => {
    if (program) {
      fetchWorkoutProgramDetails();
    }
  }, [program]);

  const fetchWorkoutProgramDetails = async () => {
    try {
      const response = await axiosInstance.get(`/workout-programs/${program.program_id}/program-details`);
      const groupedData = response.data.reduce((acc, item) => {
        if (!acc[item.day_name]) {
          acc[item.day_name] = {
            day_id: item.day_id,
            day_name: item.day_name,
            exercises: [],
          };
        }
        acc[item.day_name].exercises.push({
          program_exercise_id: item.program_exercise_id,
          exercise_name: item.exercise_name,
          sets: item.sets,
        });
        return acc;
      }, {});

      setWorkoutDays(Object.values(groupedData));
      setSelectedDay(Object.values(groupedData)[0]?.day_name || null);
    } catch (error) {
      console.error('Failed to fetch workout program details', error);
    }
  };

  const handleDayChange = (e) => {
    setSelectedDay(e.target.value);
  };

  const handleExerciseChange = (programExerciseId, setIndex, field, value) => {
    setLoggedExercises((prevExercises) => {
      const updatedExercises = [...prevExercises];
      const exerciseIndex = updatedExercises.findIndex(
        (exercise) => exercise.program_exercise_id === programExerciseId
      );
  
      if (exerciseIndex !== -1) {
        // Make sure sets array exists and has enough elements
        if (!updatedExercises[exerciseIndex].sets) {
          updatedExercises[exerciseIndex].sets = [];
        }
        while (updatedExercises[exerciseIndex].sets.length <= setIndex) {
          updatedExercises[exerciseIndex].sets.push({
            set_number: updatedExercises[exerciseIndex].sets.length + 1,
            weight: null,
            reps: null
          });
        }
        updatedExercises[exerciseIndex].sets[setIndex] = {
          ...updatedExercises[exerciseIndex].sets[setIndex],
          set_number: setIndex + 1,
          [field === 'performed_weight' ? 'weight' : 'reps']: value || null
        };
      } else {
        const newExercise = {
          program_exercise_id: programExerciseId,
          sets: Array(setIndex + 1).fill().map((_, i) => ({
            set_number: i + 1,
            weight: i === setIndex && field === 'performed_weight' ? value : null,
            reps: i === setIndex && field === 'performed_reps' ? value : null
          }))
        };
        updatedExercises.push(newExercise);
      }
  
      return updatedExercises;
    });
  };

  const handleSubmit = async () => {
    try {
      // Validate that we have data
      if (!loggedExercises.length) {
        alert('Please log at least one exercise');
        return;
      }

      // Filter out exercises with incomplete sets
      const formattedExercises = loggedExercises
        .map(exercise => ({
          program_exercise_id: exercise.program_exercise_id,
          sets: exercise.sets
            .filter(set => set.reps != null || set.weight != null) // Only include sets with data
            .map(set => ({
              set_number: set.set_number,
              weight: set.weight || 0,
              reps: set.reps || 0
            }))
        }))
        .filter(exercise => exercise.sets.length > 0); // Only include exercises with sets

      if (!formattedExercises.length) {
        alert('Please complete at least one exercise set');
        return;
      }

      const payload = {
        program_id: program.program_id,
        session_date: new Date().toISOString(),
        exercises: formattedExercises
      };

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      await axiosInstance.post(`/users/${user.id}/workout-sessions`, payload);
      onClose();
    } catch (error) {
      console.error('Failed to log workout entry', error.response);
      const errorMessage = error.response?.data?.detail || 'Failed to log workout';
      alert(errorMessage);
    }
  };

  return (
    <div className="log-workout-entry">
      <h2>Log Workout Entry</h2>
      {workoutDays.length > 0 ? (
        <>
          <div>
            <label htmlFor="day-select">Select Workout Day:</label>
            <select id="day-select" value={selectedDay} onChange={handleDayChange}>
              {workoutDays.map((day) => (
                <option key={day.day_id} value={day.day_name}>
                  {day.day_name}
                </option>
              ))}
            </select>
          </div>
          {selectedDay && (
            <div>
              {workoutDays
                .find((day) => day.day_name === selectedDay)
                ?.exercises?.map((exercise) => (
                  <div key={exercise.program_exercise_id} className="exercise-entry">
                    <h3>{exercise.exercise_name}</h3>
                    {Array.from({ length: exercise.sets }, (_, setIndex) => (
                      <div key={setIndex} className="set-entry">
                        <label>
                          Set {setIndex + 1} Weight:
                          <input
                            type="number"
                            value={loggedExercises.find((e) => e.program_exercise_id === exercise.program_exercise_id)?.sets?.[setIndex]?.weight || ''}
                            onChange={(e) => handleExerciseChange(exercise.program_exercise_id, setIndex, 'performed_weight', parseInt(e.target.value) || null)}
                          />
                        </label>
                        <label>
                          Set {setIndex + 1} Reps:
                          <input
                            type="number"
                            value={loggedExercises.find((e) => e.program_exercise_id === exercise.program_exercise_id)?.sets?.[setIndex]?.reps || ''}
                            onChange={(e) => handleExerciseChange(exercise.program_exercise_id, setIndex, 'performed_reps', parseInt(e.target.value) || null)}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
          <button onClick={handleSubmit}>Log Workout</button>
          <button onClick={onClose}>Cancel</button>
        </>
      ) : (
        <p>No workout days found for this program.</p>
      )}
    </div>
  );
};

export default LogWorkoutEntry;